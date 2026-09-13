const {
  userPermissionValid,
} = require("../utils/middleware/authorizedRequest");
const { PERMISSIONS } = require("../utils/permissions");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  validExportTypes,
  sendChatHistoryFile,
} = require("../utils/chats/exportChatToFile");
const { reqBody, userFromSession } = require("../utils/http");

function utilEndpoints(app) {
  if (!app) return;

  app.get("/utils/metrics", async (_, response) => {
    try {
      const metrics = {
        online: true,
        version: getGitVersion(),
        // Deprecated and constant - kept so existing monitoring that reads this
        // field does not break. Authentication is always required.
        mode: "multi-user",
        vectorDB: process.env.VECTOR_DB || "lancedb",
        storage: await getDiskStorage(),
        appVersion: getDeploymentVersion(),
      };
      response.status(200).json(metrics);
    } catch (e) {
      console.error(e);
      response.sendStatus(500).end();
    }
  });

  app.post(
    "/export-chat/:type",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const { type } = request.params;
        if (!validExportTypes.includes(type))
          return response.sendStatus(400).end();

        const { workspaceSlug, threadSlug } = reqBody(request);
        const { Workspace } = require("../models/workspace");
        const { WorkspaceThread } = require("../models/workspaceThread");
        const { WorkspaceChats } = require("../models/workspaceChats");

        const user = await userFromSession(request, response);
        const workspace = await Workspace.getWithUser(user, {
          slug: String(workspaceSlug),
        });
        if (!workspace) return response.sendStatus(404).end();

        let thread;
        if (threadSlug) {
          thread = await WorkspaceThread.get({
            slug: String(threadSlug),
            user_id: user?.id || null,
          });
          if (!thread) return response.sendStatus(404).end();
        }

        const chats = await WorkspaceChats.where({
          workspaceId: workspace.id,
          user_id: user?.id || null,
          thread_id: thread?.id || null,
        });
        if (chats.length === 0) return response.sendStatus(400).end();

        const meta = {
          workspaceName: workspace.name,
          threadName: thread?.name || null,
        };

        return sendChatHistoryFile(response, chats, meta, type);
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  const { lemonadeUtilsEndpoints } = require("./utils/lemonadeUtilsEndpoints");
  lemonadeUtilsEndpoints(app);

}

function getGitVersion() {
  if (process.env.NEXUS_AI_RUNTIME === "docker") return "--";
  try {
    return require("child_process")
      .execSync("git rev-parse HEAD")
      .toString()
      .trim();
  } catch (e) {
    console.error("getGitVersion", e.message);
    return "--";
  }
}

function byteToGigaByte(n) {
  return n / Math.pow(10, 9);
}

async function getDiskStorage() {
  try {
    const checkDiskSpace = require("check-disk-space").default;
    const { free, size } = await checkDiskSpace("/");
    return {
      current: Math.floor(byteToGigaByte(free)),
      capacity: Math.floor(byteToGigaByte(size)),
    };
  } catch {
    return {
      current: null,
      capacity: null,
    };
  }
}

/**
 * Returns the model tag based on the provider set in the environment.
 * This information is used to identify the parent model for the system
 * so that we can prioritize the correct model and types for future updates
 * as well as build features in NexusAI directly for a specific model or capabilities.
 *
 * @returns {string} The model tag.
 */
function getModelTag() {
  return process.env.GENERIC_OPEN_AI_MODEL_PREF || "--";
}

/**
 * Returns the deployment version.
 * - Dev: reads from package.json
 * - Prod: reads from ENV
 * expected format: major.minor.patch
 * @returns {string|null} The deployment version.
 */
function getDeploymentVersion() {
  if (process.env.NODE_ENV === "development")
    return require("../../package.json").version;
  if (process.env.DEPLOYMENT_VERSION) return process.env.DEPLOYMENT_VERSION;
  return null;
}

/**
 * Returns the user agent for the NexusAI deployment.
 * @returns {string} The user agent.
 */
function getNexusAIUserAgent() {
  const version = getDeploymentVersion() || "unknown";
  return `NexusAI/${version}`;
}

module.exports = {
  utilEndpoints,
  getGitVersion,
  getModelTag,
  getNexusAIUserAgent,
  getDeploymentVersion,
};
