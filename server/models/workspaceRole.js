const prisma = require("../utils/prisma");
const {
  PERMISSIONS,
  WORKSPACE_PERMISSION_KEYS,
  WORKSPACE_ROLES,
  FALLBACK_WORKSPACE_ROLE,
  expandPermissions,
} = require("../utils/permissions");

/**
 * @typedef {Object} WorkspaceRoleRecord
 * @property {number} id
 * @property {string} name
 * @property {string} displayName
 * @property {string|null} description
 * @property {boolean} isSystem
 * @property {boolean} isDefault
 * @property {string[]} permissions
 */

/**
 * Workspace roles are reusable definitions (Member, Contributor, ...) that are assigned
 * per membership, so one account can hold different powers in different workspaces.
 *
 * Resolving what a user may do in a workspace considers three things, in order:
 *   1. a system role holding `system.admin` or `workspaces.manage_all` gets everything,
 *      in every workspace, without needing to be a member;
 *   2. otherwise the workspace role on their `workspace_users` row for that workspace;
 *   3. a non-member gets nothing.
 */
const WorkspaceRole = {
  nameRegex: new RegExp(/^[a-z][a-z0-9_-]*$/),

  /**
   * Permission sets keyed by workspace role id, plus the resolved default role.
   * Cleared on any write so a permission tick applies to the next request.
   * @type {{byId: Map<number, Set<string>>, defaultId: number|null}|null}
   */
  _cache: null,

  flushCache: function () {
    this._cache = null;
  },

  validations: {
    name: (newValue = "") => {
      const name = String(newValue).trim().toLowerCase();
      if (name.length < 2)
        throw new Error("Role name must be at least 2 characters");
      if (name.length > 32)
        throw new Error("Role name cannot be longer than 32 characters");
      if (!WorkspaceRole.nameRegex.test(name))
        throw new Error(
          "Role name must start with a lowercase letter and only contain lowercase letters, numbers, underscores and hyphens"
        );
      return name;
    },
    displayName: (newValue = "") => {
      const displayName = String(newValue).trim();
      if (displayName.length < 1) throw new Error("Role must have a label");
      if (displayName.length > 64)
        throw new Error("Role label cannot be longer than 64 characters");
      return displayName;
    },
    description: (newValue = "") => {
      if (!newValue || typeof newValue !== "string") return "";
      return String(newValue).trim().slice(0, 500);
    },
    /**
     * Drops anything that is not a workspace-scope key. System permissions are
     * rejected here so the two scopes can never overlap.
     */
    permissions: (permissions = []) => {
      if (!Array.isArray(permissions)) return [];
      return [
        ...new Set(
          permissions
            .map((permission) => String(permission))
            .filter((permission) =>
              WORKSPACE_PERMISSION_KEYS.includes(permission)
            )
        ),
      ];
    },
  },

  /**
   * Creates any missing built-in workspace roles and puts existing memberships onto
   * the default role. Safe to run on every boot - it never overwrites what an operator
   * has ticked for a role that already exists.
   * @returns {Promise<void>}
   */
  seed: async function () {
    try {
      for (const workspaceRole of WORKSPACE_ROLES) {
        const existing = await prisma.workspace_roles.findFirst({
          where: { name: workspaceRole.name, workspace_id: null },
        });
        if (existing) {
          if (!existing.isSystem)
            await prisma.workspace_roles.update({
              where: { id: existing.id },
              data: { isSystem: true },
            });
          continue;
        }

        const role = await prisma.workspace_roles.create({
          data: {
            name: workspaceRole.name,
            displayName: workspaceRole.displayName,
            description: workspaceRole.description,
            isSystem: true,
            isDefault: workspaceRole.isDefault,
            workspace_id: null,
          },
        });
        await this._setPermissions(role.id, workspaceRole.permissions);
      }

      this.flushCache();
      await this.backfillMemberships();
    } catch (error) {
      console.error("FAILED TO SEED WORKSPACE ROLES.", error.message);
    }
  },

  /**
   * Puts every membership that has no workspace role onto the default one. Runs after
   * seeding so instances upgrading from before workspace roles keep working.
   * @returns {Promise<number>} how many memberships were updated
   */
  backfillMemberships: async function () {
    try {
      const fallback = await this.defaultRole();
      if (!fallback) return 0;
      const { count } = await prisma.workspace_users.updateMany({
        where: { workspace_role_id: null },
        data: { workspace_role_id: fallback.id },
      });
      if (count > 0)
        console.log(
          `[WorkspaceRole] Assigned the "${fallback.name}" role to ${count} existing workspace membership(s).`
        );
      return count;
    } catch (error) {
      console.error("FAILED TO BACKFILL WORKSPACE MEMBERSHIPS.", error.message);
      return 0;
    }
  },

  /**
   * Replaces the permission set of a workspace role.
   * @param {number} roleId
   * @param {string[]} permissionKeys
   */
  _setPermissions: async function (roleId, permissionKeys = []) {
    const keys = this.validations.permissions(permissionKeys);
    const permissionRecords = await prisma.permissions.findMany({
      where: { key: { in: keys } },
      select: { id: true },
    });

    await prisma.workspace_role_permissions.deleteMany({
      where: { workspace_role_id: roleId },
    });
    // The pinned version of prisma does not support createMany() with SQLite,
    // so the grants are written as individual creates inside one transaction.
    if (permissionRecords.length > 0)
      await prisma.$transaction(
        permissionRecords.map((permission) =>
          prisma.workspace_role_permissions.create({
            data: { workspace_role_id: roleId, permission_id: permission.id },
          })
        )
      );
    this.flushCache();
  },

  /**
   * Loads every workspace role and its permissions into the in-memory cache.
   * @returns {Promise<{byId: Map<number, Set<string>>, defaultId: number|null}>}
   */
  _loadCache: async function () {
    if (this._cache) return this._cache;
    const cache = { byId: new Map(), defaultId: null };
    try {
      const roles = await prisma.workspace_roles.findMany({
        include: { permissions: { include: { permission: true } } },
      });
      for (const role of roles) {
        // Expanded down the permission tree so a role holding only a coarse parent
        // (`workspace.settings.manage`) still satisfies checks written against the
        // finer children a later release split out of it.
        cache.byId.set(
          role.id,
          new Set(
            expandPermissions(
              role.permissions.map((entry) => entry.permission.key)
            )
          )
        );
        if (role.isDefault) cache.defaultId = role.id;
      }
    } catch (error) {
      console.error(
        "FAILED TO LOAD WORKSPACE ROLE PERMISSIONS.",
        error.message
      );
      return cache;
    }
    this._cache = cache;
    return cache;
  },

  /**
   * The permission keys a user holds inside one workspace.
   * @param {{id?: number, role?: string}|null} user
   * @param {number|null} workspaceId
   * @returns {Promise<string[]>}
   */
  permissionsForUserInWorkspace: async function (user = null, workspaceId) {
    // Callers with no user in context pass null; instance operators are handled
    // by the system-scope overrides below.
    if (!user?.id || !workspaceId) return [];

    const { Role } = require("./role");
    if (
      await Role.userCanAny(user, [
        PERMISSIONS.SYSTEM_ADMIN,
        PERMISSIONS.WORKSPACES_MANAGE_ALL,
      ])
    )
      return [...WORKSPACE_PERMISSION_KEYS];

    try {
      const membership = await prisma.workspace_users.findFirst({
        where: { user_id: Number(user.id), workspace_id: Number(workspaceId) },
        select: { workspace_role_id: true },
      });
      if (!membership) return [];

      const cache = await this._loadCache();
      // A membership with no role predates workspace roles (or its role was deleted);
      // treat it as the default role rather than locking the member out.
      const roleId = membership.workspace_role_id ?? cache.defaultId;
      return [...(cache.byId.get(roleId) ?? [])];
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * Whether a user holds a permission inside one workspace.
   * @param {{id?: number, role?: string}|null} user
   * @param {number|null} workspaceId
   * @param {string} permission
   * @returns {Promise<boolean>}
   */
  userCanInWorkspace: async function (user, workspaceId, permission) {
    const granted = await this.permissionsForUserInWorkspace(user, workspaceId);
    return granted.includes(permission);
  },

  /**
   * Whether a user holds at least one of the permissions inside one workspace.
   * @param {{id?: number, role?: string}|null} user
   * @param {number|null} workspaceId
   * @param {string[]} permissions
   * @returns {Promise<boolean>}
   */
  userCanAnyInWorkspace: async function (user, workspaceId, permissions = []) {
    if (permissions.length === 0) return false;
    const granted = await this.permissionsForUserInWorkspace(user, workspaceId);
    return permissions.some((permission) => granted.includes(permission));
  },

  /**
   * Whether a user holds a permission in at least one workspace. Used by routes that
   * are workspace-scoped in spirit but do not name a workspace in the URL - the data
   * connector fetchers, for example, which gather content before it is attached
   * anywhere.
   * @param {{id?: number, role?: string}|null} user
   * @param {string} permission
   * @returns {Promise<boolean>}
   */
  userCanInAnyWorkspace: async function (user, permission) {
    if (!user?.id) return false;

    const { Role } = require("./role");
    if (
      await Role.userCanAny(user, [
        PERMISSIONS.SYSTEM_ADMIN,
        PERMISSIONS.WORKSPACES_MANAGE_ALL,
      ])
    )
      return true;

    try {
      const memberships = await prisma.workspace_users.findMany({
        where: { user_id: Number(user.id) },
        select: { workspace_role_id: true },
      });
      if (memberships.length === 0) return false;

      const cache = await this._loadCache();
      return memberships.some((membership) =>
        cache.byId
          .get(membership.workspace_role_id ?? cache.defaultId)
          ?.has(permission)
      );
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  /**
   * The shared role new members are given. Always a shared role - a workspace-private
   * role can never be the instance-wide default.
   * @returns {Promise<WorkspaceRoleRecord|null>}
   */
  defaultRole: async function () {
    return (
      (await this.get({ isDefault: true, workspace_id: null })) ??
      (await this.get({ name: FALLBACK_WORKSPACE_ROLE, workspace_id: null }))
    );
  },

  /**
   * The roles assignable inside one workspace: the shared ones plus any the workspace
   * defined for itself.
   * @param {number} workspaceId
   * @returns {Promise<WorkspaceRoleRecord[]>}
   */
  availableFor: async function (workspaceId) {
    return this.where({
      OR: [{ workspace_id: null }, { workspace_id: Number(workspaceId) }],
    });
  },

  /**
   * Whether a role may be assigned inside a workspace. Stops a membership being pointed
   * at a role that belongs to a different workspace.
   * @param {number} roleId
   * @param {number} workspaceId
   * @returns {Promise<boolean>}
   */
  assignableIn: async function (roleId, workspaceId) {
    const role = await this.get({ id: Number(roleId) });
    if (!role) return false;
    return (
      role.workspace_id === null || role.workspace_id === Number(workspaceId)
    );
  },

  _flatten: function (role) {
    const { permissions, ...rest } = role;
    return {
      ...rest,
      permissions: permissions.map((entry) => entry.permission.key),
    };
  },

  /**
   * @param {Object} clause
   * @returns {Promise<WorkspaceRoleRecord[]>}
   */
  where: async function (clause = {}) {
    try {
      const roles = await prisma.workspace_roles.findMany({
        where: clause,
        orderBy: [{ isSystem: "desc" }, { id: "asc" }],
        include: {
          permissions: { include: { permission: true } },
          workspace: { select: { id: true, name: true, slug: true } },
        },
      });
      return roles.map((role) => this._flatten(role));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * @param {Object} clause
   * @returns {Promise<WorkspaceRoleRecord|null>}
   */
  get: async function (clause = {}) {
    try {
      const role = await prisma.workspace_roles.findFirst({
        where: clause,
        include: {
          permissions: { include: { permission: true } },
          workspace: { select: { id: true, name: true, slug: true } },
        },
      });
      return role ? this._flatten(role) : null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  /**
   * @param {{name: string, displayName: string, description?: string, permissions?: string[], workspaceId?: number|null}} params
   *   `workspaceId` scopes the role to one workspace; omit it for a shared role.
   * @returns {Promise<{role: WorkspaceRoleRecord|null, error: string|null}>}
   */
  create: async function ({
    name,
    displayName,
    description = "",
    permissions = [],
    workspaceId = null,
  }) {
    try {
      const validName = this.validations.name(name);
      const role = await prisma.workspace_roles.create({
        data: {
          name: validName,
          displayName: this.validations.displayName(displayName || validName),
          description: this.validations.description(description),
          isSystem: false,
          isDefault: false,
          workspace_id: workspaceId === null ? null : Number(workspaceId),
        },
      });
      await this._setPermissions(role.id, permissions);
      return { role: await this.get({ id: role.id }), error: null };
    } catch (error) {
      console.error("FAILED TO CREATE WORKSPACE ROLE.", error.message);
      if (String(error.message).includes("Unique constraint"))
        return { role: null, error: "A role with that name already exists" };
      return { role: null, error: error.message };
    }
  },

  /**
   * @param {number} roleId
   * @param {{displayName?: string, description?: string, permissions?: string[], isDefault?: boolean}} updates
   * @param {number|null} scopedToWorkspaceId - when set, refuses to touch anything that
   *   is not a role owned by that workspace, so workspace settings cannot edit the
   *   shared roles or another workspace's roles.
   * @returns {Promise<{role: WorkspaceRoleRecord|null, error: string|null}>}
   */
  update: async function (roleId, updates = {}, scopedToWorkspaceId = null) {
    try {
      const existing = await prisma.workspace_roles.findUnique({
        where: { id: Number(roleId) },
      });
      if (!existing) return { role: null, error: "Role not found" };

      const guard = this._guardScoped(existing, scopedToWorkspaceId);
      if (guard) return { role: null, error: guard };

      const data = {};
      if (updates.hasOwnProperty("displayName"))
        data.displayName = this.validations.displayName(updates.displayName);
      if (updates.hasOwnProperty("description"))
        data.description = this.validations.description(updates.description);
      if (Object.keys(data).length > 0) {
        data.lastUpdatedAt = new Date();
        await prisma.workspace_roles.update({
          where: { id: existing.id },
          data,
        });
      }

      // Exactly one role is the default new members land on.
      if (updates.isDefault === true) {
        await prisma.workspace_roles.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
        await prisma.workspace_roles.update({
          where: { id: existing.id },
          data: { isDefault: true },
        });
      }

      if (updates.hasOwnProperty("permissions"))
        await this._setPermissions(existing.id, updates.permissions);

      this.flushCache();
      return { role: await this.get({ id: existing.id }), error: null };
    } catch (error) {
      console.error("FAILED TO UPDATE WORKSPACE ROLE.", error.message);
      return { role: null, error: error.message };
    }
  },

  /**
   * Deletes a custom workspace role and moves its members onto the default role.
   * @param {number} roleId
   * @returns {Promise<{success: boolean, error: string|null, reassigned: number}>}
   */
  delete: async function (roleId, scopedToWorkspaceId = null) {
    try {
      const role = await prisma.workspace_roles.findUnique({
        where: { id: Number(roleId) },
      });
      if (!role)
        return { success: false, error: "Role not found", reassigned: 0 };

      const guard = this._guardScoped(role, scopedToWorkspaceId);
      if (guard) return { success: false, error: guard, reassigned: 0 };

      if (role.isSystem)
        return {
          success: false,
          error: "Built-in workspace roles cannot be deleted.",
          reassigned: 0,
        };
      if (role.isDefault)
        return {
          success: false,
          error:
            "This is the role new members are given. Make another role the default first.",
          reassigned: 0,
        };

      const fallback = await this.defaultRole();
      const { count } = await prisma.workspace_users.updateMany({
        where: { workspace_role_id: role.id },
        data: { workspace_role_id: fallback?.id ?? null },
      });
      await prisma.workspace_roles.delete({ where: { id: role.id } });
      this.flushCache();
      return { success: true, error: null, reassigned: count };
    } catch (error) {
      console.error("FAILED TO DELETE WORKSPACE ROLE.", error.message);
      return { success: false, error: error.message, reassigned: 0 };
    }
  },

  /**
   * Refuses writes coming from inside a workspace that target anything other than that
   * workspace's own roles.
   * @param {{workspace_id: number|null}} role
   * @param {number|null} scopedToWorkspaceId
   * @returns {string|null} an error message, or null when the write is allowed
   */
  _guardScoped: function (role, scopedToWorkspaceId) {
    if (scopedToWorkspaceId === null) return null; // instance-level caller
    if (role.workspace_id === null)
      return "Shared roles are defined instance-wide and cannot be changed from a workspace.";
    if (role.workspace_id !== Number(scopedToWorkspaceId))
      return "That role belongs to a different workspace.";
    return null;
  },

  /**
   * How many memberships hold each workspace role, keyed by role id.
   * @returns {Promise<Record<number, number>>}
   */
  memberCounts: async function () {
    try {
      const grouped = await prisma.workspace_users.groupBy({
        by: ["workspace_role_id"],
        _count: { workspace_role_id: true },
      });
      return grouped.reduce((counts, entry) => {
        if (entry.workspace_role_id === null) return counts;
        counts[entry.workspace_role_id] = entry._count.workspace_role_id;
        return counts;
      }, {});
    } catch (error) {
      console.error(error.message);
      return {};
    }
  },
};

module.exports = { WorkspaceRole };
