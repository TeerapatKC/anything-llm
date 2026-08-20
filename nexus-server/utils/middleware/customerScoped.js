const { isCustomerAdmin } = require("./multiUserProtected");
const { userFromSession } = require("../http");

// V.1.5 cross-tenant guard for the `/admin/*` routes that resolve a target
// workspace/user by raw id (workspaceId/id/userId) rather than through
// Workspace.getWithUser/WorkspaceUser membership - those already got a
// customer_id branch (see models/workspace.js), but a plain `Workspace.get({id})`
// or `User.get({id})` in admin.js has no scoping at all. No-op for every role
// except customer_admin, matching the anti-enumeration convention used
// throughout this codebase: 404, never 403, for a resource outside the
// caller's scope, so an authenticated-but-unrelated account can't tell
// "doesn't exist" apart from "exists but isn't yours."

/**
 * Chain after validatedRequest on an admin.js route keyed by
 * :workspaceId or :id. No-op for every role except customer_admin, who gets
 * 404'd if the resolved workspace belongs to a different customer (or none).
 * Stashes the resolved workspace on response.locals.workspace so the handler
 * doesn't have to look it up again.
 * @returns {function}
 */
function customerScopedWorkspace() {
  return async (request, response, next) => {
    const user =
      response.locals?.user ?? (await userFromSession(request, response));
    if (!isCustomerAdmin(user)) return next();

    const { Workspace } = require("../../models/workspace");
    const { workspaceId, id } = request.params;
    const workspace = await Workspace.get({ id: Number(workspaceId ?? id) });
    if (!workspace || workspace.customer_id !== user.customer_id)
      return response.status(404).json({ error: "Workspace does not exist." });

    response.locals.workspace = workspace;
    next();
  };
}

/**
 * Same shape as customerScopedWorkspace, for admin.js routes keyed by
 * :id or :userId targeting a user. Stashes the resolved target user on
 * response.locals.targetUser.
 * @returns {function}
 */
function customerScopedUser() {
  return async (request, response, next) => {
    const user =
      response.locals?.user ?? (await userFromSession(request, response));
    if (!isCustomerAdmin(user)) return next();

    const { User } = require("../../models/user");
    const { id, userId } = request.params;
    const targetUser = await User.get({ id: Number(userId ?? id) });
    if (!targetUser || targetUser.customer_id !== user.customer_id)
      return response.status(404).json({ error: "User does not exist." });

    response.locals.targetUser = targetUser;
    next();
  };
}

module.exports = { customerScopedWorkspace, customerScopedUser };
