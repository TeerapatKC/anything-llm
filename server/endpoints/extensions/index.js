const { CollectorApi } = require("../../utils/collectorApi");
const {
  userPermissionValid,
  anyWorkspacePermissionValid,
} = require("../../utils/middleware/authorizedRequest");
const {
  WORKSPACE_PERMISSIONS: WS_PERMISSIONS,
} = require("../../utils/permissions");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  isSupportedRepoProvider,
} = require("../../utils/middleware/isSupportedRepoProviders");

function extensionEndpoints(app) {
  if (!app) return;

  app.post(
    "/ext/:repo_platform/branches",
    [
      validatedRequest,
      anyWorkspacePermissionValid([WS_PERMISSIONS.DATA_CONNECTORS]),
      isSupportedRepoProvider,
    ],
    async (request, response) => {
      try {
        const { repo_platform } = request.params;
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: `/ext/${repo_platform}-repo/branches`,
            method: "POST",
            body: request.body,
          });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/ext/:repo_platform/repo",
    [
      validatedRequest,
      anyWorkspacePermissionValid([WS_PERMISSIONS.DATA_CONNECTORS]),
      isSupportedRepoProvider,
    ],
    async (request, response) => {
      try {
        const { repo_platform } = request.params;
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: `/ext/${repo_platform}-repo`,
            method: "POST",
            body: request.body,
          });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/ext/youtube/transcript",
    [
      validatedRequest,
      anyWorkspacePermissionValid([WS_PERMISSIONS.DATA_CONNECTORS]),
    ],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/youtube-transcript",
            method: "POST",
            body: request.body,
          });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/ext/confluence",
    [
      validatedRequest,
      anyWorkspacePermissionValid([WS_PERMISSIONS.DATA_CONNECTORS]),
    ],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/confluence",
            method: "POST",
            body: request.body,
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
      anyWorkspacePermissionValid([WS_PERMISSIONS.DATA_CONNECTORS]),
    ],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/website-depth",
            method: "POST",
            body: request.body,
          });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );
  app.post(
    "/ext/drupalwiki",
    [
      validatedRequest,
      anyWorkspacePermissionValid([WS_PERMISSIONS.DATA_CONNECTORS]),
    ],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/drupalwiki",
            method: "POST",
            body: request.body,
          });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/ext/obsidian/vault",
    [
      validatedRequest,
      anyWorkspacePermissionValid([WS_PERMISSIONS.DATA_CONNECTORS]),
    ],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/obsidian/vault",
            method: "POST",
            body: request.body,
          });
        response.status(200).json(responseFromProcessor);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/ext/paperless-ngx",
    [
      validatedRequest,
      anyWorkspacePermissionValid([WS_PERMISSIONS.DATA_CONNECTORS]),
    ],
    async (request, response) => {
      try {
        const responseFromProcessor =
          await new CollectorApi().forwardExtensionRequest({
            endpoint: "/ext/paperless-ngx",
            method: "POST",
            body: request.body,
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
