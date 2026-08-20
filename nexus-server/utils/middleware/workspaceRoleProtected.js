const { ROLES, isElevatedRole, isCustomerAdmin } = require("./multiUserProtected");
const { SystemSettings } = require("../../models/systemSettings");
const { userFromSession } = require("../http");

// Mirrors the chat-side CHAT_STATE constants in server/utils/chats/stream.js
// so any client handling structured error states can treat a permission
// rejection the same way regardless of whether it arrived as a chat SSE
// event or a plain JSON error body from a REST endpoint.
//
// Security note: NO_PERMISSION is only ever attached to a 401 issued for a
// caller who IS a member of the resolved workspace (just lacking a
// sufficient workspace-scoped role for this action) - at that point they
// already legitimately know the workspace exists, so naming the reason is
// safe. A caller who ISN'T a member at all gets a bare 404, identical to a
// truly nonexistent slug (see the membership check below) - this was
// previously conflated (any non-elevated-role caller who failed the role
// check got NO_PERMISSION, even with zero relationship to the workspace),
// which let any authenticated-but-unrelated account enumerate which
// workspace slugs exist on the instance by diffing 404 vs 401. The primary
// workspace entry point (validWorkspaceSlug, used by chat/threads/etc.) has
// the same 404-collapsing property for the same reason.
const NO_PERMISSION_STATE = "NO_PERMISSION";

/**
 * Workspace-scoped authorization, additive to (not a replacement for) the
 * existing instance-wide `admin`/`manager` role checks in multiUserProtected.js.
 *
 * Instance-wide `admin`/`manager` users always bypass this check - they already
 * have unrestricted access to every workspace (see Workspace.getWithUser /
 * whereWithUser). A `default`-role user only passes when their `workspace_users`
 * row for the target workspace has a `role` included in `allowedWorkspaceRoles`.
 *
 * Resolves the target workspace from `response.locals.workspace` if an earlier
 * middleware (e.g. validWorkspaceSlug) already set it, otherwise looks it up by
 * `request.params.slug`.
 *
 * @param {("admin"|"member")[]} allowedWorkspaceRoles
 * @returns {function}
 */
function workspaceRoleValid(allowedWorkspaceRoles = ["admin"]) {
  return async (request, response, next) => {
    const multiUserMode =
      response.locals?.multiUserMode ?? (await SystemSettings.isMultiUserMode());
    // No per-workspace membership concept in single-user mode - the sole user
    // already has full access via the existing single-user auth flow.
    if (!multiUserMode) return next();

    const user =
      response.locals?.user ?? (await userFromSession(request, response));
    if (!user) return response.sendStatus(401).end();
    if (isElevatedRole(user)) return next();

    // Excludes archived workspaces (via getActive), matching validWorkspaceSlug's
    // behavior - otherwise a route using this middleware without a prior
    // validWorkspaceSlug in its chain (e.g. POST /workspace/:slug/update,
    // DELETE /workspace/:slug) would let an unrelated authenticated user
    // distinguish "workspace exists but archived" from "never existed" by
    // comparing this 404 against the NO_PERMISSION 401 below, defeating the
    // anti-enumeration property documented above.
    const workspace =
      response.locals?.workspace ??
      (await (async () => {
        const { Workspace } = require("../../models/workspace");
        const { slug, workspaceId } = request.params;
        if (workspaceId)
          return await Workspace.getActive({ id: Number(workspaceId) });
        if (slug) return await Workspace.getActive({ slug });
        return null;
      })());
    if (!workspace) return response.status(404).json({ error: "Workspace does not exist." });

    // Customer Admin: workspace-admin-equivalent for any workspace inside
    // their own customer - falls through to the membership check below
    // (which 404s, matching the anti-enumeration property above) for a
    // workspace outside their customer, same as any other unrelated caller.
    if (isCustomerAdmin(user) && workspace.customer_id === user.customer_id)
      return next();

    const { WorkspaceUser } = require("../../models/workspaceUsers");
    const membership = await WorkspaceUser.get({
      user_id: user.id,
      workspace_id: workspace.id,
    });

    // No relationship to this workspace at all - respond identically to a
    // nonexistent workspace so an unrelated account can't distinguish the
    // two (see the security note above).
    if (!membership)
      return response.status(404).json({ error: "Workspace does not exist." });

    // Role storage is now workspace_role_id (an FK, since workspace roles can
    // be private to one workspace) rather than a plain string, so resolve
    // the name before comparing against the allowed-names list every
    // existing caller of this middleware already passes.
    const { WorkspaceRole } = require("../../models/workspaceRole");
    const role = membership.workspace_role_id
      ? await WorkspaceRole.get({ id: membership.workspace_role_id })
      : await WorkspaceRole.defaultRole();
    if (role && allowedWorkspaceRoles.includes(role.name)) return next();

    // Caller IS a member, just lacking sufficient role - safe to be specific.
    return response.status(401).json({
      success: false,
      state: NO_PERMISSION_STATE,
      error: "You do not have permission to perform this action in this workspace.",
    });
  };
}

/**
 * Composes an instance-role check with a workspace-role check using OR
 * semantics: the request passes if EITHER the caller's instance-wide role is
 * in `allowedInstanceRoles` OR their workspace-scoped role (for the resolved
 * workspace) is in `allowedWorkspaceRoles`. Chaining flexUserRoleValid and
 * workspaceRoleValid directly as separate array middlewares would instead
 * require BOTH to pass (Express runs them in sequence), which is not what we
 * want here - so this composes them manually into a single middleware.
 * @param {string[]} allowedInstanceRoles - e.g. [ROLES.admin, ROLES.manager]
 * @param {("admin"|"member")[]} allowedWorkspaceRoles - e.g. ["admin"]
 * @returns {function}
 */
function eitherRoleValid(
  allowedInstanceRoles = [ROLES.admin, ROLES.manager],
  allowedWorkspaceRoles = ["admin"]
) {
  return async (request, response, next) => {
    const multiUserMode =
      response.locals?.multiUserMode ?? (await SystemSettings.isMultiUserMode());
    if (!multiUserMode) return next();

    const user =
      response.locals?.user ?? (await userFromSession(request, response));
    if (!user) return response.sendStatus(401).end();
    if (allowedInstanceRoles.includes(user.role)) return next();

    return workspaceRoleValid(allowedWorkspaceRoles)(request, response, next);
  };
}

/**
 * Read-only helper (not middleware) for surfacing "what is my role in this
 * workspace" on GET responses, without a full pass/fail check.
 * @param {number} userId
 * @param {number} workspaceId
 * @returns {Promise<"admin"|"member"|null>}
 */
async function getWorkspaceRole(userId, workspaceId) {
  if (!userId || !workspaceId) return null;
  const { WorkspaceUser } = require("../../models/workspaceUsers");
  const membership = await WorkspaceUser.get({
    user_id: Number(userId),
    workspace_id: Number(workspaceId),
  });
  if (!membership) return null;

  const { WorkspaceRole } = require("../../models/workspaceRole");
  const role = membership.workspace_role_id
    ? await WorkspaceRole.get({ id: membership.workspace_role_id })
    : await WorkspaceRole.defaultRole();
  return role?.name ?? null;
}

module.exports = { workspaceRoleValid, eitherRoleValid, getWorkspaceRole };
