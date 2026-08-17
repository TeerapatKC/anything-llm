const { Workspace } = require("../../models/workspace");
const { WorkspaceThread } = require("../../models/workspaceThread");
const { userFromSession } = require("../http");

// Will pre-validate and set the workspace for a request if the slug is provided in the URL path.
async function validWorkspaceSlug(request, response, next) {
  const { slug } = request.params;
  const user = await userFromSession(request, response);
  const workspace = await Workspace.getWithUser(user, { slug });

  if (!workspace) {
    response.status(404).send("Workspace does not exist.");
    return;
  }

  response.locals.workspace = workspace;
  next();
}

// Will pre-validate and set the workspace AND a thread for a request if the slugs are provided in the URL path.
async function validWorkspaceAndThreadSlug(request, response, next) {
  const { slug, threadSlug } = request.params;
  const user = await userFromSession(request, response);
  const workspace = await Workspace.getWithUser(user, { slug });

  if (!workspace) {
    response.status(404).send("Workspace does not exist.");
    return;
  }

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

/**
 * Refuses chatting in a workspace an admin has switched off. Must run *after*
 * `validWorkspaceSlug`/`validWorkspaceAndThreadSlug`, which is what puts the workspace
 * on `response.locals`. Deliberately scoped to chat routes only - an inactive workspace
 * stays fully readable and manageable so an admin can inspect or re-activate it.
 */
function workspaceIsActive(request, response, next) {
  const workspace = response.locals.workspace;
  if (workspace && workspace.active === false) {
    response
      .status(403)
      .send("This workspace is inactive and cannot be chatted with.");
    return;
  }
  next();
}

module.exports = {
  validWorkspaceSlug,
  validWorkspaceAndThreadSlug,
  workspaceIsActive,
};
