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
 * @param {{role?: string}|null} existingUser - the account being edited, when there is one
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function validRoleSelection(
  currentUser = {},
  newUserParams = {},
  existingUser = null
) {
  if (!newUserParams.hasOwnProperty("role"))
    return { valid: true, error: null }; // not updating role, so skip.

  // Edit forms resubmit every field, so a save that leaves the role alone should not be
  // treated as an assignment - otherwise the owner cannot edit their own profile, and a
  // limited user-manager cannot fix a typo on someone whose role outranks them.
  if (existingUser && existingUser.role === String(newUserParams.role))
    return { valid: true, error: null };

  if (!(await Role.userCan(currentUser, PERMISSIONS.USERS_ASSIGN_ROLES)))
    return { valid: false, error: "You cannot assign roles to users." };

  const targetRole = String(newUserParams.role);

  // Nobody assigns the owner role - not even the owner. It is set during first-run
  // setup and afterwards moves only through an explicit ownership transfer, which keeps
  // "exactly one owner" true without relying on anyone remembering to demote themselves.
  if (Role.isSuperAdminRole(targetRole))
    return {
      valid: false,
      error:
        "The super admin role cannot be assigned here. Use Transfer ownership instead.",
    };

  if (!(await Role.exists(targetRole)))
    return { valid: false, error: `The role "${targetRole}" does not exist.` };

  // A super-admin can hand out anything, including permissions added by later updates.
  if (await Role.userCan(currentUser, PERMISSIONS.SYSTEM_ADMIN))
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

  if (Role.isSuperAdmin(userToModify))
    return {
      valid: false,
      error:
        "The super admin cannot be moved off their role. Transfer ownership instead.",
    };

  if (!(await Role.userCan(userToModify, PERMISSIONS.SYSTEM_ADMIN)))
    return { valid: true, error: null };

  // Only the roles that actually carry the `system.admin` wildcard count towards the
  // tally, the owner role included.
  const adminCount = await User.count({
    role: { in: await Role.adminRoleNames() },
  });

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
/** Any one of these means the caller administers users at all; the route gate decides
 * which particular action they are allowed to take. */
const USER_ADMIN_PERMISSIONS = [
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_EDIT,
  PERMISSIONS.USERS_SUSPEND,
  PERMISSIONS.USERS_DELETE,
  PERMISSIONS.USERS_RESET_PASSWORD,
];

async function validCanModify(currentUser, existingUser) {
  if (!(await Role.userCanAny(currentUser, USER_ADMIN_PERMISSIONS)))
    return { valid: false, error: "You cannot manage users." };

  // The owner is off-limits from the user administration console to everyone but
  // themselves, so no other administrator can rename, reset or delete the account that
  // owns the deployment. The model refuses the destructive parts of this too - this
  // check exists so the console can say why rather than silently failing.
  if (Role.isSuperAdmin(existingUser) && currentUser?.id !== existingUser?.id)
    return {
      valid: false,
      error: "The super admin account can only be managed by its owner.",
    };

  if (await Role.userCan(currentUser, PERMISSIONS.SYSTEM_ADMIN))
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
