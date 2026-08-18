const { Memory } = require("../models/memory");
const { SystemSettings } = require("../models/systemSettings");
const { userFromSession, reqBody } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  userPermissionValid,
  workspacePermissionValid,
} = require("../utils/middleware/authorizedRequest");
const {
  PERMISSIONS,
  WORKSPACE_PERMISSIONS: WS_PERMISSIONS,
} = require("../utils/permissions");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");

async function memoryFeatureEnabled(_req, response, next) {
  const enabled = await SystemSettings.memoriesEnabled();
  if (!enabled)
    return response.status(403).json({ error: "Personalization is disabled." });
  next();
}

/**
 * Loads the memory by :memoryId and scopes the query to the requester's userId.
 * A memory owned by another user returns null here and is indistinguishable from "not found" — 404 either way.
 */
async function validateMemoryOwner(request, response, next) {
  try {
    const user = await userFromSession(request, response);
    const clause = {
      id: Number(request.params.memoryId),
      userId: user?.id ?? null,
    };

    const memory = await Memory.get(clause);
    if (!memory)
      return response.status(404).json({ error: "Memory not found." });

    next();
  } catch (e) {
    console.error(e);
    return response.sendStatus(500);
  }
}

function memoryEndpoints(app) {
  if (!app) return;

  app.get(
    "/workspaces/:slug/memories",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.VIEW]),
      memoryFeatureEnabled,
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        const [globalMemories, workspaceMemories] = await Promise.all([
          Memory.globalForUser(user?.id),
          Memory.forUserWorkspace(user?.id, workspace.id),
        ]);
        response.status(200).json({
          memories: { global: globalMemories, workspace: workspaceMemories },
        });
      } catch (e) {
        console.error(e);
        return response.sendStatus(500);
      }
    }
  );

  app.post(
    "/workspaces/:slug/memories",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.CHAT]),
      memoryFeatureEnabled,
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { content, scope = "workspace" } = reqBody(request);
        const { memory, message } = await Memory.create({
          userId: user?.id,
          workspaceId: scope === "global" ? null : workspace.id,
          scope,
          content: content.trim(),
        });

        if (!memory) return response.status(400).json({ error: message });
        response.status(200).json({ memory });
      } catch (e) {
        console.error(e);
        return response.sendStatus(500);
      }
    }
  );

  app.put(
    "/memories/:memoryId",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.ANY]),
      memoryFeatureEnabled,
      validateMemoryOwner,
    ],
    async (request, response) => {
      try {
        const memoryId = Number(request.params.memoryId);
        const { content } = reqBody(request);
        const { memory, message } = await Memory.update(memoryId, {
          content: content.trim(),
        });

        if (!memory) return response.status(400).json({ error: message });
        response.status(200).json({ memory });
      } catch (e) {
        console.error(e);
        return response.sendStatus(500);
      }
    }
  );

  app.delete(
    "/memories/:memoryId",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.ANY]),
      memoryFeatureEnabled,
      validateMemoryOwner,
    ],
    async (request, response) => {
      try {
        const memoryId = Number(request.params.memoryId);
        await Memory.delete(memoryId);
        response.status(200).json({ success: true });
      } catch (e) {
        console.error(e);
        return response.sendStatus(500);
      }
    }
  );

  app.post(
    "/memories/:memoryId/promote",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.ANY]),
      memoryFeatureEnabled,
      validateMemoryOwner,
    ],
    async (request, response) => {
      try {
        const memoryId = Number(request.params.memoryId);
        const { memory, message } = await Memory.promoteToGlobal(memoryId);
        if (!memory) return response.status(400).json({ error: message });

        response.status(200).json({ memory });
      } catch (e) {
        console.error(e);
        return response.sendStatus(500);
      }
    }
  );

  app.post(
    "/memories/:memoryId/demote/:slug",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.ANY]),
      memoryFeatureEnabled,
      validateMemoryOwner,
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const memoryId = Number(request.params.memoryId);
        const targetWorkspace = response.locals.workspace;

        const { memory, message } = await Memory.demoteToWorkspace(
          memoryId,
          targetWorkspace.id
        );

        if (!memory) return response.status(400).json({ error: message });
        response.status(200).json({ memory });
      } catch (e) {
        console.error(e);
        return response.sendStatus(500);
      }
    }
  );
}

module.exports = { memoryEndpoints };
