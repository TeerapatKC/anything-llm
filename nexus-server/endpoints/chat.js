const { v4: uuidv4 } = require("uuid");
const { reqBody, userFromSession, multiUserMode } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const { streamChatWithWorkspace } = require("../utils/chats/stream");
const {
  ROLES,
  flexUserRoleValid,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const {
  validWorkspaceAndThreadSlug,
  validWorkspaceSlug,
} = require("../utils/middleware/validWorkspace");
const { writeResponseChunk } = require("../utils/helpers/chat/responses");
const { WorkspaceThread } = require("../models/workspaceThread");
const { User } = require("../models/user");
const { getModelTag } = require("./utils");

/**
 * Shared implementation for both stream-chat routes below - they differ only
 * in whether a thread is present (thread resolution/auto-rename and the
 * `thread` field on the sent_chat event log), so a bug fix or new check
 * (quota message wording, SSE headers, telemetry fields) only needs to be
 * made once instead of drifting between two copies.
 * @param {Request} request
 * @param {Response} response
 * @param {import("../models/workspaceThread").WorkspaceThread|null} thread
 */
async function handleStreamChat(request, response, thread = null) {
  try {
    const user = await userFromSession(request, response);
    const { message, attachments = [] } = reqBody(request);
    const workspace = response.locals.workspace;

    if (typeof message !== "string" || message.trim().length === 0) {
      response.status(400).json({
        id: uuidv4(),
        type: "abort",
        textResponse: null,
        sources: [],
        close: true,
        error: "Message is empty.",
      });
      return;
    }

    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();

    if (multiUserMode(response) && !(await User.canSendChat(user))) {
      writeResponseChunk(response, {
        id: uuidv4(),
        type: "abort",
        textResponse: null,
        sources: [],
        close: true,
        error: `You have met your maximum 24 hour chat quota of ${user.dailyMessageLimit} chats. Try again later.`,
      });
      return;
    }

    await streamChatWithWorkspace(
      response,
      workspace,
      message,
      workspace?.chatMode,
      user,
      thread,
      attachments
    );

    if (thread) {
      // If thread was renamed emit event to frontend via special `action` response.
      await WorkspaceThread.autoRenameThread({
        thread,
        workspace,
        user,
        prompt: message,
        onRename: (renamed) => {
          writeResponseChunk(response, {
            action: "rename_thread",
            thread: {
              slug: renamed.slug,
              name: renamed.name,
            },
          });
        },
      });
    }

    await Telemetry.sendTelemetry("sent_chat", {
      multiUserMode: multiUserMode(response),
      LLMSelection: process.env.LLM_PROVIDER || "openai",
      Embedder: process.env.EMBEDDING_ENGINE || "inherit",
      VectorDbSelection: process.env.VECTOR_DB || "lancedb",
      multiModal: Array.isArray(attachments) && attachments?.length !== 0,
      TTSSelection: process.env.TTS_PROVIDER || "native",
      LLMModel: getModelTag(),
    });

    await EventLogs.logEvent(
      "sent_chat",
      {
        workspaceName: workspace?.name,
        ...(thread ? { thread: thread.name } : {}),
        chatModel: workspace?.chatModel || "System Default",
      },
      user?.id
    );
    response.end();
  } catch (e) {
    console.error(e);
    writeResponseChunk(response, {
      id: uuidv4(),
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: e.message,
    });
    response.end();
  }
}

function chatEndpoints(app) {
  if (!app) return;

  app.post(
    "/workspace/:slug/stream-chat",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => handleStreamChat(request, response, null)
  );

  app.post(
    "/workspace/:slug/thread/:threadSlug/stream-chat",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) =>
      handleStreamChat(request, response, response.locals.thread)
  );
}

module.exports = { chatEndpoints };
