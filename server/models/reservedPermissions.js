const prisma = require("../utils/prisma");
const {
  RESERVABLE_PERMISSION_KEYS,
  DEFAULT_RESERVED_PERMISSIONS,
  RESERVED_PERMISSIONS_SETTING,
} = require("../utils/permissions");

/**
 * Permissions the instance owner keeps to themselves.
 *
 * The `super-admin` role is about identity rather than capability - it holds the same
 * wildcard `admin` does. This is the one lever that makes it *more* capable: any
 * permission listed here is removed from every other role when effective permissions are
 * resolved, so an administrator does not get it no matter what has been ticked for them.
 *
 * That resolution happens in `Role._loadCache`, which means the rule applies everywhere
 * at once - route gates, the permission list the frontend caches to decide what to
 * render, and the "you cannot grant what you do not hold" checks - rather than being
 * something each call site has to remember.
 *
 * The list is stored as a system setting rather than in code so the owner can change it
 * without a deploy. An instance that has never been configured falls back to
 * `DEFAULT_RESERVED_PERMISSIONS`; an owner who deliberately reserves nothing gets an
 * empty list, and the two are distinguished by whether the setting row exists at all.
 */
const ReservedPermissions = {
  /** Cleared whenever the list is written, so the next read is authoritative. */
  _cache: null,

  flushCache: function () {
    this._cache = null;
  },

  /**
   * Drops anything that is not a reservable permission. `system.admin` is excluded by
   * the catalog itself - reserving the wildcard would strip administrators of
   * everything rather than of one capability.
   * @param {string[]} permissions
   * @returns {string[]}
   */
  validate: function (permissions = []) {
    if (!Array.isArray(permissions)) return [];
    return [
      ...new Set(
        permissions
          .map((permission) => String(permission))
          .filter((permission) =>
            RESERVABLE_PERMISSION_KEYS.includes(permission)
          )
      ),
    ];
  },

  /**
   * The permission keys currently reserved to the owner.
   * @returns {Promise<string[]>}
   */
  get: async function () {
    if (this._cache) return [...this._cache];

    try {
      const setting = await prisma.system_settings.findFirst({
        where: { label: RESERVED_PERMISSIONS_SETTING },
      });

      // No row at all means nobody has made a decision yet, so the shipped default
      // applies. A row holding an empty list means the owner chose to reserve nothing.
      const reserved =
        setting === null
          ? [...DEFAULT_RESERVED_PERMISSIONS]
          : this.validate(JSON.parse(setting.value || "[]"));

      this._cache = reserved;
      return [...reserved];
    } catch (error) {
      console.error("FAILED TO READ RESERVED PERMISSIONS.", error.message);
      // Falling back to the default rather than to "nothing reserved": a read failure
      // must not quietly hand the provider credentials to every administrator.
      return [...DEFAULT_RESERVED_PERMISSIONS];
    }
  },

  /**
   * Replaces the reserved list.
   * @param {string[]} permissions
   * @returns {Promise<{reserved: string[], error: string|null}>}
   */
  set: async function (permissions = []) {
    const reserved = this.validate(permissions);
    try {
      await prisma.system_settings.upsert({
        where: { label: RESERVED_PERMISSIONS_SETTING },
        update: { value: JSON.stringify(reserved) },
        create: {
          label: RESERVED_PERMISSIONS_SETTING,
          value: JSON.stringify(reserved),
        },
      });

      this.flushCache();
      // Effective permissions are memoised per role name, so they have to be recomputed
      // or the change would not take hold until the next restart.
      const { Role } = require("./role");
      Role.flushCache();

      return { reserved, error: null };
    } catch (error) {
      console.error("FAILED TO SAVE RESERVED PERMISSIONS.", error.message);
      return { reserved: [], error: error.message };
    }
  },

  /**
   * Whether a single permission is reserved to the owner.
   * @param {string} permission
   * @returns {Promise<boolean>}
   */
  isReserved: async function (permission) {
    return (await this.get()).includes(permission);
  },
};

module.exports = { ReservedPermissions };
