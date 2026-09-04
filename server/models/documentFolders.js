const prisma = require("../utils/prisma");
const { Role } = require("./role");
const { PERMISSIONS } = require("../utils/permissions");

/** Folder visibility levels, in widening order. */
const VISIBILITY = {
  /** Only the folder's owner (and holders of documents.view_all) may see it. */
  PRIVATE: "private",
  /** Members of the folder's workspace may see it. */
  WORKSPACE: "workspace",
  /** Everyone with library access may see it. */
  SHARED: "shared",
};

const VALID_VISIBILITIES = Object.values(VISIBILITY);

/**
 * The folder the collector writes every processed upload into before the server
 * moves it somewhere permanent. It is a staging area, not a destination - see
 * `Collector.processDocument`, which cannot be told where to write.
 */
const STAGING_FOLDER = "custom-documents";

/**
 * Ownership and visibility for folders in the document library.
 *
 * The folders themselves live on disk; these rows only decide who may see one.
 * A folder with no row is `shared`, which is what every folder created before
 * this table existed is - so the absence of a row is never a denial.
 */
const DocumentFolder = {
  VISIBILITY,
  VALID_VISIBILITIES,
  STAGING_FOLDER,

  /**
   * The folder name that holds a user's own uploads. Derived from the id rather
   * than the username so renaming an account cannot orphan their documents.
   * @param {number} userId
   * @returns {string}
   */
  privateFolderName: function (userId) {
    return `user-${parseInt(userId)}`;
  },

  /**
   * @param {object} clause
   * @returns {Promise<import("@prisma/client").document_folders|null>}
   */
  get: async function (clause = {}) {
    try {
      return await prisma.document_folders.findFirst({ where: clause });
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  /**
   * @param {object} clause
   * @returns {Promise<import("@prisma/client").document_folders[]>}
   */
  where: async function (clause = {}) {
    try {
      return await prisma.document_folders.findMany({ where: clause });
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * Record a folder's ownership. Idempotent: a folder that already has a row
   * keeps it, so re-creating a folder name cannot silently reassign it.
   * @param {object} params
   * @param {string} params.name - on-disk folder name
   * @param {number|null} params.ownerId
   * @param {number|null} params.workspaceId - the workspace it was created from
   * @param {string} params.visibility
   * @returns {Promise<{folder: object|null, error: string|null}>}
   */
  create: async function ({
    name,
    ownerId = null,
    workspaceId = null,
    visibility = VISIBILITY.SHARED,
  }) {
    if (!name) return { folder: null, error: "No folder name provided." };
    if (!VALID_VISIBILITIES.includes(visibility))
      return { folder: null, error: `Invalid visibility: ${visibility}` };

    try {
      const existing = await this.get({ name: String(name) });
      if (existing) return { folder: existing, error: null };

      const folder = await prisma.document_folders.create({
        data: {
          name: String(name),
          ownerId: ownerId ? parseInt(ownerId) : null,
          workspaceId: workspaceId ? parseInt(workspaceId) : null,
          visibility,
        },
      });
      return { folder, error: null };
    } catch (error) {
      console.error(error.message);
      return { folder: null, error: error.message };
    }
  },

  /**
   * Follow a folder that was renamed on disk. The row is keyed by name, so
   * skipping this would silently drop the folder back to `shared`.
   * @param {string} from
   * @param {string} to
   * @returns {Promise<boolean>} whether a row was renamed
   */
  rename: async function (from, to) {
    if (!from || !to || from === to) return false;
    try {
      const { count } = await prisma.document_folders.updateMany({
        where: { name: String(from) },
        data: { name: String(to), lastUpdatedAt: new Date() },
      });
      return count > 0;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  /**
   * Drop a folder's row once the folder itself is gone.
   * @param {string} name
   * @returns {Promise<boolean>}
   */
  delete: async function (name) {
    if (!name) return false;
    try {
      await prisma.document_folders.deleteMany({
        where: { name: String(name) },
      });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  /**
   * Resolve (creating if needed) the folder a user's own uploads belong in.
   * @param {{id: number}|null} user
   * @returns {Promise<string|null>} the folder name, or null without a user
   */
  privateFolderFor: async function (user = null) {
    if (!user?.id) return null;
    const name = this.privateFolderName(user.id);
    await this.create({
      name,
      ownerId: user.id,
      visibility: VISIBILITY.PRIVATE,
    });
    return name;
  },

  /**
   * The workspaces whose folders a caller may see.
   *
   * Membership is the usual answer, but an instance operator administers every
   * workspace without joining it - and the whole point of workspace visibility
   * is that they see the folders of the workspace they are actually looking at,
   * not of every workspace at once. So the operator's set is exactly the
   * workspace in context, and nothing when there is no context.
   * @param {{id: number, role: string}|null} user
   * @param {number|null} workspaceId - the workspace being viewed, if any
   * @returns {Promise<Set<number>>}
   */
  _visibleWorkspaceIdsFor: async function (user = null, workspaceId = null) {
    if (!user?.id) return new Set();

    const memberships = await prisma.workspace_users.findMany({
      where: { user_id: parseInt(user.id) },
      select: { workspace_id: true },
    });
    const ids = new Set(memberships.map((m) => m.workspace_id));

    if (
      workspaceId &&
      (await Role.userCanAny(user, [
        PERMISSIONS.SYSTEM_ADMIN,
        PERMISSIONS.WORKSPACES_MANAGE_ALL,
        PERMISSIONS.WORKSPACES_VIEW_ALL,
      ]))
    )
      ids.add(parseInt(workspaceId));

    return ids;
  },

  /**
   * The folder names a user must NOT see.
   *
   * Computed as a denial set rather than an allow set on purpose: the on-disk
   * listing is the source of truth for which folders exist, and a folder with
   * no row is shared. Building an allow list would hide every legacy folder.
   *
   * `workspaceId` scopes the answer to the workspace the picker is open in.
   * Without it only the caller's own memberships count, which is what an
   * instance-wide caller (the dev API) should get.
   *
   * @param {{id: number, role: string}|null} user
   * @param {{workspaceId?: number|null}} [options]
   * @returns {Promise<Set<string>>}
   */
  hiddenFoldersFor: async function (user = null, { workspaceId = null } = {}) {
    // No user at all (an API-key caller with no owner) sees only what is
    // shared, so every owned folder is hidden.
    const rows = await this.where({
      visibility: { in: [VISIBILITY.PRIVATE, VISIBILITY.WORKSPACE] },
    });
    if (rows.length === 0) return new Set();

    if (user?.id && (await Role.userCan(user, PERMISSIONS.DOCUMENTS_VIEW_ALL)))
      return new Set();

    // Only resolved if a workspace-scoped folder actually exists - most
    // instances will not have one.
    const visibleWorkspaceIds = rows.some(
      (row) => row.visibility === VISIBILITY.WORKSPACE
    )
      ? await this._visibleWorkspaceIdsFor(user, workspaceId)
      : new Set();

    const hidden = new Set();
    for (const row of rows) {
      if (row.visibility === VISIBILITY.PRIVATE) {
        if (!user?.id || row.ownerId !== user.id) hidden.add(row.name);
        continue;
      }
      // WORKSPACE: a row with no workspace has nobody to admit, so it stays
      // hidden from everyone but view_all until it is reassigned.
      if (!row.workspaceId || !visibleWorkspaceIds.has(row.workspaceId))
        hidden.add(row.name);
    }
    return hidden;
  },

  /**
   * Change who may see an existing folder, creating its row if the folder
   * predates ownership.
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.visibility
   * @param {number|null} params.workspaceId - required for workspace visibility
   * @param {number|null} params.ownerId
   * @returns {Promise<{folder: object|null, error: string|null}>}
   */
  setVisibility: async function ({
    name,
    visibility,
    workspaceId = null,
    ownerId = null,
  }) {
    if (!name) return { folder: null, error: "No folder name provided." };
    if (!VALID_VISIBILITIES.includes(visibility))
      return { folder: null, error: `Invalid visibility: ${visibility}` };
    if (visibility === VISIBILITY.WORKSPACE && !workspaceId)
      return {
        folder: null,
        error: "Workspace visibility needs a workspace.",
      };

    try {
      const existing = await this.get({ name: String(name) });
      if (!existing)
        return await this.create({ name, ownerId, workspaceId, visibility });

      const folder = await prisma.document_folders.update({
        where: { id: existing.id },
        data: {
          visibility,
          // Cleared for the other two levels so a folder that is no longer
          // workspace-scoped does not keep claiming one.
          workspaceId:
            visibility === VISIBILITY.WORKSPACE ? parseInt(workspaceId) : null,
          ownerId: existing.ownerId ?? (ownerId ? parseInt(ownerId) : null),
          lastUpdatedAt: new Date(),
        },
      });
      return { folder, error: null };
    } catch (error) {
      console.error(error.message);
      return { folder: null, error: error.message };
    }
  },

  /**
   * Attach each folder's visibility (and whether the caller owns it) to a
   * listing, so the picker can label rows without a second round trip.
   * Folders with no row are `shared` - see the model docblock.
   * @param {Array<{name: string}>} folders
   * @param {{id: number}|null} user
   * @returns {Promise<Array<object>>} the same folders, decorated
   */
  decorate: async function (folders = [], user = null) {
    if (folders.length === 0) return folders;
    const rows = await this.where({ name: { in: folders.map((f) => f.name) } });
    const byName = new Map(rows.map((row) => [row.name, row]));
    return folders.map((folder) => {
      const row = byName.get(folder.name);
      return {
        ...folder,
        visibility: row?.visibility ?? VISIBILITY.SHARED,
        isOwner: !!row?.ownerId && row.ownerId === user?.id,
      };
    });
  },

  /**
   * Whether a user may see one folder. Convenience over `hiddenFoldersFor` for
   * single-folder checks (opening, uploading into, deleting).
   * @param {string} name
   * @param {{id: number, role: string}|null} user
   * @returns {Promise<boolean>}
   */
  canView: async function (name, user = null, options = {}) {
    if (!name) return false;
    const hidden = await this.hiddenFoldersFor(user, options);
    return !hidden.has(name);
  },
};

module.exports = { DocumentFolder };
