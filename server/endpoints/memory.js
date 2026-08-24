const { Memory } = require("../models/memory");
const { User } = require("../models/user");
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

/**
 * Gate every memory route on the effective state: the instance policy AND the
 * requester's own preference. A user who switched personalization off for
 * themselves gets the same 403 as one on an instance where it was never turned
 * on, so opting out actually stops the feature rather than just hiding it.
 */
async function memoryFeatureEnabled(request, response, next) {
  const user = await userFromSession(request, response);
  if (!(await Memory.enabledForUser(user)))
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
    // Every route here sits behind `validatedRequest`, so this should be
    // unreachable. Refusing outright matters anyway: falling back to
    // `userId: null` would match memories orphaned by the single-user era
    // rather than denying the request.
    if (!user?.id) return response.status(404).json({ error: "Memory not found." });

    const memory = await Memory.get({
      id: Number(request.params.memoryId),
      userId: user.id,
    });
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

  /**
   * The requester's own personalization preferences, plus the instance policy
   * they sit under so the UI can explain *why* something is off.
   *
   * Deliberately not behind `memoryFeatureEnabled`: a user who switched their
   * own personalization off still has to be able to reach this route to switch
   * it back on.
   */
  app.get("/memories/preferences", [validatedRequest], async (request, response) => {
    try {
      const user = await userFromSession(request, response);
      const preferences = await User.memoryPreferences(user.id);
      response.status(200).json({
        preferences,
        instance: {
          memoryEnabled: await SystemSettings.memoriesEnabled(),
          memoryAutoExtraction: await SystemSettings.memoryAutoExtractionSetting(),
        },
        effective: {
          memoryEnabled: await Memory.enabledForUser({
            ...user,
            ...preferences,
          }),
          memoryAutoExtraction: await Memory.autoEnabledForUser({
            ...user,
            ...preferences,
          }),
        },
      });
    } catch (e) {
      console.error(e);
      return response.sendStatus(500);
    }
  });

  /**
   * Update the session user's own preferences. No permission check beyond being
   * signed in - this only ever writes the caller's own row, and needing an
   * admin to opt out of being remembered would defeat the point.
   */
  app.post(
    "/memories/preferences",
    [validatedRequest],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const body = reqBody(request);
        const updates = {};
        for (const key of ["memoryEnabled", "memoryAutoExtraction"]) {
          if (!body.hasOwnProperty(key)) continue;
          updates[key] = body[key] === null ? null : Boolean(body[key]);
        }

        const { success, error } = await User.setMemoryPreferences(
          user.id,
          updates
        );
        if (!success) return response.status(400).json({ success, error });

        const preferences = await User.memoryPreferences(user.id);
        response.status(200).json({ success: true, error: null, preferences });
      } catch (e) {
        console.error(e);
        return response.sendStatus(500);
      }
    }
  );

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
