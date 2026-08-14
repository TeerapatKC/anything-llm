const { SystemSettings } = require("../../models/systemSettings");
const { Role } = require("../../models/role");
const { userFromSession } = require("../http");
const { PERMISSIONS, ANY_PERMISSION } = require("../permissions");

/**
 * Routes declare the permissions that unlock them. Holding any one of the listed
 * permissions is enough - a role that grants a superset still passes.
 */
const DEFAULT_PERMISSIONS = [PERMISSIONS.SUPER_ADMIN];

/**
 * @param {string[]|string} permissions
 * @returns {string[]}
 */
function normalizePermissions(permissions) {
  if (Array.isArray(permissions)) return permissions;
  if (!permissions) return [];
  return [permissions];
}

/**
 * Explicitly check that single user mode is enabled as well as that the
 * requesting user has the appropriate permissions to modify or call the URL.
 * @returns {function}
 */
async function isSingleUserMode(_request, response, next) {
  const multiUserMode = await SystemSettings.isMultiUserMode();
  if (multiUserMode) return response.sendStatus(401).end();
  next();
  return;
}

/**
 * Explicitly check that multi user mode is enabled as well as that the
 * requesting user holds at least one of the permissions that unlock the route.
 * @param {string[]} allowedPermissions - Permissions that grant access to the route
 * @returns {function}
 */
function strictMultiUserPermissionValid(
  allowedPermissions = DEFAULT_PERMISSIONS
) {
  const permissions = normalizePermissions(allowedPermissions);
  return async (request, response, next) => {
    // If the access-control is allowable for any signed-in user - skip validations and continue;
    if (permissions.includes(ANY_PERMISSION)) {
      next();
      return;
    }

    const multiUserMode =
      response.locals?.multiUserMode ??
      (await SystemSettings.isMultiUserMode());
    if (!multiUserMode) return response.sendStatus(401).end();

    const user =
      response.locals?.user ?? (await userFromSession(request, response));
    if (await Role.userCanAny(user, permissions)) {
      next();
      return;
    }
    return response.sendStatus(401).end();
  };
}

/**
 * Apply permission checks IF the current system is in multi-user mode.
 * This is relevant for routes that are shared between MUM and single-user mode.
 * @param {string[]} allowedPermissions - Permissions that grant access to the route
 * @returns {function}
 */
function flexUserPermissionValid(allowedPermissions = DEFAULT_PERMISSIONS) {
  const permissions = normalizePermissions(allowedPermissions);
  return async (request, response, next) => {
    // If the access-control is allowable for any signed-in user - skip validations and continue;
    // It does not matter if multi-user or not.
    if (permissions.includes(ANY_PERMISSION)) {
      next();
      return;
    }

    // Bypass if not in multi-user mode
    const multiUserMode =
      response.locals?.multiUserMode ??
      (await SystemSettings.isMultiUserMode());
    if (!multiUserMode) {
      next();
      return;
    }

    const user =
      response.locals?.user ?? (await userFromSession(request, response));
    if (await Role.userCanAny(user, permissions)) {
      next();
      return;
    }
    return response.sendStatus(401).end();
  };
}

/**
 * Finds the workspace a request is acting on. Routes name it either by slug
 * (`/workspace/:slug/...`) or by id (`/admin/workspaces/:workspaceId/...`), and a
 * preceding middleware may already have resolved it.
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @returns {Promise<import("@prisma/client").workspaces|null>}
 */
async function workspaceFromRequest(request, response) {
  if (response.locals?.workspace) return response.locals.workspace;

  const { Workspace } = require("../../models/workspace");
  const { slug, workspaceId, id } = request.params ?? {};

  // Resolved without a membership filter on purpose - whether the caller may act on
  // this workspace is exactly what the permission check below decides.
  let workspace = null;
  if (slug) workspace = await Workspace.get({ slug: String(slug) });
  else {
    const numericId = Number(workspaceId ?? id);
    if (!isNaN(numericId) && numericId > 0)
      workspace = await Workspace.get({ id: numericId });
  }

  if (workspace) response.locals.workspace = workspace;
  return workspace;
}

/**
 * Gate a route on permissions the caller must hold *inside the workspace the request
 * targets*. This is the workspace-scoped counterpart to `flexUserPermissionValid`, and
 * it is what lets one account be a manager of one workspace and a reader of another.
 *
 * Instance operators (`system.admin` or `workspaces.manage_all`) pass everywhere; the
 * resolution itself lives in the WorkspaceRole model.
 *
 * @param {string[]} allowedPermissions - Workspace permissions that unlock the route
 * @returns {function}
 */
function workspacePermissionValid(allowedPermissions = []) {
  const permissions = normalizePermissions(allowedPermissions);
  return async (request, response, next) => {
    if (permissions.includes(ANY_PERMISSION)) {
      next();
      return;
    }

    // Single-user mode has one operator who implicitly holds everything.
    const multiUserMode =
      response.locals?.multiUserMode ??
      (await SystemSettings.isMultiUserMode());
    if (!multiUserMode) {
      next();
      return;
    }

    const workspace = await workspaceFromRequest(request, response);
    if (!workspace) return response.status(404).end();

    const user =
      response.locals?.user ?? (await userFromSession(request, response));
    const { WorkspaceRole } = require("../../models/workspaceRole");
    if (
      await WorkspaceRole.userCanAnyInWorkspace(user, workspace.id, permissions)
    ) {
      next();
      return;
    }
    return response.sendStatus(401).end();
  };
}

/**
 * Gate a route on a workspace permission the caller must hold in *at least one*
 * workspace. For routes that are workspace work but do not name a workspace in the URL,
 * such as the data connector fetchers that gather content before it is attached
 * anywhere.
 * @param {string[]} allowedPermissions
 * @returns {function}
 */
function anyWorkspacePermissionValid(allowedPermissions = []) {
  const permissions = normalizePermissions(allowedPermissions);
  return async (request, response, next) => {
    const multiUserMode =
      response.locals?.multiUserMode ??
      (await SystemSettings.isMultiUserMode());
    if (!multiUserMode) {
      next();
      return;
    }

    const user =
      response.locals?.user ?? (await userFromSession(request, response));
    const { WorkspaceRole } = require("../../models/workspaceRole");
    for (const permission of permissions) {
      if (await WorkspaceRole.userCanInAnyWorkspace(user, permission)) {
        next();
        return;
      }
    }
    return response.sendStatus(401).end();
  };
}

/**
 * Whether the requesting user holds a permission. In single-user mode there is only
 * one operator and they implicitly hold everything.
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {string} permission
 * @returns {Promise<boolean>}
 */
async function requestUserCan(request, response, permission) {
  const multiUserMode =
    response.locals?.multiUserMode ?? (await SystemSettings.isMultiUserMode());
  if (!multiUserMode) return true;
  const user =
    response.locals?.user ?? (await userFromSession(request, response));
  return Role.userCan(user, permission);
}

// Middleware check on a public route if the instance is in a valid
// multi-user set up.
async function isMultiUserSetup(_request, response, next) {
  const multiUserMode = await SystemSettings.isMultiUserMode();
  if (!multiUserMode) {
    response.status(403).json({
      error: "Invalid request",
    });
    return;
  }

  next();
  return;
}

module.exports = {
  isSingleUserMode,
  strictMultiUserPermissionValid,
  flexUserPermissionValid,
  workspacePermissionValid,
  anyWorkspacePermissionValid,
  workspaceFromRequest,
  requestUserCan,
  isMultiUserSetup,
};
