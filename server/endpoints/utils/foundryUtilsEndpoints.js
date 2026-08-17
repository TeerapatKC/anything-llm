const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  userPermissionValid,
} = require("../../utils/middleware/multiUserProtected");
const { PERMISSIONS } = require("../../utils/permissions");
const { reqBody } = require("../../utils/http");
const FoundryModels = require("../../utils/AiProviders/foundry/models");

function foundryUtilsEndpoints(app) {
  if (!app) return;

  app.post(
    "/utils/foundry/capabilities",
    [validatedRequest, userPermissionValid([PERMISSIONS.SYSTEM_SETTINGS])],
    async (request, response) => {
      try {
        const { basePath = null } = reqBody(request);
        const capabilities = await FoundryModels.resolveSource(
          basePath || process.env.FOUNDRY_BASE_PATH
        );
        return response.status(200).json(capabilities);
      } catch (e) {
        console.error(e);
        return response
          .status(200)
          .json({ source: "openai", canManage: false });
      }
    }
  );
}

module.exports = { foundryUtilsEndpoints };
