const { Workspace } = require("../../models/workspace");
const { WorkspaceThread } = require("../../models/workspaceThread");
const { userFromSession, multiUserMode } = require("../http");

/**
 * Shared resolution logic for both middlewares below. Archived workspaces
 * are treated as not-found for all normal request flows - they are only
 * reachable via the explicit restore endpoint, which resolves the workspace
 * itself and does not go through this middleware.
 * @param {Request} request
 * @param {Response} response
 * @returns {Promise<Object|null>}
 */
async function resolveActiveWorkspace(request, response) {
  const { slug } = request.params;
  const user = await userFromSession(request, response);
  const workspace = multiUserMode(response)
    ? await Workspace.getWithUser(user, { slug })
    : await Workspace.get({ slug });

  if (!workspace || workspace.status === "archived") return null;
  return workspace;
}

// Will pre-validate and set the workspace for a request if the slug is provided in the URL path.
async function validWorkspaceSlug(request, response, next) {
  const workspace = await resolveActiveWorkspace(request, response);
  if (!workspace) {
    response.status(404).send("Workspace does not exist.");
    return;
  }

  response.locals.workspace = workspace;
  next();
}

// Will pre-validate and set the workspace AND a thread for a request if the slugs are provided in the URL path.
async function validWorkspaceAndThreadSlug(request, response, next) {
  const { threadSlug } = request.params;
  const workspace = await resolveActiveWorkspace(request, response);
  if (!workspace) {
    response.status(404).send("Workspace does not exist.");
    return;
  }

  const user = await userFromSession(request, response);
  const thread = await WorkspaceThread.get({
    slug: threadSlug,
    user_id: user?.id || null,
    workspace_id: workspace.id,
  });
  if (!thread) {
    response.status(404).send("Workspace thread does not exist.");
    return;
  }

  response.locals.workspace = workspace;
  response.locals.thread = thread;
  next();
}

module.exports = {
  validWorkspaceSlug,
  validWorkspaceAndThreadSlug,
};
