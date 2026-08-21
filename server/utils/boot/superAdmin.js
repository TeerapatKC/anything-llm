const { User } = require("../../models/user");
const { Role } = require("../../models/role");
const { EventLogs } = require("../../models/eventLogs");
const { ADMIN_ROLE } = require("../permissions");

/**
 * Owner continuity.
 *
 * The `super-admin` role is deliberately impossible to reach through the application:
 * it cannot be assigned, the account holding it cannot be deleted, suspended or demoted,
 * and the role itself cannot be edited or removed. That is exactly what makes it useful,
 * and exactly what makes losing the account catastrophic - a forgotten password or a
 * departed colleague would otherwise brick the deployment.
 *
 * This module is the way out, and it lives at boot on purpose: everything here requires
 * filesystem or environment access on the host, which is a level of control that already
 * implies ownership of the deployment. Nothing here is reachable over HTTP.
 *
 *   - `ensureSuperAdminExists()` backfills instances created before the owner role
 *     existed, promoting the earliest administrator so the feature is not dead weight
 *     on an upgrade.
 *   - `applyBreakGlassFromEnv()` reads `SUPER_ADMIN_TRANSFER_TO` and
 *     `SUPER_ADMIN_RESET_PASSWORD`, both idempotent, for operators who only have
 *     `docker compose` and an env file to work with.
 *
 * `server/utils/boot/breakGlass.js` is the interactive counterpart for hosts where
 * editing the environment and restarting is not practical.
 */

const LOG_PREFIX = "\x1b[35m[OWNER]\x1b[0m";
const WARN_PREFIX = "\x1b[33m[OWNER]\x1b[0m";
const ERROR_PREFIX = "\x1b[31m[OWNER]\x1b[0m";

/**
 * Picks the account that should inherit ownership on an instance that has none: the
 * longest-standing administrator, falling back to the longest-standing account so a
 * deployment whose roles were reshuffled still ends up with an owner.
 * @returns {Promise<import("@prisma/client").users|null>}
 */
async function _heirToOwnership() {
  const adminRoles = (await Role.adminRoleNames()).filter(
    (name) => !Role.isSuperAdminRole(name)
  );

  const [earliestAdmin] = await User._where(
    { role: { in: adminRoles.length > 0 ? adminRoles : [ADMIN_ROLE] } },
    1
  );
  if (earliestAdmin) return earliestAdmin;

  const [earliestUser] = await User._where({}, 1);
  return earliestUser ?? null;
}

/**
 * Guarantees the instance has exactly one owner.
 *
 * Runs on every boot after role seeding. On a fresh install there are no users yet and
 * this is a no-op - first-run setup creates the owner. On an instance that predates the
 * owner role, the earliest administrator is promoted.
 * @returns {Promise<{promoted: boolean, username: string|null}>}
 */
async function ensureSuperAdminExists() {
  try {
    if (await Role.currentSuperAdmin())
      return { promoted: false, username: null };
    if ((await User.count()) === 0) return { promoted: false, username: null };

    const heir = await _heirToOwnership();
    if (!heir) return { promoted: false, username: null };

    const { success, error } = await User.transferSuperAdmin(heir.id);
    if (!success) {
      console.error(
        `${ERROR_PREFIX} Could not assign instance ownership to "${heir.username}": ${error}`
      );
      return { promoted: false, username: null };
    }

    await EventLogs.logEvent(
      "super_admin_backfilled",
      {
        username: heir.username,
        reason: "no account held the super-admin role",
      },
      heir.id
    );
    console.log(
      `${LOG_PREFIX} "${heir.username}" is now the super admin for this instance.`
    );
    return { promoted: true, username: heir.username };
  } catch (error) {
    console.error(
      `${ERROR_PREFIX} Failed to verify instance ownership.`,
      error.message
    );
    return { promoted: false, username: null };
  }
}

/**
 * Moves ownership to `SUPER_ADMIN_TRANSFER_TO` if that account is not already the owner.
 * Idempotent, so the variable can be left in place across restarts - though it should be
 * removed once the transfer has been confirmed.
 * @returns {Promise<boolean>} whether ownership moved
 */
async function _transferFromEnv() {
  const username = String(process.env.SUPER_ADMIN_TRANSFER_TO ?? "").trim();
  if (!username) return false;

  const target = await User._get({ username });
  if (!target) {
    console.error(
      `${ERROR_PREFIX} SUPER_ADMIN_TRANSFER_TO is set to "${username}", but no such account exists.`
    );
    return false;
  }
  if (Role.isSuperAdmin(target)) return false; // already done on an earlier boot

  const { success, error, from } = await User.transferSuperAdmin(target.id);
  if (!success) {
    console.error(
      `${ERROR_PREFIX} SUPER_ADMIN_TRANSFER_TO could not be applied: ${error}`
    );
    return false;
  }

  await EventLogs.logEvent(
    "super_admin_transferred",
    {
      from: from?.username ?? null,
      to: target.username,
      via: "SUPER_ADMIN_TRANSFER_TO",
    },
    target.id
  );
  console.log(
    `${WARN_PREFIX} Ownership moved to "${target.username}"${
      from ? ` (was "${from.username}", now ${ADMIN_ROLE})` : ""
    } via SUPER_ADMIN_TRANSFER_TO. Remove that variable now that it has been applied.`
  );
  return true;
}

/**
 * Replaces the owner's password with `SUPER_ADMIN_RESET_PASSWORD` and clears any
 * suspension, for the "nobody can sign in as the owner any more" case. The account is
 * forced to choose a new password on the next login, so leaving the variable in place
 * only re-applies the same temporary password rather than silently pinning a known one.
 * @returns {Promise<boolean>} whether the password was reset
 */
async function _resetPasswordFromEnv() {
  const password = String(process.env.SUPER_ADMIN_RESET_PASSWORD ?? "");
  if (!password) return false;

  const owner = await Role.currentSuperAdmin();
  if (!owner) {
    console.error(
      `${ERROR_PREFIX} SUPER_ADMIN_RESET_PASSWORD is set, but this instance has no owner yet.`
    );
    return false;
  }

  const complexity = User.checkPasswordComplexity(password);
  if (!complexity.checkedOK) {
    console.error(
      `${ERROR_PREFIX} SUPER_ADMIN_RESET_PASSWORD was rejected: ${complexity.error}`
    );
    return false;
  }

  const bcrypt = require("bcryptjs");
  const prisma = require("../prisma");
  await prisma.users.update({
    where: { id: owner.id },
    data: {
      password: bcrypt.hashSync(password, 10),
      suspended: 0,
      requiresPasswordChange: true,
      lastUpdatedAt: new Date(),
    },
  });

  await EventLogs.logEvent(
    "super_admin_password_recovered",
    { username: owner.username, via: "SUPER_ADMIN_RESET_PASSWORD" },
    owner.id
  );
  console.log(
    `${WARN_PREFIX} The owner password for "${owner.username}" was reset from the environment. ` +
      `They must choose a new one on next login. Remove SUPER_ADMIN_RESET_PASSWORD now.`
  );
  return true;
}

/**
 * Applies both environment-driven recovery paths. Failures are logged rather than
 * thrown - a bad value should not stop the server from booting, because booting is what
 * gives the operator a chance to correct it.
 * @returns {Promise<void>}
 */
async function applyBreakGlassFromEnv() {
  try {
    await _transferFromEnv();
    await _resetPasswordFromEnv();
  } catch (error) {
    console.error(
      `${ERROR_PREFIX} Break-glass recovery failed.`,
      error.message
    );
  }
}

module.exports = {
  ensureSuperAdminExists,
  applyBreakGlassFromEnv,
};
