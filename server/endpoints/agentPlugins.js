const ImportedPlugin = require("../utils/agents/imported");
const { reqBody } = require("../utils/http");
const {
  userPermissionValid,
} = require("../utils/middleware/authorizedRequest");
const { PERMISSIONS } = require("../utils/permissions");
const { validatedRequest } = require("../utils/middleware/validatedRequest");

function importedAgentPluginEndpoints(app) {
  if (!app) return;

  app.post(
    "/agent-plugins/:hubId/toggle",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MANAGE_SKILLS])],
    (request, response) => {
      try {
        const { hubId } = request.params;
        const { active } = reqBody(request);
        const updatedConfig = ImportedPlugin.updateImportedPlugin(hubId, {
          active: Boolean(active),
        });
        response.status(200).json(updatedConfig);
      } catch (e) {
        console.error(e);
        response.status(500).end();
      }
    }
  );

  app.post(
    "/agent-plugins/:hubId/config",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MANAGE_SKILLS])],
    (request, response) => {
      try {
        const { hubId } = request.params;
        const { updates } = reqBody(request);
        const updatedConfig = ImportedPlugin.updateImportedPlugin(
          hubId,
          updates
        );
        response.status(200).json(updatedConfig);
      } catch (e) {
        console.error(e);
        response.status(500).end();
      }
    }
  );

  app.delete(
    "/agent-plugins/:hubId",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MANAGE_SKILLS])],
    async (request, response) => {
      try {
        const { hubId } = request.params;
        const result = ImportedPlugin.deletePlugin(hubId);
        response.status(200).json(result);
      } catch (e) {
        console.error(e);
        response.status(500).end();
      }
    }
  );
}

module.exports = { importedAgentPluginEndpoints };
