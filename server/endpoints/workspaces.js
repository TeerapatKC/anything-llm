const { reqBody, userFromSession, safeJsonParse } = require("../utils/http");
const { moveProcessedDocsToFolder } = require("../utils/files");
const { Workspace } = require("../models/workspace");
const { PersonalWorkspace } = require("../models/personalWorkspace");
const { Document } = require("../models/documents");
const { DocumentFolder } = require("../models/documentFolders");
const { DocumentVectors } = require("../models/vectors");
const { WorkspaceChats } = require("../models/workspaceChats");
const { getVectorDbClass, stripThinkingFromText } = require("../utils/helpers");
const { handleFileUpload } = require("../utils/files/multer");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  userPermissionValid,
  workspacePermissionValid,
  anyWorkspacePermissionValid,
} = require("../utils/middleware/authorizedRequest");
const {
  PERMISSIONS,
  WORKSPACE_PERMISSIONS: WS_PERMISSIONS,
} = require("../utils/permissions");
const { EventLogs } = require("../models/eventLogs");
const {
  WorkspaceSuggestedMessages,
} = require("../models/workspacesSuggestedMessages");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");
const { convertToChatHistory } = require("../utils/helpers/chat/responses");
const { CollectorApi } = require("../utils/collectorApi");
const { getTTSProvider } = require("../utils/TextToSpeech");
const { messageToSpeech } = require("../utils/TextToSpeech/messageToSpeech");
const { getAudioFileInfo } = require("../utils/TextToSpeech/audioFormat");
const { WorkspaceThread } = require("../models/workspaceThread");
const { SlashCommandPresets } = require("../models/slashCommandsPresets");
const { VALID_COMMANDS } = require("../utils/chats");
const { ScheduledJob } = require("../models/scheduledJob");
const { ScheduledJobRun } = require("../models/scheduledJobRun");
const { ScheduledJobLog } = require("../models/scheduledJobLog");
const { BackgroundService } = require("../utils/BackgroundWorkers");
const { requireSmtpReady } = require("../utils/smtp");
const { exportRows, dateRangeClause } = require("../utils/helpers/exportTable");
const {
  scheduledJobRunToRow,
  SCHEDULED_JOB_LOG_HEADERS,
} = require("../utils/helpers/scheduledJobExport");

const truncate = require("truncate");
const { purgeDocument } = require("../utils/files/purgeDocument");
const { searchWorkspaceAndThreads } = require("../utils/helpers/search");
const { workspaceParsedFilesEndpoints } = require("./workspacesParsedFiles");
const {
  workspaceDeletionProtection,
} = require("../utils/middleware/workspaceDeletionProtection");

// BackgroundService is a singleton, so `new BackgroundService()` anywhere in
// the codebase returns the same instance that `server/index.js` booted. We
// grab that reference once and reuse it across handlers.
const backgroundService = new BackgroundService();

function workspaceEndpoints(app) {
  if (!app) return;
  const responseCache = new Map();

  app.post(
    "/workspace/new",
    [validatedRequest, userPermissionValid([PERMISSIONS.WORKSPACES_CREATE])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name = null } = reqBody(request);
        const { workspace, message } = await Workspace.new(name, user?.id);

        await EventLogs.logEvent(
          "workspace_created",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          user?.id
        );
        response.status(200).json({ workspace, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * What the caller may do about private workspaces: whether the instance hands them
   * out at all, how many they may have, and how many they already own. The sidebar
   * needs this to decide whether to offer a "new private workspace" button.
   */
  app.get(
    "/workspace/personal/policy",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const profile = await PersonalWorkspace.profile();
        const owned = await PersonalWorkspace.countFor(user?.id);
        response.status(200).json({
          enabled: profile.enabled,
          quotaPerUser: profile.quotaPerUser,
          owned,
          canCreate: profile.enabled && owned < profile.quotaPerUser,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * Create a private workspace for the caller. Deliberately not the `/workspace/new`
   * route: that one creates shared workspaces and is gated on `workspaces.create`,
   * while this one is available to anyone the instance's private workspace policy
   * allows, and refuses once they are at their quota.
   */
  app.post(
    "/workspace/personal/new",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name = null } = reqBody(request);
        const { workspace, message } = await PersonalWorkspace.create(
          user,
          name
        );
        response.status(workspace ? 200 : 400).json({ workspace, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * Rename a workspace, and nothing else.
   *
   * A private workspace has no settings screen, so this is how its owner names it -
   * which is why the gate is the narrow `workspace.rename` rather than the settings
   * permission that would open every other screen with it. Anyone who can edit the
   * general settings holds this too, by implication.
   */
  app.post(
    "/workspace/:slug/rename",
    [validatedRequest, workspacePermissionValid([WS_PERMISSIONS.RENAME])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const { name = null } = reqBody(request);
        const currWorkspace = await Workspace.getWithUser(user, { slug });
        if (!currWorkspace) return response.sendStatus(404).end();
        if (!name || !String(name).trim())
          return response
            .status(400)
            .json({ workspace: null, message: "A name is required." });

        const { workspace, message } = await Workspace.update(
          currWorkspace.id,
          { name: String(name) }
        );
        await EventLogs.logEvent(
          "workspace_renamed",
          { from: currWorkspace.name, to: workspace?.name ?? name },
          user?.id
        );
        response.status(200).json({ workspace, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/update",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const data = reqBody(request);
        const currWorkspace = await Workspace.getWithUser(user, { slug });

        if (!currWorkspace) {
          response.sendStatus(400).end();
          return;
        }

        await Workspace.trackChange(currWorkspace, data, user);
        const { workspace, message } = await Workspace.update(
          currWorkspace.id,
          data
        );
        response.status(200).json({ workspace, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/upload",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DOCUMENTS_UPLOAD]),
      handleFileUpload,
    ],
    async function (request, response) {
      try {
        const Collector = new CollectorApi();
        const { originalname } = request.file;

        // Multipart field order matters: multer only exposes text fields on
        // request.body that were appended BEFORE the file part, so the client
        // must append folderName/metadata first. See FileUploadProgress.
        const { folderName = null, metadata: _metadata = "{}" } =
          reqBody(request);

        const metadata =
          typeof _metadata === "string"
            ? safeJsonParse(_metadata, {})
            : _metadata;

        const processingOnline = await Collector.online();

        if (!processingOnline) {
          response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Document ${originalname} will not be processed automatically.`,
            })
            .end();
          return;
        }

        const { success, reason, documents } = await Collector.processDocument(
          originalname,
          metadata
        );
        if (!success) {
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        // The collector always writes into custom-documents - it cannot be told
        // where to put a file - so every upload is moved out of that staging
        // area here. Without a named folder that means the uploader's own
        // private folder, which is what keeps an untargeted upload from
        // landing somewhere the whole instance can see.
        const destination =
          folderName ||
          (await DocumentFolder.privateFolderFor(response.locals?.user));
        if (!!destination) moveProcessedDocsToFolder(documents, destination);

        Collector.log(
          `Document ${originalname} uploaded processed and successfully. It is now available in documents.`
        );
        await EventLogs.logEvent(
          "document_uploaded",
          {
            documentName: originalname,
            ...(folderName ? { folder: folderName } : {}),
          },
          response.locals?.user?.id
        );
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/upload-link",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DOCUMENTS_UPLOAD]),
    ],
    async (request, response) => {
      try {
        const Collector = new CollectorApi();
        const { link = "" } = reqBody(request);
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Link ${link} will not be processed automatically.`,
            })
            .end();
          return;
        }

        const {
          success,
          reason,
          documents = [],
        } = await Collector.processLink(link);
        if (!success) {
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        // A scraped link lands in the same staging folder an upload does, so
        // it has to be drained the same way or it stays instance-visible.
        const destination = await DocumentFolder.privateFolderFor(
          response.locals?.user
        );
        if (!!destination) moveProcessedDocsToFolder(documents, destination);

        Collector.log(
          `Link ${link} uploaded processed and successfully. It is now available in documents.`
        );
        await EventLogs.logEvent(
          "link_uploaded",
          { link },
          response.locals?.user?.id
        );
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/update-embeddings",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DOCUMENTS_MANAGE]),
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const { adds = [], deletes = [] } = reqBody(request);
        const currWorkspace = await Workspace.getWithUser(user, { slug });

        if (!currWorkspace) {
          response.sendStatus(400).end();
          return;
        }

        await Document.removeDocuments(
          currWorkspace,
          deletes,
          response.locals?.user?.id
        );

        const {
          isNativeEmbedder,
          embedFiles,
        } = require("../utils/EmbeddingWorkerManager");

        if (isNativeEmbedder() && adds.length > 0) {
          await embedFiles(
            currWorkspace.slug,
            adds,
            currWorkspace.id,
            response.locals?.user?.id ?? null
          );
          const updatedWorkspace = await Workspace.get({
            id: currWorkspace.id,
          });
          response
            .status(200)
            .json({ workspace: updatedWorkspace, message: null });
          return;
        }

        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          currWorkspace,
          adds,
          response.locals?.user?.id
        );
        const updatedWorkspace = await Workspace.get({ id: currWorkspace.id });
        response.status(200).json({
          workspace: updatedWorkspace,
          message:
            failedToEmbed.length > 0
              ? `${failedToEmbed.length} documents failed to add.\n\n${errors
                  .map((msg) => `${msg}`)
                  .join("\n\n")}`
              : null,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DELETE]),
      workspaceDeletionProtection,
    ],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const workspace = await Workspace.getWithUser(user, { slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        await Workspace.purge(workspace);

        await EventLogs.logEvent(
          "workspace_deleted",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          response.locals?.user?.id
        );

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/reset-vector-db",
    [validatedRequest, workspacePermissionValid([WS_PERMISSIONS.DELETE])],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const VectorDb = getVectorDbClass();
        const workspace = await Workspace.getWithUser(user, { slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        await DocumentVectors.deleteForWorkspace(workspace.id);
        await Document.delete({ workspaceId: Number(workspace.id) });

        await EventLogs.logEvent(
          "workspace_vectors_reset",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          response.locals?.user?.id
        );

        try {
          await VectorDb["delete-namespace"]({ namespace: slug });
        } catch (e) {
          console.error(e.message);
        }
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspaces",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        // Where everyone gets the private workspace the instance policy entitles them
        // to. Doing it on the listing rather than only at sign-up means accounts that
        // predate the feature - and ones created through SSO, an invite or the
        // developer API - are covered too, without a migration or a boot-time sweep.
        // It is a no-op once they have one.
        await PersonalWorkspace.provisionFor(user);
        const workspaces = await Workspace.whereWithUser(user);

        response.status(200).json({ workspaces });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug",
    // Reading a workspace needs VIEW, not DELETE. This route sat directly below
    // `app.delete("/workspace/:slug")` and had inherited its gate, so every role
    // that could not delete the workspace - member, contributor, and any
    // custom role without `workspace.delete` - got a 401 just opening it.
    [validatedRequest, workspacePermissionValid([WS_PERMISSIONS.VIEW])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const workspace = await Workspace.getWithUser(user, { slug });

        response.status(200).json({ workspace });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/chats",
    [validatedRequest, workspacePermissionValid([WS_PERMISSIONS.VIEW])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const workspace = await Workspace.getWithUser(user, { slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        const history = await WorkspaceChats.forWorkspaceByUser(
          workspace.id,
          user.id
        );
        response.status(200).json({ history: convertToChatHistory(history) });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // Returns the catalog of skills that can be toggled for this workspace plus the
  // workspace's currently effective config. A workspace that has never been
  // configured resolves to the instance-wide defaults, so the UI always renders a
  // concrete selection rather than an empty state.
  app.get(
    "/workspace/:slug/agent-skills",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.AGENTS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const {
          agentSkillsPayload,
        } = require("../utils/agents/agentSkillsPayload");
        response
          .status(200)
          .json(await agentSkillsPayload(response.locals.workspace));
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/delete-chats",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.CHATS_DELETE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { chatIds = [] } = reqBody(request);
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        if (!workspace || !Array.isArray(chatIds)) {
          response.sendStatus(400).end();
          return;
        }

        // This works for both workspace and threads.
        // we simplify this by just looking at workspace<>user overlap
        // since they are all on the same table.
        await WorkspaceChats.delete({
          id: { in: chatIds.map((id) => Number(id)) },
          user_id: user?.id ?? null,
          workspaceId: workspace.id,
        });

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/delete-edited-chats",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.CHATS_DELETE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { startingId } = reqBody(request);
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        await WorkspaceChats.delete({
          workspaceId: workspace.id,
          thread_id: null,
          user_id: user?.id,
          id: { gte: Number(startingId) },
        });

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/update-chat",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.CHAT]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { chatId, newText = null, role = "assistant" } = reqBody(request);
        if (!newText || !String(newText).trim())
          throw new Error("Cannot save empty edit");

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const existingChat = await WorkspaceChats.get({
          workspaceId: workspace.id,
          thread_id: null,
          user_id: user?.id,
          id: Number(chatId),
        });
        if (!existingChat) throw new Error("Invalid chat.");

        if (role === "user") {
          await WorkspaceChats._update(existingChat.id, {
            prompt: String(newText),
          });
        } else {
          const chatResponse = safeJsonParse(existingChat.response, null);
          if (!chatResponse) throw new Error("Failed to parse chat response");
          await WorkspaceChats._update(existingChat.id, {
            response: JSON.stringify({
              ...chatResponse,
              text: String(newText),
            }),
          });
        }

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/chat-feedback/:chatId",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.VIEW]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { chatId } = request.params;
        const { feedback = null, comment = undefined } = reqBody(request);
        const user = await userFromSession(request, response);
        const existingChat = await WorkspaceChats.get({
          id: Number(chatId),
          workspaceId: response.locals.workspace.id,
          user_id: user?.id,
        });

        if (!existingChat) return response.status(404).json({ success: false });
        await WorkspaceChats.updateFeedbackScore(
          chatId,
          feedback,
          // Capped rather than rejected: a reader who typed an essay should not
          // lose the rating over it.
          comment === undefined
            ? undefined
            : String(comment ?? "").slice(0, 1000)
        );
        return response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error updating chat feedback:", error);
        response.status(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/suggested-messages",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
      validWorkspaceSlug,
    ],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const suggestedMessages =
          await WorkspaceSuggestedMessages.getMessages(slug);
        response.status(200).json({ success: true, suggestedMessages });
      } catch (error) {
        console.error("Error fetching suggested messages:", error);
        response
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    }
  );

  app.post(
    "/workspace/:slug/suggested-messages",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
    ],
    async (request, response) => {
      try {
        const { messages = [] } = reqBody(request);
        const { slug } = request.params;
        if (!Array.isArray(messages)) {
          return response.status(400).json({
            success: false,
            message: "Invalid message format. Expected an array of messages.",
          });
        }

        await WorkspaceSuggestedMessages.saveAll(messages, slug);
        return response.status(200).json({
          success: true,
          message: "Suggested messages saved successfully.",
        });
      } catch (error) {
        console.error("Error processing the suggested messages:", error);
        response.status(500).json({
          success: true,
          message: "Error saving the suggested messages.",
        });
      }
    }
  );

  app.post(
    "/workspace/:slug/update-pin",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DOCUMENTS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { docPath, pinStatus = false } = reqBody(request);
        const workspace = response.locals.workspace;

        const document = await Document.get({
          workspaceId: workspace.id,
          docpath: docPath,
        });
        if (!document) return response.sendStatus(404).end();

        await Document.update(document.id, { pinned: pinStatus });
        return response.status(200).end();
      } catch (error) {
        console.error("Error processing the pin status update:", error);
        return response.status(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/tts/:chatId",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.VIEW]),
      validWorkspaceSlug,
    ],
    async function (request, response) {
      try {
        const { chatId } = request.params;
        const workspace = response.locals.workspace;
        const user = await userFromSession(request, response);
        const cacheKey = `${workspace.slug}:${chatId}`;
        const wsChat = await WorkspaceChats.get({
          id: Number(chatId),
          workspaceId: workspace.id,
          user_id: user?.id,
        });

        if (!wsChat) return response.sendStatus(404);
        const cachedResponse = responseCache.get(cacheKey);
        if (cachedResponse) {
          response.writeHead(200, {
            "Content-Type": cachedResponse.mime || "audio/mpeg",
          });
          response.end(cachedResponse.buffer);
          return;
        }

        // The stored response is raw model output - strip the reasoning block and
        // Markdown so the engine speaks the answer only. See messageToSpeech.
        const text = messageToSpeech(
          safeJsonParse(wsChat.response, null)?.text
        );
        if (!text) return response.sendStatus(204).end();

        const TTSProvider = getTTSProvider();
        const buffer = await TTSProvider.ttsBuffer(text);
        if (buffer === null) return response.sendStatus(204).end();

        const { mime } = getAudioFileInfo(buffer);
        responseCache.set(cacheKey, { buffer, mime });
        response.writeHead(200, {
          "Content-Type": mime,
        });
        response.end(buffer);
        return;
      } catch (error) {
        console.error("Error processing the TTS request:", error);
        response.status(500).json({ message: "TTS could not be completed" });
      }
    }
  );

  app.post(
    "/workspace/:slug/thread/fork",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.THREADS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { chatId, threadSlug } = reqBody(request);
        if (!chatId)
          return response.status(400).json({ message: "chatId is required" });

        // Get threadId we are branching from if that request body is sent
        // and is a valid thread slug.
        const threadId = !!threadSlug
          ? (
              await WorkspaceThread.get({
                slug: String(threadSlug),
                workspace_id: workspace.id,
              })
            )?.id ?? null
          : null;
        const chatsToFork = await WorkspaceChats.where(
          {
            workspaceId: workspace.id,
            user_id: user?.id,
            include: true, // only duplicate visible chats
            thread_id: threadId,
            api_session_id: null, // Do not include API session chats.
            id: { lte: Number(chatId) },
          },
          null,
          { id: "asc" }
        );

        const { thread: newThread, message: threadError } =
          await WorkspaceThread.new(workspace, user?.id);
        if (threadError)
          return response.status(500).json({ error: threadError });

        let lastMessageText = "";
        const chatsData = chatsToFork.map((chat) => {
          const chatResponse = safeJsonParse(chat.response, {});
          if (chatResponse?.text)
            lastMessageText = stripThinkingFromText(chatResponse.text);

          return {
            workspaceId: workspace.id,
            prompt: chat.prompt,
            response: JSON.stringify(chatResponse),
            user_id: user?.id,
            thread_id: newThread.id,
          };
        });
        await WorkspaceChats.bulkCreate(chatsData);
        await WorkspaceThread.update(newThread, {
          name: !!lastMessageText
            ? truncate(lastMessageText, 60)
            : "Forked Thread",
        });

        await EventLogs.logEvent(
          "thread_forked",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
            threadName: newThread.name,
          },
          user?.id
        );
        response.status(200).json({ newThreadSlug: newThread.slug });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(
    "/workspace/workspace-chats/:id",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const user = await userFromSession(request, response);
        const validChat = await WorkspaceChats.get({
          id: Number(id),
          user_id: user?.id ?? null,
        });
        if (!validChat)
          return response
            .status(404)
            .json({ success: false, error: "Chat not found." });

        await WorkspaceChats._update(validChat.id, { include: false });
        response.json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ success: false, error: "Server error" });
      }
    }
  );

  /** Handles the uploading and embedding in one-call by uploading via drag-and-drop in chat container. */
  app.post(
    "/workspace/:slug/upload-and-embed",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DOCUMENTS_UPLOAD]),
      handleFileUpload,
    ],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const user = await userFromSession(request, response);
        const currWorkspace = await Workspace.getWithUser(user, { slug });

        if (!currWorkspace) {
          response.sendStatus(400).end();
          return;
        }

        const Collector = new CollectorApi();
        const { originalname } = request.file;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Document ${originalname} will not be processed automatically.`,
            })
            .end();
          return;
        }

        const { success, reason, documents } =
          await Collector.processDocument(originalname);
        if (!success || documents?.length === 0) {
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        Collector.log(
          `Document ${originalname} uploaded processed and successfully. It is now available in documents.`
        );
        await EventLogs.logEvent(
          "document_uploaded",
          {
            documentName: originalname,
          },
          response.locals?.user?.id
        );

        const document = documents[0];
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          currWorkspace,
          [document.location],
          response.locals?.user?.id
        );

        if (failedToEmbed.length > 0)
          return response
            .status(200)
            .json({ success: false, error: errors?.[0], document: null });

        response.status(200).json({
          success: true,
          error: null,
          document: { id: document.id, location: document.location },
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/remove-and-unembed",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DOCUMENTS_MANAGE]),
      handleFileUpload,
    ],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const body = reqBody(request);
        const user = await userFromSession(request, response);
        const currWorkspace = await Workspace.getWithUser(user, { slug });

        if (!currWorkspace || !body.documentLocation)
          return response.sendStatus(400).end();

        // Will delete the document from the entire system + wil unembed it.
        await purgeDocument(body.documentLocation);
        response.status(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/prompt-history",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (_, response) => {
      try {
        response.status(200).json({
          history: await Workspace.promptHistory({
            workspaceId: response.locals.workspace.id,
          }),
        });
      } catch (error) {
        console.error("Error fetching prompt history:", error);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/prompt-history",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (_, response) => {
      try {
        response.status(200).json({
          success: await Workspace.deleteAllPromptHistory({
            workspaceId: response.locals.workspace.id,
          }),
        });
      } catch (error) {
        console.error("Error clearing prompt history:", error);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/prompt-history/:id",
    [
      validatedRequest,
      // ":id" identifies a prompt-history row rather than a workspace, so the target
      // workspace cannot be resolved from the URL - require the permission somewhere.
      anyWorkspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { id } = request.params;
        response.status(200).json({
          success: await Workspace.deletePromptHistory({
            workspaceId: response.locals.workspace.id,
            id: Number(id),
          }),
        });
      } catch (error) {
        console.error("Error deleting prompt history:", error);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * Searches for workspaces and threads by thread name or workspace name.
   * Only returns assets owned by the requesting user.
   */
  app.post(
    "/workspace/search",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const { searchTerm } = reqBody(request);
        const searchResults = await searchWorkspaceAndThreads(
          searchTerm,
          response.locals?.user
        );
        response.status(200).json(searchResults);
      } catch (error) {
        console.error("Error searching for workspaces:", error);
        response.sendStatus(500).end();
      }
    }
  );

  // SSE endpoint for embedding progress
  app.get(
    "/workspace/:slug/embed-progress",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DOCUMENTS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const {
          addSSEConnection,
          removeSSEConnection,
        } = require("../utils/EmbeddingWorkerManager");

        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();
        addSSEConnection(workspace.slug, response);
        request.on("close", () => {
          removeSSEConnection(workspace.slug, response);
        });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/embed-queue",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DOCUMENTS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { filename } = reqBody(request);
        if (!filename) {
          response
            .status(400)
            .json({ success: false, error: "Missing filename" });
          return;
        }

        const { removeQueuedFile } = require("../utils/EmbeddingWorkerManager");
        const sent = removeQueuedFile(workspace.slug, filename);
        response.status(200).json({ success: sent });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ success: false, error: e.message });
      }
    }
  );

  app.get(
    "/workspace/:slug/is-agent-command-available",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.VIEW]),
      validWorkspaceSlug,
    ],
    async (_, response) => {
      try {
        response.status(200).json({
          showAgentCommand: await Workspace.isAgentCommandAvailable(
            response.locals.workspace
          ),
        });
      } catch (error) {
        console.error("Error checking if agent command is available:", error);
        // Capability detection is best-effort. If a provider cannot be
        // inspected, keep the explicit @agent command available instead of
        // turning workspace loading into a failed API request.
        response.status(200).json({ showAgentCommand: true });
      }
    }
  );

  /**
   * Everything runnable in this workspace: its own commands plus the instance-wide
   * built-ins. This is what the chat prompt menu reads, so it is open to anyone who
   * can chat here - only the write routes below require settings rights.
   */
  app.get(
    "/workspace/:slug/slash-command-presets",
    [validatedRequest, validWorkspaceSlug],
    async (_request, response) => {
      try {
        const presets = await SlashCommandPresets.forWorkspace(
          response.locals.workspace.id
        );
        response.status(200).json({ presets });
      } catch (error) {
        console.error("Error fetching workspace slash commands:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  /** Only the workspace's own commands - what its settings screen lists and edits. */
  app.get(
    "/workspace/:slug/slash-command-presets/owned",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (_request, response) => {
      try {
        const presets = await SlashCommandPresets.ownedByWorkspace(
          response.locals.workspace.id
        );
        response.status(200).json({ presets });
      } catch (error) {
        console.error("Error fetching workspace-owned slash commands:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/workspace/:slug/slash-command-presets",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { command, prompt, description } = reqBody(request);
        const formattedCommand = SlashCommandPresets.formatCommand(
          String(command)
        );

        if (Object.keys(VALID_COMMANDS).includes(formattedCommand)) {
          return response.status(400).json({
            message:
              "Cannot create a preset with a command that matches a system command",
          });
        }

        const preset = await SlashCommandPresets.create(
          {
            command: formattedCommand,
            prompt: String(prompt),
            description: String(description),
          },
          { workspaceId: workspace.id, userId: user?.id ?? null }
        );
        if (!preset)
          return response
            .status(500)
            .json({ message: "Failed to create preset" });
        response
          .status(201)
          .json({ preset: SlashCommandPresets.toPublic(preset) });
      } catch (error) {
        console.error("Error creating workspace slash command:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/workspace/:slug/slash-command-presets/:slashCommandId",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { slashCommandId } = request.params;
        const { command, prompt, description } = reqBody(request);
        const formattedCommand = SlashCommandPresets.formatCommand(
          String(command)
        );

        if (Object.keys(VALID_COMMANDS).includes(formattedCommand)) {
          return response.status(400).json({
            message:
              "Cannot update a preset to use a command that matches a system command",
          });
        }

        // Scoped to this workspace so a manager cannot reach a built-in, or another
        // workspace's command, by guessing an id.
        const existing = await SlashCommandPresets.get({
          id: Number(slashCommandId),
          workspaceId: workspace.id,
        });
        if (!existing)
          return response.status(404).json({ message: "Preset not found" });

        const updates = {
          command: formattedCommand,
          prompt: String(prompt),
          description: String(description),
        };
        const preset = await SlashCommandPresets.update(
          Number(slashCommandId),
          updates
        );
        if (!preset) return response.sendStatus(422);
        response
          .status(200)
          .json({ preset: SlashCommandPresets.toPublic(preset) });
      } catch (error) {
        console.error("Error updating workspace slash command:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.delete(
    "/workspace/:slug/slash-command-presets/:slashCommandId",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SETTINGS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { slashCommandId } = request.params;
        const existing = await SlashCommandPresets.get({
          id: Number(slashCommandId),
          workspaceId: workspace.id,
        });
        if (!existing)
          return response.status(404).json({ message: "Preset not found" });

        await SlashCommandPresets.delete(Number(slashCommandId));
        response.sendStatus(204);
      } catch (error) {
        console.error("Error deleting workspace slash command:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  /**
   * Agent flows a workspace owns.
   *
   * These are separate from the instance-wide flows at /agent-flows/*: a flow created
   * here belongs to this workspace, is usable nowhere else, and is not offered to the
   * admin "visible to workspaces" sharing UI. Global flows are deliberately not
   * editable through these routes - a workspace manager may build their own, not
   * rewrite an instance-wide one that other workspaces depend on.
   */

  /**
   * Resolve a flow that this workspace is allowed to edit, or answer 404.
   *
   * 404 rather than 403 on a wrong owner is intentional: a workspace manager should not
   * be able to probe uuids to learn which flows exist elsewhere on the instance.
   * @returns {{name: string, uuid: string, config: object}|null}
   */
  function ownedFlowOr404(uuid, workspace, response) {
    const { AgentFlows } = require("../utils/agentFlows");
    const flow = AgentFlows.loadFlow(uuid);
    if (!flow || AgentFlows.flowOwner(uuid) !== workspace.id) {
      response.status(404).json({ success: false, error: "Flow not found" });
      return null;
    }
    return flow;
  }

  app.get(
    "/workspace/:slug/agent-flows",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.AGENT_FLOWS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (_request, response) => {
      try {
        const { AgentFlows } = require("../utils/agentFlows");
        const flows = AgentFlows.ownedByWorkspace(response.locals.workspace.id);
        response.status(200).json({ success: true, flows });
      } catch (error) {
        console.error("Error listing workspace agent flows:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.get(
    "/workspace/:slug/agent-flows/:uuid",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.AGENT_FLOWS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const flow = ownedFlowOr404(
          request.params.uuid,
          response.locals.workspace,
          response
        );
        if (!flow) return;
        response.status(200).json({ success: true, flow });
      } catch (error) {
        console.error("Error loading workspace agent flow:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/agent-flows",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.AGENT_FLOWS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { AgentFlows } = require("../utils/agentFlows");
        const workspace = response.locals.workspace;
        const { name, config } = reqBody(request);
        if (!name || !config?.steps)
          return response
            .status(400)
            .json({ success: false, error: "A name and steps are required" });

        // Ownership comes from the resolved workspace, never from the payload.
        const result = AgentFlows.saveFlow(String(name), config, null, {
          workspaceId: workspace.id,
        });
        if (!result?.success)
          return response.status(500).json({
            success: false,
            error: result?.error ?? "Failed to save flow",
          });
        // Envelope matches POST /agent-flows/save so the shared builder reads both the
        // same way.
        response.status(200).json({ success: true, flow: result });
      } catch (error) {
        console.error("Error creating workspace agent flow:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/agent-flows/:uuid",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.AGENT_FLOWS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { AgentFlows } = require("../utils/agentFlows");
        const { uuid } = request.params;
        if (!ownedFlowOr404(uuid, response.locals.workspace, response)) return;

        const { name, config } = reqBody(request);
        if (!name || !config?.steps)
          return response
            .status(400)
            .json({ success: false, error: "A name and steps are required" });

        const result = AgentFlows.saveFlow(String(name), config, uuid);
        if (!result?.success)
          return response.status(500).json({
            success: false,
            error: result?.error ?? "Failed to save flow",
          });
        response.status(200).json({ success: true, flow: result });
      } catch (error) {
        console.error("Error updating workspace agent flow:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/agent-flows/:uuid/toggle",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.AGENT_FLOWS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { AgentFlows } = require("../utils/agentFlows");
        const { uuid } = request.params;
        const flow = ownedFlowOr404(uuid, response.locals.workspace, response);
        if (!flow) return;

        const { active } = reqBody(request);
        const result = AgentFlows.saveFlow(
          flow.name,
          { ...flow.config, active: Boolean(active) },
          uuid
        );
        if (!result?.success)
          return response.status(500).json({
            success: false,
            error: result?.error ?? "Failed to toggle flow",
          });
        response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error toggling workspace agent flow:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.delete(
    "/workspace/:slug/agent-flows/:uuid",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.AGENT_FLOWS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { AgentFlows } = require("../utils/agentFlows");
        const { uuid } = request.params;
        if (!ownedFlowOr404(uuid, response.locals.workspace, response)) return;

        const { success, error } = AgentFlows.deleteFlow(uuid);
        if (!success)
          return response
            .status(500)
            .json({ success: false, error: error ?? "Failed to delete flow" });
        response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error deleting workspace agent flow:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Parsed Files in separate endpoint just to keep the workspace endpoints clean
  /**
   * SQL connections a workspace owns.
   *
   * Mirrors the agent-flow routes above. Global connections an admin shared in are
   * usable by this workspace's agent but are never editable here, and their
   * `connectionString` - which carries a database username and password in plain text -
   * is never sent to a workspace screen at all.
   */

  /**
   * Resolve a connection this workspace owns, or answer 404. Same reasoning as the
   * flow guard: a wrong owner is indistinguishable from "does not exist", so a
   * workspace manager cannot probe for connections configured elsewhere.
   */
  async function ownedConnectionOr404(databaseId, workspace, response) {
    const {
      sqlConnectionsOwnedByWorkspace,
    } = require("../utils/agents/aibitat/plugins/sql-agent/SQLConnectors");
    const owned = await sqlConnectionsOwnedByWorkspace(workspace.id);
    const connection = owned.find((conn) => conn.database_id === databaseId);
    if (!connection) {
      response
        .status(404)
        .json({ success: false, error: "Connection not found" });
      return null;
    }
    return connection;
  }

  /** Persist a set of `mergeConnections` actions against the instance-wide setting. */
  async function applyConnectionUpdates(updates = []) {
    const { SystemSettings } = require("../models/systemSettings");
    return SystemSettings.updateSettings({
      agent_sql_connections: JSON.stringify(updates),
    });
  }

  app.get(
    "/workspace/:slug/sql-connections",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SQL_CONNECTORS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (_request, response) => {
      try {
        const {
          sqlConnectionsAvailableTo,
          toPublic,
        } = require("../utils/agents/aibitat/plugins/sql-agent/SQLConnectors");
        const workspace = response.locals.workspace;
        const connections = (await sqlConnectionsAvailableTo(workspace.id)).map(
          (conn) => toPublic(conn, workspace.id)
        );
        response.status(200).json({ success: true, connections });
      } catch (error) {
        console.error("Error listing workspace SQL connections:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/sql-connections",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SQL_CONNECTORS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { database_id, engine, connectionString, schema } =
          reqBody(request);
        if (!database_id || !engine || !connectionString)
          return response.status(400).json({
            success: false,
            error: "A name, engine and connection string are required",
          });

        // `workspaceId` comes from the resolved workspace, never the payload.
        await applyConnectionUpdates([
          {
            action: "add",
            database_id: String(database_id),
            engine: String(engine),
            connectionString: String(connectionString),
            ...(schema ? { schema: String(schema) } : {}),
            workspaceId: workspace.id,
          },
        ]);
        response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error creating workspace SQL connection:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/sql-connections/:databaseId",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SQL_CONNECTORS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { databaseId } = request.params;
        if (!(await ownedConnectionOr404(databaseId, workspace, response)))
          return;

        const { database_id, engine, connectionString, schema } =
          reqBody(request);
        if (!database_id || !engine || !connectionString)
          return response.status(400).json({
            success: false,
            error: "A name, engine and connection string are required",
          });

        // mergeConnections keeps the stored owner on an update, so this cannot move
        // the connection out of this workspace.
        await applyConnectionUpdates([
          {
            action: "update",
            originalDatabaseId: databaseId,
            database_id: String(database_id),
            engine: String(engine),
            connectionString: String(connectionString),
            ...(schema ? { schema: String(schema) } : {}),
          },
        ]);
        response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error updating workspace SQL connection:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/sql-connections/:databaseId/toggle",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SQL_CONNECTORS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { databaseId } = request.params;
        if (!(await ownedConnectionOr404(databaseId, workspace, response)))
          return;

        const { active } = reqBody(request);
        await applyConnectionUpdates([
          { action: "toggle", database_id: databaseId, active: !!active },
        ]);
        response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error toggling workspace SQL connection:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.delete(
    "/workspace/:slug/sql-connections/:databaseId",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SQL_CONNECTORS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { databaseId } = request.params;
        if (!(await ownedConnectionOr404(databaseId, workspace, response)))
          return;

        await applyConnectionUpdates([
          { action: "remove", database_id: databaseId },
        ]);
        response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error deleting workspace SQL connection:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  /**
   * MCP servers a workspace owns.
   *
   * Mirrors the SQL connection routes above, and for the same reason: a server added
   * here belongs to this workspace, is usable by nobody else, and its HTTP headers -
   * which carry the bearer token for the service behind it - never reach a screen
   * outside it. Servers an admin shared in instance-wide are listed so they can be
   * switched on, but are not editable here.
   *
   * Only network servers can be managed from a workspace. A command-line (stdio)
   * server starts a process inside the application container, so adding one of those
   * stays with the instance administrator.
   */

  /**
   * Resolve an MCP server this workspace owns, or answer 404. Same reasoning as the
   * flow and SQL connection guards: a wrong owner is indistinguishable from "does not
   * exist", so a workspace manager cannot probe for servers configured elsewhere.
   */
  function ownedMCPServerOr404(name, workspace, response) {
    const { mcpServersOwnedByWorkspace } = require("../utils/MCP/scope");
    const server = mcpServersOwnedByWorkspace(workspace.id).find(
      (entry) => entry.name === name
    );
    if (!server) {
      response.status(404).json({ success: false, error: "Server not found" });
      return null;
    }
    return server;
  }

  app.get(
    "/workspace/:slug/mcp-servers",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.MCP_SERVERS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (_request, response) => {
      try {
        const MCPCompatibilityLayer = require("../utils/MCP");
        const { serverOwner } = require("../utils/MCP/scope");
        const workspace = response.locals.workspace;
        const servers = await new MCPCompatibilityLayer().servers({
          workspaceId: workspace.id,
        });
        response.status(200).json({
          success: true,
          servers: servers.map((server) => ({
            ...server,
            // Only the owning workspace gets the definition back - it holds the
            // credentials somebody there typed in.
            config:
              serverOwner({ server: server.config }) === null
                ? null
                : server.config,
          })),
        });
      } catch (error) {
        console.error("Error listing workspace MCP servers:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/mcp-servers",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.MCP_SERVERS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const MCPCompatibilityLayer = require("../utils/MCP");
        const {
          normalizeRemoteMCPServer,
        } = require("../utils/MCP/remoteServerConfig");
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { name, server } = normalizeRemoteMCPServer(reqBody(request));

        // The owner comes from the resolved workspace, never the payload.
        const result = await new MCPCompatibilityLayer().createRemoteServer(
          name,
          server,
          workspace.id
        );
        if (!result.success)
          return response
            .status(409)
            .json({ success: false, error: result.error, server: null });

        await EventLogs.logEvent(
          "mcp_server_created",
          {
            serverName: name,
            type: server.type,
            url: server.url,
            workspaceId: workspace.id,
          },
          user?.id
        );
        response.status(201).json(result);
      } catch (error) {
        console.error("Error creating workspace MCP server:", error);
        response
          .status(400)
          .json({ success: false, error: error.message, server: null });
      }
    }
  );

  app.post(
    "/workspace/:slug/mcp-servers/:name",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.MCP_SERVERS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const MCPCompatibilityLayer = require("../utils/MCP");
        const {
          normalizeRemoteMCPServer,
        } = require("../utils/MCP/remoteServerConfig");
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const currentName = request.params.name;
        if (!ownedMCPServerOr404(currentName, workspace, response)) return;

        const { name, server } = normalizeRemoteMCPServer(reqBody(request));
        // updateRemoteServer carries the stored owner over, so this can change where
        // the server points but never which workspace it belongs to.
        const result = await new MCPCompatibilityLayer().updateRemoteServer(
          currentName,
          name,
          server
        );
        if (!result.success)
          return response
            .status(409)
            .json({ success: false, error: result.error, server: null });

        await EventLogs.logEvent(
          "mcp_server_updated",
          {
            previousName: currentName,
            serverName: name,
            workspaceId: workspace.id,
          },
          user?.id
        );
        response.status(200).json(result);
      } catch (error) {
        console.error("Error updating workspace MCP server:", error);
        response
          .status(400)
          .json({ success: false, error: error.message, server: null });
      }
    }
  );

  app.post(
    "/workspace/:slug/mcp-servers/:name/toggle",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.MCP_SERVERS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const MCPCompatibilityLayer = require("../utils/MCP");
        const workspace = response.locals.workspace;
        const { name } = request.params;
        if (!ownedMCPServerOr404(name, workspace, response)) return;

        const result = await new MCPCompatibilityLayer().toggleServerStatus(
          name
        );
        response
          .status(200)
          .json({ success: result.success, error: result.error });
      } catch (error) {
        console.error("Error toggling workspace MCP server:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.delete(
    "/workspace/:slug/mcp-servers/:name",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.MCP_SERVERS_MANAGE]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const MCPCompatibilityLayer = require("../utils/MCP");
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { name } = request.params;
        if (!ownedMCPServerOr404(name, workspace, response)) return;

        const result = await new MCPCompatibilityLayer().deleteServer(name);
        if (!result.success)
          return response
            .status(500)
            .json({ success: false, error: result.error });

        await EventLogs.logEvent(
          "mcp_server_deleted",
          { serverName: name, workspaceId: workspace.id },
          user?.id
        );
        response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error deleting workspace MCP server:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  /**
   * Scheduled jobs a workspace owns.
   *
   * These are separate from the instance-wide jobs at /scheduled-jobs/*: a job
   * created here belongs to this workspace, and can only email results to this
   * workspace's own members (with a "select all"), not to arbitrary workspaces
   * or users elsewhere on the instance.
   */

  /**
   * Resolve a job this workspace is allowed to manage, or answer 404.
   * 404 rather than 403 on a wrong owner is intentional - same reasoning as the
   * agent flow / SQL connection routes above: a workspace manager should not be
   * able to probe ids to learn which jobs exist elsewhere on the instance.
   */
  async function ownedJobOr404(id, workspace, response) {
    const job = await ScheduledJob.get({ id: Number(id) });
    if (
      !job ||
      ScheduledJob.normalizeWorkspaceId(job.workspaceId) !== workspace.id
    ) {
      response.status(404).json({ job: null, error: "Job not found" });
      return null;
    }
    return job;
  }

  async function ownedRunOr404(runId, workspace, response) {
    const run = await ScheduledJobRun.get({ id: Number(runId) });
    if (!run) {
      response.status(404).json({ run: null, error: "Run not found" });
      return null;
    }
    const job = await ScheduledJob.get({ id: run.jobId });
    if (
      !job ||
      ScheduledJob.normalizeWorkspaceId(job.workspaceId) !== workspace.id
    ) {
      response.status(404).json({ run: null, error: "Run not found" });
      return null;
    }
    return { run, job };
  }

  /**
   * Validate a create/update payload shared by both the create and update routes
   * below. Unlike the instance-wide routes, recipientType here can only be "none"
   * or "user" - a workspace-owned job cannot notify some other workspace, and its
   * recipientUserIds must all be members of this workspace.
   * @returns {Promise<string|null>} an error message, or null if valid
   */
  async function validateWorkspaceJobPayload(workspace, body, requireCore) {
    const { name, prompt, schedule, tools, recipientType, recipientUserIds } =
      body;

    if (requireCore) {
      if (!name?.trim()) return "Name is required";
      if (!prompt?.trim()) return "Prompt is required";
      if (!schedule?.trim()) return "Schedule is required";
    }
    if (schedule !== undefined && !ScheduledJob.isValidCron(schedule))
      return "Invalid cron expression";
    if (tools?.length > 0 && !Array.isArray(tools))
      return "Tools must be an array";
    if (recipientType !== undefined) {
      if (!["none", "user"].includes(recipientType))
        return "Invalid recipient type";
      if (recipientType === "user") {
        if (!Array.isArray(recipientUserIds))
          return "Recipient users must be an array";
        const members = await ScheduledJob.workspaceMembers(workspace.id);
        const memberIds = new Set(members.map((m) => m.id));
        if (recipientUserIds.some((id) => !memberIds.has(Number(id))))
          return "Recipients must be members of this workspace";
      }
    }
    return null;
  }

  app.get(
    "/workspace/:slug/scheduled-jobs/available-tools",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (_request, response) => {
      try {
        const tools = await ScheduledJob.availableTools();
        response.status(200).json({ tools });
      } catch (error) {
        console.error("Error listing available tools:", error);
        response.status(500).json({ tools: [] });
      }
    }
  );

  app.get(
    "/workspace/:slug/scheduled-jobs/members",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (_request, response) => {
      try {
        const members = await ScheduledJob.workspaceMembers(
          response.locals.workspace.id
        );
        response.status(200).json({ members });
      } catch (error) {
        console.error("Error listing workspace members:", error);
        response.status(500).json({ members: [] });
      }
    }
  );

  app.get(
    "/workspace/:slug/scheduled-jobs",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (_request, response) => {
      try {
        const jobs = await ScheduledJob.ownedByWorkspace(
          response.locals.workspace.id,
          null,
          null,
          { runs: { take: 1, orderBy: { startedAt: "desc" } } }
        );
        const jobsWithStatus = jobs.map(({ runs, ...job }) => ({
          ...job,
          latestRun: runs[0] || null,
        }));
        response.status(200).json({ jobs: jobsWithStatus });
      } catch (error) {
        console.error("Error listing workspace scheduled jobs:", error);
        response.status(500).json({ jobs: [] });
      }
    }
  );

  app.post(
    "/workspace/:slug/scheduled-jobs",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const body = reqBody(request);
        const errorMessage = await validateWorkspaceJobPayload(
          workspace,
          body,
          true
        );
        if (errorMessage)
          return response.status(400).json({ job: null, error: errorMessage });

        const activation = await ScheduledJob.canActivate();
        if (!activation.allowed) {
          return response.status(400).json({
            job: null,
            error: `Cannot create: maximum of ${activation.limit} active scheduled jobs reached. Disable another job first.`,
          });
        }

        // Ownership comes from the resolved workspace, never from the payload.
        const { job, error } = await ScheduledJob.create({
          name: body.name.trim(),
          prompt: body.prompt.trim(),
          tools: body.tools || null,
          schedule: body.schedule.trim(),
          recipientType: body.recipientType || "none",
          recipientUserIds:
            body.recipientType === "user" ? body.recipientUserIds : null,
          workspaceId: workspace.id,
        });
        if (error) return response.status(400).json({ job: null, error });

        backgroundService.addScheduledJob(job);
        await EventLogs.logEvent(
          "scheduled_job_created",
          {
            jobName: job.name,
            jobId: job.id,
            schedule: job.schedule,
            workspaceName: workspace.name,
          },
          user?.id
        );
        response.status(201).json({ job, error: null });
      } catch (error) {
        console.error("Error creating workspace scheduled job:", error);
        response.status(500).json({ job: null, error: error.message });
      }
    }
  );

  app.get(
    "/workspace/:slug/scheduled-jobs/:id",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const job = await ownedJobOr404(
          request.params.id,
          response.locals.workspace,
          response
        );
        if (!job) return;
        response.status(200).json({ job });
      } catch (error) {
        console.error("Error loading workspace scheduled job:", error);
        response.status(500).json({ job: null, error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/scheduled-jobs/:id",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        if (!(await ownedJobOr404(request.params.id, workspace, response)))
          return;

        const body = reqBody(request);
        const errorMessage = await validateWorkspaceJobPayload(
          workspace,
          body,
          false
        );
        if (errorMessage)
          return response.status(400).json({ job: null, error: errorMessage });

        const updates = {};
        if (body.name !== undefined) updates.name = String(body.name).trim();
        if (body.prompt !== undefined)
          updates.prompt = String(body.prompt).trim();
        if (body.tools !== undefined) updates.tools = body.tools;
        if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);
        if (body.schedule !== undefined)
          updates.schedule = String(body.schedule).trim();
        if (body.recipientType !== undefined) {
          updates.recipientType = body.recipientType;
          updates.recipientWorkspaceIds = null;
          updates.recipientUserIds =
            body.recipientType === "user" ? body.recipientUserIds : null;
        }

        if (updates.enabled === true) {
          const activation = await ScheduledJob.canActivate({
            excludeId: Number(request.params.id),
          });
          if (!activation.allowed) {
            return response.status(400).json({
              job: null,
              error: `Cannot enable: maximum of ${activation.limit} active scheduled jobs reached. Disable another job first.`,
            });
          }
        }

        const { job, error } = await ScheduledJob.update(
          Number(request.params.id),
          updates
        );
        if (error) return response.status(400).json({ job: null, error });

        await backgroundService.syncScheduledJob(job.id);
        await EventLogs.logEvent(
          "scheduled_job_updated",
          {
            jobName: job.name,
            jobId: job.id,
            fields: Object.keys(updates).sort(),
            workspaceName: workspace.name,
          },
          user?.id
        );
        response.status(200).json({ job, error: null });
      } catch (error) {
        console.error("Error updating workspace scheduled job:", error);
        response.status(500).json({ job: null, error: error.message });
      }
    }
  );

  app.delete(
    "/workspace/:slug/scheduled-jobs/:id",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const job = await ownedJobOr404(request.params.id, workspace, response);
        if (!job) return;

        backgroundService.removeScheduledJob(Number(request.params.id));
        const success = await ScheduledJob.delete(Number(request.params.id));
        if (success)
          await EventLogs.logEvent(
            "scheduled_job_deleted",
            {
              jobName: job.name,
              jobId: job.id,
              workspaceName: workspace.name,
            },
            user?.id
          );
        response.status(200).json({ success });
      } catch (error) {
        console.error("Error deleting workspace scheduled job:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/scheduled-jobs/:id/toggle",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const job = await ownedJobOr404(request.params.id, workspace, response);
        if (!job) return;

        if (!job.enabled) {
          const activation = await ScheduledJob.canActivate({
            excludeId: job.id,
          });
          if (!activation.allowed) {
            return response.status(400).json({
              job: null,
              error: `Cannot enable: maximum of ${activation.limit} active scheduled jobs reached. Disable another job first.`,
            });
          }
        }

        const { job: updated } = await ScheduledJob.update(job.id, {
          enabled: !job.enabled,
        });
        await backgroundService.syncScheduledJob(job.id);
        await EventLogs.logEvent(
          "scheduled_job_toggled",
          {
            jobName: job.name,
            jobId: job.id,
            enabled: !job.enabled,
            workspaceName: workspace.name,
          },
          user?.id
        );
        response.status(200).json({ job: updated });
      } catch (error) {
        console.error("Error toggling workspace scheduled job:", error);
        response.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/scheduled-jobs/:id/trigger",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const job = await ownedJobOr404(request.params.id, workspace, response);
        if (!job) return;

        const run = await backgroundService.enqueueScheduledJob(job.id);

        // Recorded even when the run is skipped, because "somebody pressed run" is
        // the fact being audited - a queue that refused it is part of that story.
        await EventLogs.logEvent(
          "scheduled_job_triggered",
          {
            jobName: job.name,
            jobId: job.id,
            skipped: !run,
            workspaceName: workspace.name,
          },
          user?.id
        );
        response
          .status(200)
          .json({ success: true, skipped: !run, error: null });
      } catch (error) {
        console.error("Error triggering workspace scheduled job:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // Merged run+email schedule log for jobs owned by this workspace - every run
  // (status/duration/error) with its result-email delivery attempts attached.
  // Replaces the old per-job "Run History" list. Pass jobId to filter to one job.
  app.post(
    "/workspace/:slug/scheduled-jobs/logs",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { offset = 0, limit = 10, jobId = null } = reqBody(request);

        let clause = { job: { workspaceId: workspace.id } };
        if (jobId) {
          const job = await ownedJobOr404(jobId, workspace, response);
          if (!job) return;
          clause = { jobId: job.id };
        }

        const runs = await ScheduledJobRun.where(
          clause,
          limit,
          { startedAt: "desc" },
          { job: true },
          offset * limit
        );
        const totalLogs = await ScheduledJobRun.count(clause);
        const hasPages = totalLogs > (offset + 1) * limit;

        const emailLogsByRun = await ScheduledJobLog.groupByRunId(
          runs.map((r) => r.id)
        );

        response.status(200).json({
          logs: runs.map((run) => ({
            id: run.id,
            jobId: run.jobId,
            jobName: run.job?.name || "Unknown Job",
            workspaceName: workspace.name,
            workspaceSlug: workspace.slug,
            status: run.status,
            error: run.error,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            readAt: run.readAt,
            emailLogs: emailLogsByRun[run.id] || [],
          })),
          hasPages,
          totalLogs,
        });
      } catch (error) {
        console.error("Error listing workspace scheduled job logs:", error);
        response.status(500).json({ logs: [], error: error.message });
      }
    }
  );

  // Exports this workspace's schedule log (or a date-bounded slice of it),
  // unpaginated. Mirrors the instance-wide /scheduled-jobs/logs/export.
  app.get(
    "/workspace/:slug/scheduled-jobs/logs/export",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const {
          format = "csv",
          startDate = null,
          endDate = null,
          jobId = null,
        } = request.query;

        let clause = { job: { workspaceId: workspace.id } };
        if (jobId) {
          const job = await ownedJobOr404(jobId, workspace, response);
          if (!job) return;
          clause = { jobId: job.id };
        }
        clause = { ...clause, ...dateRangeClause("startedAt", startDate, endDate) };

        const runs = await ScheduledJobRun.where(
          clause,
          null,
          { startedAt: "desc" },
          { job: { include: { workspace: { select: { name: true, slug: true } } } } }
        );
        const emailLogsByRun = await ScheduledJobLog.groupByRunId(
          runs.map((r) => r.id)
        );
        const rows = runs.map((run) => scheduledJobRunToRow(run, emailLogsByRun));
        const { contentType, data } = exportRows(
          format,
          rows,
          SCHEDULED_JOB_LOG_HEADERS
        );

        response.setHeader("Content-Type", contentType);
        response.status(200).send(data);
      } catch (error) {
        console.error("Error exporting workspace scheduled job logs:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  app.get(
    "/workspace/:slug/scheduled-jobs/runs/:runId",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const owned = await ownedRunOr404(
          request.params.runId,
          response.locals.workspace,
          response
        );
        if (!owned) return;
        response.status(200).json({
          run: { ...owned.run, result: safeJsonParse(owned.run.result, null) },
          job: owned.job,
        });
      } catch (error) {
        console.error("Error loading workspace scheduled job run:", error);
        response.status(500).json({ run: null, error: error.message });
      }
    }
  );

  app.get(
    "/workspace/:slug/scheduled-jobs/runs/:runId/email-logs",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const owned = await ownedRunOr404(
          request.params.runId,
          response.locals.workspace,
          response
        );
        if (!owned) return;

        const logs = await ScheduledJobLog.where({ runId: owned.run.id }, 50, {
          occurredAt: "desc",
        });
        response.status(200).json({
          logs: logs.map((l) => ({
            ...l,
            metadata: safeJsonParse(l.metadata, {}),
          })),
        });
      } catch (error) {
        console.error(
          "Error loading workspace scheduled job email logs:",
          error
        );
        response.status(500).json({ logs: [], error: error.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/scheduled-jobs/runs/:runId/:action",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.SCHEDULED_JOBS_MANAGE]),
      validWorkspaceSlug,
      requireSmtpReady,
    ],
    async (request, response) => {
      try {
        const { action } = request.params;
        if (!["read", "kill"].includes(action))
          throw new Error("Invalid action");

        const owned = await ownedRunOr404(
          request.params.runId,
          response.locals.workspace,
          response
        );
        if (!owned) return;
        const { run } = owned;

        if (action === "read") {
          await ScheduledJobRun.markRead(run.id);
          return response.status(200).json({ success: true });
        }

        if (action === "kill") {
          if (!["queued", "running"].includes(run.status)) {
            return response
              .status(400)
              .json({ error: "Only running or queued jobs can be killed" });
          }
          const killed = backgroundService.killRun(run.jobId, run.id);
          if (!killed) await ScheduledJobRun.kill(run.id);
          return response.status(200).json({ success: true });
        }
      } catch {
        response.sendStatus(500);
      }
    }
  );

  workspaceParsedFilesEndpoints(app);
}

module.exports = { workspaceEndpoints };
