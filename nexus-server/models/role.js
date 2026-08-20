const prisma = require("../utils/prisma");
const {
  PERMISSION_CATALOG,
  SYSTEM_PERMISSION_KEYS,
  SYSTEM_ROLES,
  FALLBACK_ROLE,
  SUPER_ADMIN_ROLE,
  PERMISSIONS,
} = require("../utils/permissions");

const Role = {
  nameRegex: /^[a-z][a-z0-9_-]*$/,

  // In-memory cache: role name -> Set of permission keys it grants. Rebuilt
  // lazily on first read after boot or after any write (flushCache()).
  // Not distributed-safe (a write on one process won't flush another's
  // cache) - acceptable here since this app runs as a single process.
  _cache: null,

  flushCache: function () {
    this._cache = null;
  },

  validations: {
    name: function (name = "") {
      const trimmed = String(name).trim().toLowerCase();
      if (trimmed.length < 2 || trimmed.length > 32)
        throw new Error("Role name must be between 2 and 32 characters.");
      if (!Role.nameRegex.test(trimmed))
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
      return [...new Set(permissions.filter((p) => SYSTEM_PERMISSION_KEYS.includes(p)))];
    },
  },

  /**
   * Idempotently upserts the permission catalog and built-in system roles.
   * Called once at boot (see utils/boot/index.js). Never throws - a seed
   * failure should not prevent the server from starting, though most routes
   * will then find the tables empty and deny everything until it's fixed.
   */
  seed: async function () {
    try {
      for (const perm of PERMISSION_CATALOG.filter((p) => p.scope === "system")) {
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

      for (const roleSeed of SYSTEM_ROLES) {
        let role = await prisma.roles.findUnique({ where: { name: roleSeed.name } });
        if (!role) {
          role = await prisma.roles.create({
            data: {
              name: roleSeed.name,
              displayName: roleSeed.displayName,
              isSystem: true,
            },
          });
        }

        // Re-top-up protected permissions every boot without clobbering
        // permissions an operator added beyond the baseline.
        if (roleSeed.protectedPermissions.length > 0) {
          const existingKeys = await this._permissionKeysFor(role.id);
          const merged = [...new Set([...existingKeys, ...roleSeed.protectedPermissions])];
          await this._setPermissions(role.id, merged);
        } else {
          const existing = await prisma.role_permissions.count({ where: { role_id: role.id } });
          if (existing === 0) await this._setPermissions(role.id, roleSeed.permissions);
        }
      }

      this.flushCache();
    } catch (error) {
      console.error("Role.seed failed", error.message);
    }
  },

  _setPermissions: async function (roleId, permissionKeys = []) {
    const validKeys = this.validations.permissions(permissionKeys);
    const permissionRows = await prisma.permissions.findMany({
      where: { key: { in: validKeys } },
    });

    await prisma.$transaction([
      prisma.role_permissions.deleteMany({ where: { role_id: Number(roleId) } }),
      ...permissionRows.map((perm) =>
        prisma.role_permissions.create({
          data: { role_id: Number(roleId), permission_id: perm.id },
        })
      ),
    ]);
    this.flushCache();
  },

  _permissionKeysFor: async function (roleId) {
    const rows = await prisma.role_permissions.findMany({
      where: { role_id: Number(roleId) },
      include: { permission: true },
    });
    return rows.map((r) => r.permission.key);
  },

  _loadCache: async function () {
    if (this._cache) return this._cache;
    const roles = await prisma.roles.findMany({
      include: { permissions: { include: { permission: true } } },
    });

    const cache = new Map();
    for (const role of roles) {
      const keys = role.permissions.map((rp) => rp.permission.key);
      // A role holding the super-admin key implicitly holds every system
      // permission, regardless of what else is individually ticked.
      cache.set(role.name, keys.includes(PERMISSIONS.SUPER_ADMIN) ? new Set(SYSTEM_PERMISSION_KEYS) : new Set(keys));
    }
    this._cache = cache;
    return cache;
  },

  permissionsFor: async function (roleName) {
    if (!roleName) return [];
    const cache = await this._loadCache();
    return [...(cache.get(roleName) || [])];
  },

  permissionsForUser: async function (user) {
    return this.permissionsFor(user?.role);
  },

  userCanAll: async function (user, permissions = []) {
    if (!user?.role) return false;
    const cache = await this._loadCache();
    const held = cache.get(user.role) || new Set();
    return permissions.every((p) => held.has(p));
  },

  userCanAny: async function (user, permissions = []) {
    if (!user?.role) return false;
    const cache = await this._loadCache();
    const held = cache.get(user.role) || new Set();
    return permissions.some((p) => held.has(p));
  },

  userCan: async function (user, permission) {
    return this.userCanAll(user, [permission]);
  },

  where: async function (clause = {}) {
    try {
      const roles = await prisma.roles.findMany({
        where: clause,
        include: { permissions: { include: { permission: true } } },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      });
      return roles.map((r) => this._flatten(r));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  get: async function (clause = {}) {
    try {
      const role = await prisma.roles.findFirst({
        where: clause,
        include: { permissions: { include: { permission: true } } },
      });
      return role ? this._flatten(role) : null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  _flatten: function (role) {
    return {
      ...role,
      permissions: (role.permissions || []).map((rp) => rp.permission?.key).filter(Boolean),
    };
  },

  create: async function ({ name, displayName, description = "", permissions = [] }) {
    try {
      const validatedName = this.validations.name(name);
      const validatedDisplayName = this.validations.displayName(displayName);
      const validatedDescription = this.validations.description(description);

      const role = await prisma.roles.create({
        data: {
          name: validatedName,
          displayName: validatedDisplayName,
          description: validatedDescription,
          isSystem: false,
        },
      });
      await this._setPermissions(role.id, permissions);
      return { role: await this.get({ id: role.id }), error: null };
    } catch (error) {
      if (error.code === "P2002") return { role: null, error: "A role with that name already exists." };
      return { role: null, error: error.message };
    }
  },

  update: async function (roleId, { displayName, description, permissions } = {}) {
    try {
      const role = await prisma.roles.findUnique({ where: { id: Number(roleId) } });
      if (!role) return { role: null, error: "Role not found." };

      const data = {};
      if (displayName !== undefined) data.displayName = this.validations.displayName(displayName);
      if (description !== undefined) data.description = this.validations.description(description);
      if (Object.keys(data).length > 0) {
        data.lastUpdatedAt = new Date();
        await prisma.roles.update({ where: { id: Number(roleId) }, data });
      }

      if (permissions !== undefined) {
        const roleSeed = SYSTEM_ROLES.find((r) => r.name === role.name);
        const finalPermissions = roleSeed
          ? [...new Set([...permissions, ...roleSeed.protectedPermissions])]
          : permissions;
        await this._setPermissions(roleId, finalPermissions);
      }

      return { role: await this.get({ id: Number(roleId) }), error: null };
    } catch (error) {
      return { role: null, error: error.message };
    }
  },

  delete: async function (roleId) {
    try {
      const role = await prisma.roles.findUnique({ where: { id: Number(roleId) } });
      if (!role) return { success: false, error: "Role not found.", reassigned: 0 };
      if (role.isSystem)
        return { success: false, error: "Built-in roles cannot be deleted.", reassigned: 0 };

      const reassignResult = await prisma.users.updateMany({
        where: { role: role.name },
        data: { role: FALLBACK_ROLE },
      });

      await prisma.roles.delete({ where: { id: Number(roleId) } });
      this.flushCache();
      return { success: true, error: null, reassigned: reassignResult.count };
    } catch (error) {
      return { success: false, error: error.message, reassigned: 0 };
    }
  },

  userCounts: async function () {
    try {
      const grouped = await prisma.users.groupBy({ by: ["role"], _count: true });
      return grouped.reduce((acc, g) => ({ ...acc, [g.role]: g._count }), {});
    } catch (error) {
      console.error(error.message);
      return {};
    }
  },

  exists: async function (roleName) {
    const cache = await this._loadCache();
    return cache.has(roleName);
  },

  fallbackRoleName: function () {
    return FALLBACK_ROLE;
  },

  superAdminRoleName: function () {
    return SUPER_ADMIN_ROLE;
  },
};

module.exports = { Role };
