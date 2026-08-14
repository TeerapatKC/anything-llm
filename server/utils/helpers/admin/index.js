const { User } = require("../../../models/user");
const { Role } = require("../../../models/role");
const { PERMISSIONS } = require("../../permissions");

/**
 * User administration used to be a fixed hierarchy (admin > manager > default). With
 * operator-defined roles there is no hierarchy to walk, so the rule is the standard
 * privilege-escalation guard instead: you can never hand out - or take away - a
 * permission you do not hold yourself.
 */

/**
 * Whether `actor` holds every permission in `permissions`.
 * @param {{role?: string}} actor
 * @param {string[]} permissions
 * @returns {Promise<boolean>}
 */
async function holdsAll(actor, permissions) {
  return Role.userCanAll(actor, permissions);
}

/**
 * A user may only assign a role whose permissions are a subset of their own, otherwise
 * anyone who can edit users could promote themselves by inventing a role.
 * @param {{role?: string}} currentUser
 * @param {Object} newUserParams
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function validRoleSelection(currentUser = {}, newUserParams = {}) {
  if (!newUserParams.hasOwnProperty("role"))
    return { valid: true, error: null }; // not updating role, so skip.

  if (!(await Role.userCan(currentUser, PERMISSIONS.USERS_ASSIGN_ROLES)))
    return { valid: false, error: "You cannot assign roles to users." };

  const targetRole = String(newUserParams.role);
  if (!(await Role.exists(targetRole)))
    return { valid: false, error: `The role "${targetRole}" does not exist.` };

  // A super-admin can hand out anything, including permissions added by later updates.
  if (await Role.userCan(currentUser, PERMISSIONS.SUPER_ADMIN))
    return { valid: true, error: null };

  const targetPermissions = await Role.permissionsFor(targetRole);
  if (!(await holdsAll(currentUser, targetPermissions)))
    return {
      valid: false,
      error:
        "That role grants permissions you do not have, so you cannot assign it.",
    };
  return { valid: true, error: null };
}

/**
 * Guards against the instance being left with nobody who can administer it. A user may
 * not be moved off the super-admin role if they are the last one holding it.
 * @param {{id: number, role: string}} userToModify
 * @param {Object} updates
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function canModifyAdmin(userToModify, updates) {
  if (!updates.hasOwnProperty("role")) return { valid: true, error: null };
  if (updates.role === userToModify.role) return { valid: true, error: null };
  if (!(await Role.userCan(userToModify, PERMISSIONS.SUPER_ADMIN)))
    return { valid: true, error: null };

  // Only the roles that actually carry the super-admin grant count towards the tally.
  const roles = await Role.where();
  const superAdminRoles = roles
    .filter((role) => role.permissions.includes(PERMISSIONS.SUPER_ADMIN))
    .map((role) => role.name);
  const adminCount = await User.count({ role: { in: superAdminRoles } });

  if (adminCount - 1 <= 0)
    return {
      valid: false,
      error: "No system admins will remain if you do this. Update failed.",
    };
  return { valid: true, error: null };
}

/**
 * A user may only edit or delete users whose role does not grant more than their own,
 * so a limited user-manager cannot delete an administrator.
 * @param {{role?: string}} currentUser
 * @param {{role?: string}} existingUser
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function validCanModify(currentUser, existingUser) {
  if (!(await Role.userCan(currentUser, PERMISSIONS.USERS_MANAGE)))
    return { valid: false, error: "You cannot manage users." };
  if (await Role.userCan(currentUser, PERMISSIONS.SUPER_ADMIN))
    return { valid: true, error: null };

  const targetPermissions = await Role.permissionsFor(existingUser?.role);
  if (!(await holdsAll(currentUser, targetPermissions)))
    return {
      valid: false,
      error: "Cannot perform that action on user.",
    };
  return { valid: true, error: null };
}

module.exports = {
  validCanModify,
  validRoleSelection,
  canModifyAdmin,
};
