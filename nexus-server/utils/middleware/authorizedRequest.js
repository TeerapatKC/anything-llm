const { userFromSession } = require("../http");
const { ANY_PERMISSION } = require("../permissions");

/**
 * Permission-based route guards, for the new custom-RBAC endpoints
 * (endpoints/roles.js) - additive to, not a replacement for, the existing
 * role-NAME-based guards in multiUserProtected.js/workspaceRoleProtected.js
 * that every other endpoint in the app still uses. Building those out is a
 * much larger, separate undertaking (rewiring ~50 existing route guards);
 * these two are only wired into the roles/permissions surface itself for now.
 */

/**
 * @param {string[]} allowedPermissions
 * @returns {function}
 */
function userPermissionValid(allowedPermissions = []) {
  return async (request, response, next) => {
    if (allowedPermissions.includes(ANY_PERMISSION)) return next();

    const user = response.locals?.user ?? (await userFromSession(request, response));
    if (!user) return response.sendStatus(401).end();

    const { Role } = require("../../models/role");
    if (await Role.userCanAny(user, allowedPermissions)) return next();
    return response.sendStatus(401).end();
  };
}

/**
 * Resolves the workspace a request is acting on, reusing
 * `response.locals.workspace` if a prior middleware already set it.
 */
async function workspaceFromRequest(request, response) {
  if (response.locals?.workspace) return response.locals.workspace;

  const { Workspace } = require("../../models/workspace");
  const { slug, workspaceId, id } = request.params;
  let workspace = null;
  if (slug) workspace = await Workspace.get({ slug });
  else if (workspaceId) workspace = await Workspace.get({ id: Number(workspaceId) });
  else if (id) workspace = await Workspace.get({ id: Number(id) });

  if (workspace) response.locals.workspace = workspace;
  return workspace;
}

/**
 * @param {string[]} allowedPermissions
 * @returns {function}
 */
function workspacePermissionValid(allowedPermissions = []) {
  return async (request, response, next) => {
    if (allowedPermissions.includes(ANY_PERMISSION)) return next();

    const user = response.locals?.user ?? (await userFromSession(request, response));
    if (!user) return response.sendStatus(401).end();

    const workspace = await workspaceFromRequest(request, response);
    if (!workspace)
      return response.status(404).json({ error: "Workspace does not exist." });

    const { WorkspaceRole } = require("../../models/workspaceRole");
    if (await WorkspaceRole.userCanAnyInWorkspace(user, workspace.id, allowedPermissions))
      return next();
    return response.sendStatus(401).end();
  };
}

/** For routes with no single workspace named in the URL. */
function anyWorkspacePermissionValid(allowedPermissions = []) {
  return async (request, response, next) => {
    if (allowedPermissions.includes(ANY_PERMISSION)) return next();

    const user = response.locals?.user ?? (await userFromSession(request, response));
    if (!user) return response.sendStatus(401).end();

    const { WorkspaceRole } = require("../../models/workspaceRole");
    for (const permission of allowedPermissions) {
      if (await WorkspaceRole.userCanInAnyWorkspace(user, permission)) return next();
    }
    return response.sendStatus(401).end();
  };
}

module.exports = {
  userPermissionValid,
  workspacePermissionValid,
  anyWorkspacePermissionValid,
  workspaceFromRequest,
};
