const prisma = require("../utils/prisma");
const {
  PERMISSION_CATALOG,
  WORKSPACE_PERMISSION_KEYS,
  WORKSPACE_ROLES,
  FALLBACK_WORKSPACE_ROLE,
  PERMISSIONS,
} = require("../utils/permissions");

const WorkspaceRole = {
  nameRegex: /^[a-z][a-z0-9_-]*$/,

  // { byId: Map<roleId, Set<permissionKey>>, defaultId: number|null }
  _cache: null,

  flushCache: function () {
    this._cache = null;
  },

  validations: {
    name: function (name = "") {
      const trimmed = String(name).trim().toLowerCase();
      if (trimmed.length < 2 || trimmed.length > 32)
        throw new Error("Role name must be between 2 and 32 characters.");
      if (!WorkspaceRole.nameRegex.test(trimmed))
        throw new Error(
          "Role name must start with a letter and contain only lowercase letters, numbers, - or _."
        );
      return trimmed;
    },
    displayName: function (displayName = "") {
      const trimmed = String(displayName).trim();
      if (!trimmed) throw new Error("Display name is required.");
      return trimmed.slice(0, 64);
    },
    description: function (description = "") {
      return String(description || "").slice(0, 500);
    },
    permissions: function (permissions = []) {
      if (!Array.isArray(permissions)) return [];
      return [...new Set(permissions.filter((p) => WORKSPACE_PERMISSION_KEYS.includes(p)))];
    },
  },

  /**
   * Idempotently upserts the shared workspace roles this app ships with
   * (admin/member - see the RBAC migration, which already seeded these two
   * rows directly so it could backfill existing memberships onto them). Also
   * ensures no membership is ever left with a dangling null role.
   */
  seed: async function () {
    try {
      for (const perm of PERMISSION_CATALOG.filter((p) => p.scope === "workspace")) {
        await prisma.permissions.upsert({
          where: { key: perm.key },
          update: { label: perm.label, category: perm.category, scope: perm.scope, sortOrder: perm.order },
          create: {
            key: perm.key,
            label: perm.label,
            category: perm.category,
            scope: perm.scope,
            sortOrder: perm.order,
          },
        });
      }

      for (const roleSeed of WORKSPACE_ROLES) {
        let role = await prisma.workspace_roles.findFirst({
          where: { name: roleSeed.name, workspace_id: null },
        });
        if (!role) {
          role = await prisma.workspace_roles.create({
            data: {
              name: roleSeed.name,
              displayName: roleSeed.displayName,
              isSystem: true,
              isDefault: roleSeed.isDefault,
              workspace_id: null,
            },
          });
        }

        const existing = await prisma.workspace_role_permissions.count({
          where: { workspace_role_id: role.id },
        });
        if (existing === 0) await this._setPermissions(role.id, roleSeed.permissions);
      }

      this.flushCache();
      await this.backfillMemberships();
    } catch (error) {
      console.error("WorkspaceRole.seed failed", error.message);
    }
  },

  /**
   * Any membership left with workspace_role_id: null (e.g. a fresh add-member
   * call that didn't specify one) resolves to the default role at read time
   * anyway (see permissionsForUserInWorkspace), so this isn't strictly
   * required for correctness - it just keeps the stored data unambiguous for
   * anything that reads workspace_role_id directly (e.g. the members list).
   */
  backfillMemberships: async function () {
    try {
      const fallback = await this.defaultRole();
      if (!fallback) return 0;
      const result = await prisma.workspace_users.updateMany({
        where: { workspace_role_id: null },
        data: { workspace_role_id: fallback.id },
      });
      return result.count;
    } catch (error) {
      console.error("WorkspaceRole.backfillMemberships failed", error.message);
      return 0;
    }
  },

  _setPermissions: async function (roleId, permissionKeys = []) {
    const validKeys = this.validations.permissions(permissionKeys);
    const permissionRows = await prisma.permissions.findMany({
      where: { key: { in: validKeys } },
    });

    await prisma.$transaction([
      prisma.workspace_role_permissions.deleteMany({ where: { workspace_role_id: Number(roleId) } }),
      ...permissionRows.map((perm) =>
        prisma.workspace_role_permissions.create({
          data: { workspace_role_id: Number(roleId), permission_id: perm.id },
        })
      ),
    ]);
    this.flushCache();
  },

  _loadCache: async function () {
    if (this._cache) return this._cache;
    const roles = await prisma.workspace_roles.findMany({
      include: { permissions: { include: { permission: true } } },
    });

    const byId = new Map();
    let defaultId = null;
    for (const role of roles) {
      byId.set(role.id, new Set(role.permissions.map((rp) => rp.permission.key)));
      if (role.isDefault && role.workspace_id === null) defaultId = role.id;
    }
    this._cache = { byId, defaultId };
    return this._cache;
  },

  /**
   * @param {{id:number, role:string}|null} user
   * @param {number} workspaceId
   * @returns {Promise<string[]>}
   */
  permissionsForUserInWorkspace: async function (user, workspaceId) {
    if (!user?.id || !workspaceId) return [];

    // Instance operators act with full workspace power everywhere, without
    // needing a workspace_users row at all - lazy-required to avoid a
    // require() cycle with role.js.
    const { Role } = require("./role");
    if (await Role.userCanAny(user, [PERMISSIONS.SUPER_ADMIN, PERMISSIONS.WORKSPACES_MANAGE_ALL])) {
      return WORKSPACE_PERMISSION_KEYS;
    }

    const membership = await prisma.workspace_users.findFirst({
      where: { user_id: Number(user.id), workspace_id: Number(workspaceId) },
    });
    if (!membership) return [];

    const cache = await this._loadCache();
    const roleId = membership.workspace_role_id ?? cache.defaultId;
    if (!roleId) return [];
    return [...(cache.byId.get(roleId) || [])];
  },

  userCanInWorkspace: async function (user, workspaceId, permission) {
    const held = await this.permissionsForUserInWorkspace(user, workspaceId);
    return held.includes(permission);
  },

  userCanAnyInWorkspace: async function (user, workspaceId, permissions = []) {
    const held = await this.permissionsForUserInWorkspace(user, workspaceId);
    return permissions.some((p) => held.includes(p));
  },

  /** For routes with no single workspace in the URL - true if the user holds `permission` in ANY workspace they belong to. */
  userCanInAnyWorkspace: async function (user, permission) {
    if (!user?.id) return false;
    const { Role } = require("./role");
    if (await Role.userCanAny(user, [PERMISSIONS.SUPER_ADMIN, PERMISSIONS.WORKSPACES_MANAGE_ALL])) return true;

    const memberships = await prisma.workspace_users.findMany({ where: { user_id: Number(user.id) } });
    const cache = await this._loadCache();
    for (const m of memberships) {
      const roleId = m.workspace_role_id ?? cache.defaultId;
      if (roleId && cache.byId.get(roleId)?.has(permission)) return true;
    }
    return false;
  },

  defaultRole: async function () {
    return (
      (await this.get({ isDefault: true, workspace_id: null })) ||
      (await this.get({ name: FALLBACK_WORKSPACE_ROLE, workspace_id: null }))
    );
  },

  /** Every role assignable in a workspace: the shared ones plus that workspace's own private ones. */
  availableFor: async function (workspaceId) {
    return this.where({ OR: [{ workspace_id: null }, { workspace_id: Number(workspaceId) }] });
  },

  assignableIn: async function (roleId, workspaceId) {
    const role = await prisma.workspace_roles.findUnique({ where: { id: Number(roleId) } });
    if (!role) return false;
    return role.workspace_id === null || role.workspace_id === Number(workspaceId);
  },

  _flatten: function (role) {
    return {
      ...role,
      permissions: (role.permissions || []).map((rp) => rp.permission?.key).filter(Boolean),
    };
  },

  where: async function (clause = {}) {
    try {
      const roles = await prisma.workspace_roles.findMany({
        where: clause,
        include: {
          permissions: { include: { permission: true } },
          workspace: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ isSystem: "desc" }, { id: "asc" }],
      });
      return roles.map((r) => this._flatten(r));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  get: async function (clause = {}) {
    try {
      const role = await prisma.workspace_roles.findFirst({
        where: clause,
        include: { permissions: { include: { permission: true } } },
      });
      return role ? this._flatten(role) : null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  create: async function ({ name, displayName, description = "", permissions = [], workspaceId = null }) {
    try {
      const validatedName = this.validations.name(name);
      const validatedDisplayName = this.validations.displayName(displayName);
      const validatedDescription = this.validations.description(description);

      const role = await prisma.workspace_roles.create({
        data: {
          name: validatedName,
          displayName: validatedDisplayName,
          description: validatedDescription,
          isSystem: false,
          isDefault: false,
          workspace_id: workspaceId ? Number(workspaceId) : null,
        },
      });
      await this._setPermissions(role.id, permissions);
      return { role: await this.get({ id: role.id }), error: null };
    } catch (error) {
      if (error.code === "P2002") return { role: null, error: "A role with that name already exists in this scope." };
      return { role: null, error: error.message };
    }
  },

  /**
   * @param {number|null} scopedToWorkspaceId - null = instance-level caller
   *   (unrestricted). Otherwise the role must belong to exactly that
   *   workspace - shared roles can never be edited/deleted from inside a
   *   workspace, and one workspace can never touch another's private role.
   */
  _guardScoped: function (role, scopedToWorkspaceId) {
    if (scopedToWorkspaceId === null || scopedToWorkspaceId === undefined) return null;
    if (role.workspace_id !== Number(scopedToWorkspaceId))
      return "That role does not belong to this workspace.";
    return null;
  },

  update: async function (roleId, { displayName, description, permissions, isDefault } = {}, scopedToWorkspaceId = null) {
    try {
      const role = await prisma.workspace_roles.findUnique({ where: { id: Number(roleId) } });
      if (!role) return { role: null, error: "Role not found." };

      const guardError = this._guardScoped(role, scopedToWorkspaceId);
      if (guardError) return { role: null, error: guardError };

      if (isDefault === true) {
        await prisma.workspace_roles.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const data = {};
      if (displayName !== undefined) data.displayName = this.validations.displayName(displayName);
      if (description !== undefined) data.description = this.validations.description(description);
      if (isDefault !== undefined) data.isDefault = !!isDefault;
      if (Object.keys(data).length > 0) {
        data.lastUpdatedAt = new Date();
        await prisma.workspace_roles.update({ where: { id: Number(roleId) }, data });
      }

      if (permissions !== undefined) await this._setPermissions(roleId, permissions);
      this.flushCache();

      return { role: await this.get({ id: Number(roleId) }), error: null };
    } catch (error) {
      return { role: null, error: error.message };
    }
  },

  delete: async function (roleId, scopedToWorkspaceId = null) {
    try {
      const role = await prisma.workspace_roles.findUnique({ where: { id: Number(roleId) } });
      if (!role) return { success: false, error: "Role not found.", reassigned: 0 };

      const guardError = this._guardScoped(role, scopedToWorkspaceId);
      if (guardError) return { success: false, error: guardError, reassigned: 0 };
      if (role.isSystem)
        return { success: false, error: "Built-in roles cannot be deleted.", reassigned: 0 };
      if (role.isDefault)
        return { success: false, error: "Make another role the default before deleting this one.", reassigned: 0 };

      const fallback = await this.defaultRole();
      const reassignResult = await prisma.workspace_users.updateMany({
        where: { workspace_role_id: Number(roleId) },
        data: { workspace_role_id: fallback?.id ?? null },
      });

      await prisma.workspace_roles.delete({ where: { id: Number(roleId) } });
      this.flushCache();
      return { success: true, error: null, reassigned: reassignResult.count };
    } catch (error) {
      return { success: false, error: error.message, reassigned: 0 };
    }
  },

  memberCounts: async function () {
    try {
      const grouped = await prisma.workspace_users.groupBy({
        by: ["workspace_role_id"],
        _count: true,
      });
      return grouped.reduce((acc, g) => {
        if (g.workspace_role_id === null) return acc;
        return { ...acc, [g.workspace_role_id]: g._count };
      }, {});
    } catch (error) {
      console.error(error.message);
      return {};
    }
  },
};

module.exports = { WorkspaceRole };
