const prisma = require("../utils/prisma");
const {
  PERMISSIONS,
  PERMISSION_CATALOG,
  ALL_PERMISSION_KEYS,
  SYSTEM_ROLES,
  FALLBACK_ROLE,
  SUPER_ADMIN_ROLE,
} = require("../utils/permissions");

/**
 * @typedef {Object} RoleRecord
 * @property {number} id
 * @property {string} name
 * @property {string} displayName
 * @property {string|null} description
 * @property {boolean} isSystem
 * @property {string[]} permissions
 */

const Role = {
  nameRegex: new RegExp(/^[a-z][a-z0-9_-]*$/),

  /**
   * Resolved permission sets keyed by role name. Cleared on any write so a permission
   * tick takes effect on the next request instead of after a restart.
   * @type {Map<string, Set<string>>|null}
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
      if (!Role.nameRegex.test(name))
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
    /** Drops anything that is not a key in the code-defined catalog. */
    permissions: (permissions = []) => {
      if (!Array.isArray(permissions)) return [];
      return [
        ...new Set(
          permissions
            .map((permission) => String(permission))
            .filter((permission) => ALL_PERMISSION_KEYS.includes(permission))
        ),
      ];
    },
  },

  /**
   * Mirrors the code-defined permission catalog into the database and creates any
   * missing system roles. Safe to run on every boot - it never overwrites the
   * permissions an operator has ticked for an existing role.
   * @returns {Promise<void>}
   */
  seed: async function () {
    try {
      for (const permission of PERMISSION_CATALOG) {
        await prisma.permissions.upsert({
          where: { key: permission.key },
          update: {
            label: permission.label,
            description: permission.description,
            category: permission.category,
            sortOrder: permission.order,
          },
          create: {
            key: permission.key,
            label: permission.label,
            description: permission.description,
            category: permission.category,
            sortOrder: permission.order,
          },
        });
      }

      // Permissions removed from the catalog should not linger as ticked boxes.
      await prisma.permissions.deleteMany({
        where: { key: { notIn: ALL_PERMISSION_KEYS } },
      });

      for (const systemRole of SYSTEM_ROLES) {
        const existing = await prisma.roles.findUnique({
          where: { name: systemRole.name },
        });

        if (!existing) {
          const role = await prisma.roles.create({
            data: {
              name: systemRole.name,
              displayName: systemRole.displayName,
              description: systemRole.description,
              isSystem: true,
            },
          });
          await this._setPermissions(role.id, systemRole.permissions);
          continue;
        }

        // Flag pre-existing rows as system roles and re-apply the permissions a system
        // role is never allowed to lose (currently only the super-admin grant).
        if (!existing.isSystem)
          await prisma.roles.update({
            where: { id: existing.id },
            data: { isSystem: true },
          });
        if (systemRole.protectedPermissions.length > 0) {
          const current = await this._permissionKeysFor(existing.id);
          const missing = systemRole.protectedPermissions.filter(
            (permission) => !current.includes(permission)
          );
          if (missing.length > 0)
            await this._setPermissions(existing.id, [...current, ...missing]);
        }
      }

      this.flushCache();
    } catch (error) {
      console.error("FAILED TO SEED ROLES AND PERMISSIONS.", error.message);
    }
  },

  /**
   * Replaces the permission set of a role.
   * @param {number} roleId
   * @param {string[]} permissionKeys
   */
  _setPermissions: async function (roleId, permissionKeys = []) {
    const keys = this.validations.permissions(permissionKeys);
    const permissionRecords = await prisma.permissions.findMany({
      where: { key: { in: keys } },
      select: { id: true },
    });

    await prisma.role_permissions.deleteMany({ where: { role_id: roleId } });
    // The pinned version of prisma does not support createMany() with SQLite,
    // so the grants are written as individual creates inside one transaction.
    if (permissionRecords.length > 0)
      await prisma.$transaction(
        permissionRecords.map((permission) =>
          prisma.role_permissions.create({
            data: { role_id: roleId, permission_id: permission.id },
          })
        )
      );
    this.flushCache();
  },

  /**
   * @param {number} roleId
   * @returns {Promise<string[]>}
   */
  _permissionKeysFor: async function (roleId) {
    const rows = await prisma.role_permissions.findMany({
      where: { role_id: roleId },
      include: { permission: { select: { key: true } } },
    });
    return rows.map((row) => row.permission.key);
  },

  /**
   * Loads every role and its permissions into the in-memory cache.
   * @returns {Promise<Map<string, Set<string>>>}
   */
  _loadCache: async function () {
    if (this._cache) return this._cache;
    const cache = new Map();
    try {
      const roles = await prisma.roles.findMany({
        include: { permissions: { include: { permission: true } } },
      });
      for (const role of roles) {
        const keys = role.permissions.map((entry) => entry.permission.key);
        // The super-admin grant is an implicit wildcard so that permissions added by a
        // future update never lock the administrator out of their own instance.
        cache.set(
          role.name,
          new Set(
            keys.includes(PERMISSIONS.SUPER_ADMIN) ? ALL_PERMISSION_KEYS : keys
          )
        );
      }
    } catch (error) {
      console.error("FAILED TO LOAD ROLE PERMISSIONS.", error.message);
      return cache;
    }
    this._cache = cache;
    return cache;
  },

  /**
   * The permission keys granted by a role name.
   * @param {string|null} roleName
   * @returns {Promise<string[]>}
   */
  permissionsFor: async function (roleName = null) {
    if (!roleName) return [];
    const cache = await this._loadCache();
    return [...(cache.get(roleName) ?? [])];
  },

  /**
   * Whether a user holds every one of the given permissions.
   * @param {{role?: string}|null} user
   * @param {string[]} permissions
   * @returns {Promise<boolean>}
   */
  userCanAll: async function (user = null, permissions = []) {
    if (permissions.length === 0) return true;
    const cache = await this._loadCache();
    const granted = cache.get(user?.role);
    if (!granted) return false;
    return permissions.every((permission) => granted.has(permission));
  },

  /**
   * Whether a user holds at least one of the given permissions.
   * @param {{role?: string}|null} user
   * @param {string[]} permissions
   * @returns {Promise<boolean>}
   */
  userCanAny: async function (user = null, permissions = []) {
    if (permissions.length === 0) return false;
    const cache = await this._loadCache();
    const granted = cache.get(user?.role);
    if (!granted) return false;
    return permissions.some((permission) => granted.has(permission));
  },

  /**
   * Convenience single-permission check.
   * @param {{role?: string}|null} user
   * @param {string} permission
   * @returns {Promise<boolean>}
   */
  userCan: async function (user = null, permission) {
    return this.userCanAll(user, [permission]);
  },

  /**
   * The permission keys a user holds - attached to user payloads sent to the frontend.
   * @param {{role?: string}|null} user
   * @returns {Promise<string[]>}
   */
  permissionsForUser: async function (user = null) {
    return this.permissionsFor(user?.role ?? null);
  },

  /**
   * Roles with their permission keys flattened, for the management UI.
   * @param {Object} clause
   * @returns {Promise<RoleRecord[]>}
   */
  where: async function (clause = {}) {
    try {
      const roles = await prisma.roles.findMany({
        where: clause,
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        include: { permissions: { include: { permission: true } } },
      });
      return roles.map((role) => this._flatten(role));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * @param {Object} clause
   * @returns {Promise<RoleRecord|null>}
   */
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
    const { permissions, ...rest } = role;
    return {
      ...rest,
      permissions: permissions.map((entry) => entry.permission.key),
    };
  },

  /**
   * @param {{name: string, displayName: string, description?: string, permissions?: string[]}} params
   * @returns {Promise<{role: RoleRecord|null, error: string|null}>}
   */
  create: async function ({
    name,
    displayName,
    description = "",
    permissions = [],
  }) {
    try {
      const validName = this.validations.name(name);
      const role = await prisma.roles.create({
        data: {
          name: validName,
          displayName: this.validations.displayName(displayName || validName),
          description: this.validations.description(description),
          isSystem: false,
        },
      });
      await this._setPermissions(role.id, permissions);
      return { role: await this.get({ id: role.id }), error: null };
    } catch (error) {
      console.error("FAILED TO CREATE ROLE.", error.message);
      if (String(error.message).includes("Unique constraint"))
        return { role: null, error: "A role with that name already exists" };
      return { role: null, error: error.message };
    }
  },

  /**
   * @param {number} roleId
   * @param {{displayName?: string, description?: string, permissions?: string[]}} updates
   * @returns {Promise<{role: RoleRecord|null, error: string|null}>}
   */
  update: async function (roleId, updates = {}) {
    try {
      const existing = await prisma.roles.findUnique({
        where: { id: Number(roleId) },
      });
      if (!existing) return { role: null, error: "Role not found" };

      const data = {};
      if (updates.hasOwnProperty("displayName"))
        data.displayName = this.validations.displayName(updates.displayName);
      if (updates.hasOwnProperty("description"))
        data.description = this.validations.description(updates.description);
      if (Object.keys(data).length > 0) {
        data.lastUpdatedAt = new Date();
        await prisma.roles.update({ where: { id: existing.id }, data });
      }

      if (updates.hasOwnProperty("permissions")) {
        let permissions = this.validations.permissions(updates.permissions);
        // System roles keep the permissions that define them - the super-admin role
        // cannot have its wildcard grant unticked, otherwise the instance is orphaned.
        const systemRole = SYSTEM_ROLES.find(
          (role) => role.name === existing.name
        );
        if (systemRole?.protectedPermissions.length) {
          permissions = [
            ...new Set([...permissions, ...systemRole.protectedPermissions]),
          ];
        }
        await this._setPermissions(existing.id, permissions);
      }

      this.flushCache();
      return { role: await this.get({ id: existing.id }), error: null };
    } catch (error) {
      console.error("FAILED TO UPDATE ROLE.", error.message);
      return { role: null, error: error.message };
    }
  },

  /**
   * Deletes a custom role and moves everyone holding it back to the fallback role.
   * @param {number} roleId
   * @returns {Promise<{success: boolean, error: string|null, reassigned: number}>}
   */
  delete: async function (roleId) {
    try {
      const role = await prisma.roles.findUnique({
        where: { id: Number(roleId) },
      });
      if (!role)
        return { success: false, error: "Role not found", reassigned: 0 };
      if (role.isSystem)
        return {
          success: false,
          error: "Built-in roles cannot be deleted.",
          reassigned: 0,
        };

      const { count } = await prisma.users.updateMany({
        where: { role: role.name },
        data: { role: FALLBACK_ROLE },
      });
      await prisma.roles.delete({ where: { id: role.id } });
      this.flushCache();
      return { success: true, error: null, reassigned: count };
    } catch (error) {
      console.error("FAILED TO DELETE ROLE.", error.message);
      return { success: false, error: error.message, reassigned: 0 };
    }
  },

  /**
   * How many users hold each role, keyed by role name.
   * @returns {Promise<Record<string, number>>}
   */
  userCounts: async function () {
    try {
      const grouped = await prisma.users.groupBy({
        by: ["role"],
        _count: { role: true },
      });
      return grouped.reduce((counts, entry) => {
        counts[entry.role] = entry._count.role;
        return counts;
      }, {});
    } catch (error) {
      console.error(error.message);
      return {};
    }
  },

  /**
   * Whether a role name exists.
   * @param {string} roleName
   * @returns {Promise<boolean>}
   */
  exists: async function (roleName = "") {
    const cache = await this._loadCache();
    return cache.has(roleName);
  },

  /** @returns {string} */
  fallbackRoleName: function () {
    return FALLBACK_ROLE;
  },

  /** @returns {string} */
  superAdminRoleName: function () {
    return SUPER_ADMIN_ROLE;
  },
};

module.exports = { Role };
