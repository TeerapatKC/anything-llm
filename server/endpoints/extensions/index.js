const { CollectorApi } = require("../../utils/collectorApi");
const { randomUUID } = require("crypto");
const { reqBody, userFromSession } = require("../../utils/http");
const { Workspace } = require("../../models/workspace");
const { WorkspaceRole } = require("../../models/workspaceRole");
const { DocumentFolder } = require("../../models/documentFolders");
const { WORKSPACE_TYPES } = require("../../models/privateWorkspaceProfile");
const {
  WORKSPACE_PERMISSIONS: WS_PERMISSIONS,
} = require("../../utils/permissions");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");

function workspaceConnectorPermission(permission) {
  return async (request, response, next) => {
    const { workspaceSlug } = reqBody(request);
    if (!workspaceSlug) return response.sendStatus(400);
    const workspace = await Workspace.get({ slug: String(workspaceSlug) });
    if (!workspace) return response.sendStatus(404);
    const user =
      response.locals?.user ?? (await userFromSession(request, response));
    const singlePage =
      permission === WS_PERMISSIONS.DATA_CONNECTORS_WEB &&
      Number(request.body.depth) === 0 &&
      Number(request.body.maxLinks) === 1;
    const allowedPermissions = [permission, WS_PERMISSIONS.DATA_CONNECTORS];
    if (singlePage) allowedPermissions.push(WS_PERMISSIONS.DOCUMENTS_UPLOAD);
    if (
      !(await WorkspaceRole.userCanAnyInWorkspace(
        user,
        workspace.id,
        allowedPermissions
      ))
    )
      return response.sendStatus(401);
    response.locals.connectorWorkspace = workspace;
    response.locals.connectorUser = user;
    response.locals.singlePage = singlePage;
    next();
  };
}

async function privateConnectorFolder(response, privateImport = false) {
  const workspace = response.locals.connectorWorkspace;
  if (!privateImport && workspace.type !== WORKSPACE_TYPES.PERSONAL)
    return null;
  const destination = ["private-connector", workspace.id, randomUUID()].join(
    "-"
  );
  const { error } = await DocumentFolder.create({
    name: destination,
    ownerId: response.locals.connectorUser.id,
    workspaceId: workspace.id,
    visibility: DocumentFolder.VISIBILITY.PRIVATE,
  });
  if (error) throw new Error(error);
  return destination;
}

function extensionEndpoints(app) {
  if (!app) return;

  app.post(
    "/ext/youtube/transcript",
    [
      validatedRequest,
      workspaceConnectorPermission(WS_PERMISSIONS.DATA_CONNECTORS_YOUTUBE),
    ],
    async (request, response) => {
      try {
        const destination = await privateConnectorFolder(response);
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/youtube-transcript",
            method: "POST",
            body: { ...request.body, destination },
          });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/ext/website-depth",
    [
      validatedRequest,
      workspaceConnectorPermission(WS_PERMISSIONS.DATA_CONNECTORS_WEB),
    ],
    async (request, response) => {
      try {
        const destination = await privateConnectorFolder(
          response,
          response.locals.singlePage
        );
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/website-depth",
            method: "POST",
            body: { ...request.body, destination },
          });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );
}

module.exports = { extensionEndpoints };
