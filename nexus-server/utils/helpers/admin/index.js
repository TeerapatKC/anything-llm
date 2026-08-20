const { User } = require("../../../models/user");
const { ROLES } = require("../../middleware/multiUserProtected");

// When a user is updating or creating a user in multi-user, we need to check if they
// are allowed to do this and that the new or existing user will be at or below their permission level.
// the user executing this function should be an admin or manager.
function validRoleSelection(currentUser = {}, newUserParams = {}) {
  if (!newUserParams.hasOwnProperty("role"))
    return { valid: true, error: null }; // not updating role, so skip.
  if (currentUser.role === ROLES.admin) return { valid: true, error: null };
  if (currentUser.role === ROLES.manager) {
    const validRoles = [ROLES.manager, ROLES.default];
    if (!validRoles.includes(newUserParams.role))
      return { valid: false, error: "Invalid role selection for user." };
    return { valid: true, error: null };
  }
  // A Customer Admin may only provision ordinary users inside their own org -
  // never another customer_admin (that stays Platform-Admin-only), never
  // admin/manager. customer_id itself is forced by the caller (admin.js),
  // never taken from the request body, so it isn't checked here.
  if (currentUser.role === ROLES.customer_admin) {
    if (newUserParams.role !== ROLES.default)
      return { valid: false, error: "Invalid role selection for user." };
    return { valid: true, error: null };
  }
  return { valid: false, error: "Invalid condition for caller." };
}

// Check to make sure with this update that includes a role change to an existing admin to a non-admin
// that we still have at least one admin left or else they will lock themselves out.
async function canModifyAdmin(userToModify, updates) {
  // if updates don't include role property
  // or the user being modified isn't an admin currently
  // or the updates role is equal to the users current role.
  // skip validation.
  if (!updates.hasOwnProperty("role")) return { valid: true, error: null };
  if (updates.role === userToModify.role) return { valid: true, error: null };

  // Mirrors the instance-admin lockout above, scoped to one customer instead
  // of the whole instance - a customer left with zero customer_admin accounts
  // can never be managed by anyone on the customer side again.
  if (userToModify.role === ROLES.customer_admin) {
    const { Customer } = require("../../../models/customer");
    const adminCount = await Customer.countAdmins(userToModify.customer_id);
    if (adminCount - 1 <= 0)
      return {
        valid: false,
        error: "No customer admins will remain for this customer if you do this. Update failed.",
      };
    return { valid: true, error: null };
  }

  if (userToModify.role !== ROLES.admin) return { valid: true, error: null };

  const adminCount = await User.count({ role: ROLES.admin });
  if (adminCount - 1 <= 0)
    return {
      valid: false,
      error: "No system admins will remain if you do this. Update failed.",
    };
  return { valid: true, error: null };
}

function validCanModify(currentUser, existingUser) {
  if (currentUser.role === ROLES.admin) return { valid: true, error: null };
  if (currentUser.role === ROLES.manager) {
    const validRoles = [ROLES.manager, ROLES.default];
    if (!validRoles.includes(existingUser.role))
      return { valid: false, error: "Cannot perform that action on user." };
    return { valid: true, error: null };
  }
  if (currentUser.role === ROLES.customer_admin) {
    // customerScopedUser (endpoints/admin.js middleware) already 404s a
    // cross-customer target before this runs; the customer_id check here is
    // defense in depth, matching the pattern used throughout this codebase.
    if (
      existingUser.role !== ROLES.default ||
      existingUser.customer_id !== currentUser.customer_id
    )
      return { valid: false, error: "Cannot perform that action on user." };
    return { valid: true, error: null };
  }

  return { valid: false, error: "Invalid condition for caller." };
}

module.exports = {
  validCanModify,
  validRoleSelection,
  canModifyAdmin,
};
