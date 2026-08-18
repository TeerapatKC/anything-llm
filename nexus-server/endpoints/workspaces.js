const path = require("path");
const fs = require("fs");
const {
  reqBody,
  multiUserMode,
  userFromSession,
  safeJsonParse,
} = require("../utils/http");
const { normalizePath, isWithin } = require("../utils/files");
const { Workspace } = require("../models/workspace");
const { Document } = require("../models/documents");
const { DocumentVectors } = require("../models/vectors");
const { WorkspaceChats } = require("../models/workspaceChats");
const { WorkspaceUser } = require("../models/workspaceUsers");
const { User } = require("../models/user");
const { getVectorDbClass, stripThinkingFromText } = require("../utils/helpers");
const { handleFileUpload, handlePfpUpload } = require("../utils/files/multer");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const {
  flexUserRoleValid,
  strictMultiUserRoleValid,
  isElevatedRole,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const {
  eitherRoleValid,
  getWorkspaceRole,
} = require("../utils/middleware/workspaceRoleProtected");
const { EventLogs } = require("../models/eventLogs");
const {
  WorkspaceSuggestedMessages,
} = require("../models/workspacesSuggestedMessages");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");
const { convertToChatHistory } = require("../utils/helpers/chat/responses");
const { CollectorApi } = require("../utils/collectorApi");
const {
  determineWorkspacePfpFilepath,
  fetchPfp,
} = require("../utils/files/pfp");
const { getTTSProvider } = require("../utils/TextToSpeech");
const { WorkspaceThread } = require("../models/workspaceThread");
const { SlashCommandPresets } = require("../models/slashCommandsPresets");
const { VALID_COMMANDS } = require("../utils/chats");

const truncate = require("truncate");
const { purgeDocument } = require("../utils/files/purgeDocument");
const { getModelTag } = require("./utils");
const { searchWorkspaceAndThreads } = require("../utils/helpers/search");
const { workspaceParsedFilesEndpoints } = require("./workspacesParsedFiles");
const {
  workspaceDeletionProtection,
} = require("../utils/middleware/workspaceDeletionProtection");

function workspaceEndpoints(app) {
  if (!app) return;
  const responseCache = new Map();

  app.post(
    "/workspace/new",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const {
          name = null,
          description,
          defaultLanguage,
          workspaceAdminUserId,
          memberUserIds = [],
        } = reqBody(request);
        const { workspace, message } = await Workspace.new(name, user?.id, {
          description,
          defaultLanguage,
        });

        // Optionally designate a workspace-scoped admin and/or an initial
        // member list at creation time (mirrors the "กำหนด Workspace
        // Administrator" + "เพิ่มสมาชิกที่สามารถเข้าถึง" steps in the
        // product's workspace-setup flow). Falls back silently on individual
        // failures - workspace creation itself has already succeeded.
        if (workspace && workspaceAdminUserId) {
          await WorkspaceUser.addUser(workspaceAdminUserId, workspace.id, "admin");
        }
        if (workspace && Array.isArray(memberUserIds) && memberUserIds.length) {
          for (const memberUserId of memberUserIds) {
            if (Number(memberUserId) === Number(workspaceAdminUserId)) continue;
            await WorkspaceUser.addUser(memberUserId, workspace.id, "member");
          }
        }

        await Telemetry.sendTelemetry(
          "workspace_created",
          {
            multiUserMode: multiUserMode(response),
            LLMSelection: process.env.LLM_PROVIDER || "openai",
            Embedder: process.env.EMBEDDING_ENGINE || "inherit",
            VectorDbSelection: process.env.VECTOR_DB || "lancedb",
            TTSSelection: process.env.TTS_PROVIDER || "native",
            LLMModel: getModelTag(),
          },
          user?.id
        );

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

  app.post(
    "/workspace/:slug/update",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const data = reqBody(request);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.getActive({ slug });

        if (!currWorkspace) {
          response
            .status(404)
            .json({ workspace: null, message: "Workspace does not exist." });
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
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handleFileUpload,
    ],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.getActive({ slug });

        if (!currWorkspace) {
          response
            .status(404)
            .json({ success: false, error: "Workspace does not exist." });
          return;
        }

        if (!request.file) {
          response
            .status(400)
            .json({ success: false, error: "No file was uploaded." });
          return;
        }

        const Collector = new CollectorApi();
        const { originalname } = request.file;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          const message = `Document processing API is not online. Document ${originalname} will not be processed automatically.`;
          if (currWorkspace)
            await Document.recordUploadFailure(currWorkspace, originalname, request.file?.path, message);
          response
            .status(500)
            .json({
              success: false,
              error: message,
            })
            .end();
          return;
        }

        const { success, reason } =
          await Collector.processDocument(originalname);
        if (!success) {
          if (currWorkspace)
            await Document.recordUploadFailure(currWorkspace, originalname, request.file?.path, reason);
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        Collector.log(
          `Document ${originalname} uploaded processed and successfully. It is now available in documents.`
        );
        await Telemetry.sendTelemetry("document_uploaded");
        await EventLogs.logEvent(
          "document_uploaded",
          {
            documentName: originalname,
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
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const Collector = new CollectorApi();
        const { link = "" } = reqBody(request);
        if (!link.trim()) {
          response
            .status(400)
            .json({ success: false, error: "A link is required." })
            .end();
          return;
        }

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

        const { success, reason } = await Collector.processLink(link);
        if (!success) {
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        Collector.log(
          `Link ${link} uploaded processed and successfully. It is now available in documents.`
        );
        await Telemetry.sendTelemetry("link_uploaded");
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
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const { adds = [], deletes = [] } = reqBody(request);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.getActive({ slug });

        if (!currWorkspace) {
          response
            .status(404)
            .json({ workspace: null, message: "Workspace does not exist." });
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

  // Default "delete workspace" action - archives instead of destroying data.
  // Documents, vectors, and chat history are left untouched and the workspace
  // can be brought back with POST /workspace/:slug/restore. For a true
  // permanent purge see DELETE /workspace/:slug/purge below.
  app.delete(
    "/workspace/:slug",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      // WORKSPACE_DELETION_PROTECTION is meant to stop workspaces from
      // disappearing at all when set, not just to gate the permanent purge -
      // archiving still removes it from every normal list, so it's gated the
      // same way as /purge below.
      workspaceDeletionProtection,
    ],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.getActive({ slug });

        if (!workspace) {
          response
            .status(404)
            .json({ success: false, error: "Workspace does not exist." });
          return;
        }

        const { workspace: archived, message } = await Workspace.archive(
          workspace.id,
          user?.id
        );
        if (!archived) return response.status(500).json({ success: false, error: message });
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // Permanent, irreversible purge of a workspace and all of its documents,
  // vectors, and chat history. Instance-admin only - this is the original
  // hard-delete behavior, kept available as an explicit, higher-friction action.
  app.delete(
    "/workspace/:slug/purge",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin]),
      workspaceDeletionProtection,
    ],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const VectorDb = getVectorDbClass();
        const workspace = await Workspace.get({ slug });

        if (!workspace) {
          response
            .status(404)
            .json({ success: false, error: "Workspace does not exist." });
          return;
        }

        await WorkspaceChats.delete({ workspaceId: Number(workspace.id) });
        await DocumentVectors.deleteForWorkspace(workspace.id);
        await Document.delete({ workspaceId: Number(workspace.id) });
        await Workspace.delete({ id: Number(workspace.id) });

        await EventLogs.logEvent(
          "workspace_purged",
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

  app.post(
    "/workspace/:slug/restore",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        // Archived workspaces are excluded from the default getWithUser/where
        // scope, so look them up with includeArchived to find this one.
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug }, { includeArchived: true })
          : await Workspace.get({ slug });

        if (!workspace)
          return response
            .status(404)
            .json({ workspace: null, message: "Workspace does not exist." });

        const { workspace: restored, message } = await Workspace.restore(
          workspace.id,
          user?.id
        );
        response.status(restored ? 200 : 500).json({ workspace: restored, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/status",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { status } = reqBody(request);
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        const { workspace: updated, message } = await Workspace.setStatus(
          workspace.id,
          status,
          user?.id
        );
        response.status(updated ? 200 : 400).json({ workspace: updated, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/reset-vector-db",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const VectorDb = getVectorDbClass();
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.getActive({ slug });

        if (!workspace) {
          response
            .status(404)
            .json({ success: false, error: "Workspace does not exist." });
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
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspaces = multiUserMode(response)
          ? await Workspace.whereWithUser(user)
          : await Workspace.where({ status: { not: "archived" } });

        response.status(200).json({ workspaces });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.getActive({ slug });

        // Lets the frontend know upfront whether the caller can manage this
        // workspace (show/hide admin-only UI) without a separate round trip.
        const myRole =
          workspace && multiUserMode(response) && user
            ? isElevatedRole(user)
              ? "admin"
              : await getWorkspaceRole(user.id, workspace.id)
            : null;

        response.status(200).json({ workspace, myRole });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/chats",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.getActive({ slug });

        if (!workspace) {
          response
            .status(404)
            .json({ history: [], message: "Workspace does not exist." });
          return;
        }

        const history = multiUserMode(response)
          ? await WorkspaceChats.forWorkspaceByUser(workspace.id, user.id)
          : await WorkspaceChats.forWorkspace(workspace.id);
        response.status(200).json({ history: convertToChatHistory(history) });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/delete-chats",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { chatIds = [] } = reqBody(request);
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        // `workspace` is always present here - validWorkspaceSlug already 404'd
        // otherwise. The only real failure mode left is a malformed body.
        if (!workspace || !Array.isArray(chatIds)) {
          response
            .status(400)
            .json({ success: false, error: "chatIds must be an array." });
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
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
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
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { chatId, newText = null, role = "assistant" } = reqBody(request);
        if (!newText || !String(newText).trim())
          return response.status(400).json({ success: false, error: "Cannot save empty edit." });

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const existingChat = await WorkspaceChats.get({
          workspaceId: workspace.id,
          thread_id: null,
          user_id: user?.id,
          id: Number(chatId),
        });
        if (!existingChat)
          return response.status(404).json({ success: false, error: "Invalid chat." });

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
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { chatId } = request.params;
        const { feedback = null } = reqBody(request);
        const user = await userFromSession(request, response);
        const existingChat = await WorkspaceChats.get({
          id: Number(chatId),
          workspaceId: response.locals.workspace.id,
          user_id: user?.id,
        });

        if (!existingChat) return response.status(404).json({ success: false });
        await WorkspaceChats.updateFeedbackScore(chatId, feedback);
        return response.status(200).json({ success: true });
      } catch (error) {
        console.error("Error updating chat feedback:", error);
        response.status(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/suggested-messages",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
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
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
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
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
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
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
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

        const text = safeJsonParse(wsChat.response, null)?.text;
        if (!text) return response.sendStatus(204).end();

        const TTSProvider = getTTSProvider();
        const buffer = await TTSProvider.ttsBuffer(text);
        if (buffer === null) return response.sendStatus(204).end();

        responseCache.set(cacheKey, { buffer, mime: "audio/mpeg" });
        response.writeHead(200, {
          "Content-Type": "audio/mpeg",
        });
        response.end(buffer);
        return;
      } catch (error) {
        console.error("Error processing the TTS request:", error);
        response.status(500).json({ message: "TTS could not be completed" });
      }
    }
  );

  app.get(
    "/workspace/:slug/pfp",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const cachedResponse = responseCache.get(slug);

        if (cachedResponse) {
          response.writeHead(200, {
            "Content-Type": cachedResponse.mime || "image/png",
          });
          response.end(cachedResponse.buffer);
          return;
        }

        const pfpPath = await determineWorkspacePfpFilepath(slug);

        if (!pfpPath) {
          response.sendStatus(204).end();
          return;
        }

        const { found, buffer, mime } = fetchPfp(pfpPath);
        if (!found) {
          response.sendStatus(204).end();
          return;
        }

        responseCache.set(slug, { buffer, mime });

        response.writeHead(200, {
          "Content-Type": mime || "image/png",
        });
        response.end(buffer);
        return;
      } catch (error) {
        console.error("Error processing the logo request:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/workspace/:slug/upload-pfp",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handlePfpUpload,
    ],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const uploadedFileName = request.randomFileName;
        if (!uploadedFileName) {
          return response.status(400).json({ message: "File upload failed." });
        }

        const workspaceRecord = await Workspace.get({
          slug,
        });
        if (!workspaceRecord) {
          return response
            .status(404)
            .json({ message: "Workspace does not exist." });
        }

        const oldPfpFilename = workspaceRecord.pfpFilename;
        if (oldPfpFilename) {
          const storagePath = path.join(__dirname, "../storage/assets/pfp");
          const oldPfpPath = path.join(
            storagePath,
            normalizePath(workspaceRecord.pfpFilename)
          );
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          if (fs.existsSync(oldPfpPath)) fs.unlinkSync(oldPfpPath);
        }

        const { workspace, message } = await Workspace._update(
          workspaceRecord.id,
          {
            pfpFilename: uploadedFileName,
          }
        );

        return response.status(workspace ? 200 : 500).json({
          message: workspace
            ? "Profile picture uploaded successfully."
            : message,
        });
      } catch (error) {
        console.error("Error processing the profile picture upload:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.delete(
    "/workspace/:slug/remove-pfp",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const workspaceRecord = await Workspace.get({
          slug,
        });
        if (!workspaceRecord) {
          response
            .status(404)
            .json({ success: false, error: "Workspace does not exist." });
          return;
        }
        const oldPfpFilename = workspaceRecord.pfpFilename;

        if (oldPfpFilename) {
          const storagePath = path.join(__dirname, "../storage/assets/pfp");
          const oldPfpPath = path.join(
            storagePath,
            normalizePath(oldPfpFilename)
          );
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          if (fs.existsSync(oldPfpPath)) fs.unlinkSync(oldPfpPath);
        }

        const { workspace, message } = await Workspace._update(
          workspaceRecord.id,
          {
            pfpFilename: null,
          }
        );

        // Clear the cache
        responseCache.delete(slug);

        return response.status(workspace ? 200 : 500).json({
          message: workspace
            ? "Profile picture removed successfully."
            : message,
        });
      } catch (error) {
        console.error("Error processing the profile picture removal:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/workspace/:slug/thread/fork",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
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
            ? truncate(lastMessageText, 22)
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
    [validatedRequest, flexUserRoleValid([ROLES.all])],
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
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handleFileUpload,
    ],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.getActive({ slug });

        if (!currWorkspace) {
          response
            .status(404)
            .json({ success: false, error: "Workspace does not exist." });
          return;
        }

        if (!request.file) {
          response
            .status(400)
            .json({ success: false, error: "No file was uploaded." });
          return;
        }

        const Collector = new CollectorApi();
        const { originalname } = request.file;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          const message = `Document processing API is not online. Document ${originalname} will not be processed automatically.`;
          await Document.recordUploadFailure(currWorkspace, originalname, request.file?.path, message);
          response
            .status(500)
            .json({
              success: false,
              error: message,
            })
            .end();
          return;
        }

        const { success, reason, documents } =
          await Collector.processDocument(originalname);
        if (!success || documents?.length === 0) {
          await Document.recordUploadFailure(currWorkspace, originalname, request.file?.path, reason);
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        Collector.log(
          `Document ${originalname} uploaded processed and successfully. It is now available in documents.`
        );
        await Telemetry.sendTelemetry("document_uploaded");
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
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handleFileUpload,
    ],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const body = reqBody(request);
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.getActive({ slug });

        if (!currWorkspace)
          return response
            .status(404)
            .json({ success: false, error: "Workspace does not exist." });
        if (!body.documentLocation)
          return response
            .status(400)
            .json({ success: false, error: "documentLocation is required." });

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
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
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
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
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
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
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
   * Only returns assets owned by the user (if multi-user mode is enabled).
   */
  app.post(
    "/workspace/search",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
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
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
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
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
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
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (_, response) => {
      try {
        response.status(200).json({
          showAgentCommand: await Workspace.isAgentCommandAvailable(
            response.locals.workspace
          ),
        });
      } catch (error) {
        // Still a 200: the caller gets a safe, usable fallback value here (not
        // an error state), most commonly because no LLM_PROVIDER is configured
        // yet - that's an expected, recoverable condition during setup, not a
        // server failure, and a 5xx here previously misled uptime/error-rate
        // monitoring into flagging normal first-boot state as an incident.
        console.error("Error checking if agent command is available:", error);
        response.status(200).json({ showAgentCommand: true });
      }
    }
  );

  // ----- Workspace member management (workspace-scoped, additive alongside
  // the existing instance-only /admin/workspaces/:id/users wholesale-replace) -----

  app.get(
    "/workspace/:slug/members",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const members = await Workspace.workspaceUsers(workspace.id);
        response.status(200).json({ members });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // A workspace-admin whose instance-wide role is just "default" can't hit
  // /admin/users (instance admin/manager only), but still needs a way to look
  // up who to add to their workspace - this returns just {id, username} of
  // non-members (deliberately not the fuller admin/users payload, which
  // includes role/suspended/mustResetPassword - fine for an instance admin's
  // eyes, not something every workspace-admin should be able to see for every
  // user on the instance).
  app.get(
    "/workspace/:slug/members/available-users",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const existingMemberIds = (
          await WorkspaceUser.where({ workspace_id: workspace.id })
        ).map((rel) => rel.user_id);
        const users = await User.where({
          id: { notIn: existingMemberIds.length > 0 ? existingMemberIds : [-1] },
        });
        response.status(200).json({
          users: users.map((u) => ({ id: u.id, username: u.username })),
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/members",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const user = await userFromSession(request, response);
        const { userId, role = "member" } = reqBody(request);
        if (!userId)
          return response.status(400).json({ success: false, error: "userId is required." });

        const targetUser = await User.get({ id: Number(userId) });
        if (!targetUser)
          return response.status(404).json({ success: false, error: "User not found." });

        const { success, error } = await WorkspaceUser.addUser(
          userId,
          workspace.id,
          role
        );
        if (!success) return response.status(500).json({ success, error });

        await EventLogs.logEvent(
          "workspace_member_added",
          { workspaceName: workspace.name, targetUsername: targetUser.username, role },
          user?.id
        );
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/members/:userId",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const user = await userFromSession(request, response);
        const { userId } = request.params;

        // Membership-existence and last-admin-lockout checks are centralized
        // in WorkspaceUser.removeUser() itself now, so any other caller gets
        // the same protection automatically.
        const { success, error } = await WorkspaceUser.removeUser(userId, workspace.id);
        if (!success) return response.status(400).json({ success, error });

        await EventLogs.logEvent(
          "workspace_member_removed",
          { workspaceName: workspace.name, targetUserId: Number(userId) },
          user?.id
        );
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/members/:userId/role",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const user = await userFromSession(request, response);
        const { userId } = request.params;
        // Accepts either shape: a role NAME (the shape every other caller in
        // this app, and this session's own testing, has always used), or a
        // numeric workspaceRoleId (what a newer frontend branch sends,
        // referencing a role by id since workspace roles can now be private
        // to one workspace, where two different workspaces' roles can share
        // a name and only an id disambiguates them).
        const { role, workspaceRoleId } = reqBody(request);
        let roleName = role;
        if (!roleName && workspaceRoleId) {
          const { WorkspaceRole } = require("../models/workspaceRole");
          const targetRole = await WorkspaceRole.get({ id: Number(workspaceRoleId) });
          if (!targetRole)
            return response.status(400).json({ success: false, error: "Invalid workspaceRoleId." });
          roleName = targetRole.name;
        }

        // Role-name resolution, membership-existence, and last-admin-lockout
        // checks are all centralized in WorkspaceUser.setRole() now, so any
        // other caller gets the same protection automatically.
        const { success, error } = await WorkspaceUser.setRole(
          userId,
          workspace.id,
          roleName
        );
        if (!success) return response.status(400).json({ success, error });

        await EventLogs.logEvent(
          "workspace_member_role_changed",
          { workspaceName: workspace.name, targetUserId: Number(userId), role: roleName },
          user?.id
        );
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // ----- Document lifecycle: rename / reprocess / disable / enable / download -----

  app.post(
    "/workspace/:slug/document/:docId/rename",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { docId } = request.params;
        const { title } = reqBody(request);

        const document = await Document.get({ docId, workspaceId: workspace.id });
        if (!document) return response.sendStatus(404).end();

        const { document: updated, message } = await Document.rename(
          document.id,
          title
        );
        response.status(updated ? 200 : 400).json({ document: updated, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/document/:docId/reprocess",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { docId } = request.params;
        const document = await Document.get({ docId, workspaceId: workspace.id });
        if (!document) return response.sendStatus(404).end();

        // Re-run the same collector + embed pipeline used on first upload,
        // against the document's already-known docpath. Note this assigns a
        // NEW docId to the document (removeDocuments deletes the old record,
        // addDocuments creates a fresh one) - any citations pointing at the
        // old docId will no longer resolve to it after a reprocess.
        await Document.removeDocuments(workspace, [document.docpath], response.locals?.user?.id);
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          workspace,
          [document.docpath],
          response.locals?.user?.id
        );

        if (failedToEmbed.length > 0)
          return response.status(200).json({ success: false, error: errors?.[0] || "Reprocessing failed." });

        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/document/:docId/disable",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { docId } = request.params;
        const document = await Document.get({ docId, workspaceId: workspace.id });
        if (!document) return response.sendStatus(404).end();

        const { document: updated, message } = await Document.disable(document.id);
        response.status(updated ? 200 : 400).json({ document: updated, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/document/:docId/enable",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { docId } = request.params;
        const document = await Document.get({ docId, workspaceId: workspace.id });
        if (!document) return response.sendStatus(404).end();

        const { document: updated, message } = await Document.enable(document.id);
        response.status(updated ? 200 : 400).json({ document: updated, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/document/:docId/download",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { docId } = request.params;
        const document = await Document.get({ docId, workspaceId: workspace.id });
        if (!document) return response.sendStatus(404).end();

        // NOTE: only the extracted/cleaned text is guaranteed to be retained
        // post-processing in this codebase (server/storage/documents/**/*.json) -
        // the original binary (PDF/DOCX/etc) is not confirmed to be kept. This
        // serves the extracted text as a .txt download; revisit if collector-side
        // storage turns out to retain original files too.
        const { content } = await Document.content(docId);
        const downloadName = `${(document.title || document.filename || docId).replace(/[^a-z0-9-_.]/gi, "_")}.txt`;

        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.setHeader(
          "Content-Disposition",
          `attachment; filename="${downloadName}"`
        );
        response.status(200).send(content || "");
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // Workspace-scoped slash commands - shared prompt shortcuts visible to every
  // member of one workspace, distinct from the personal ones under
  // /system/slash-command-presets. Read is open to anyone who can access the
  // workspace (it's what the chat prompt menu reads); writes require the same
  // workspace-management permission as other settings endpoints.
  app.get(
    "/workspace/:slug/slash-command-presets",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
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

  app.get(
    "/workspace/:slug/slash-command-presets/owned",
    [
      validatedRequest,
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (_request, response) => {
      try {
        const presets = await SlashCommandPresets.forWorkspace(
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
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { command, prompt, description } = reqBody(request);
        const formattedCommand = SlashCommandPresets.formatCommand(String(command));

        if (Object.keys(VALID_COMMANDS).includes(formattedCommand)) {
          return response.status(400).json({
            message: "Cannot create a preset with a command that matches a system command",
          });
        }

        const preset = await SlashCommandPresets.createForWorkspace(
          workspace.id,
          user?.id ?? null,
          {
            command: formattedCommand,
            prompt: String(prompt),
            description: String(description),
          }
        );
        if (!preset)
          return response.status(500).json({ message: "Failed to create preset" });
        response.status(201).json({ preset: SlashCommandPresets.toPublic(preset) });
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
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { slashCommandId } = request.params;
        const { command, prompt, description } = reqBody(request);
        const formattedCommand = SlashCommandPresets.formatCommand(String(command));

        if (Object.keys(VALID_COMMANDS).includes(formattedCommand)) {
          return response.status(400).json({
            message: "Cannot update a preset to use a command that matches a system command",
          });
        }

        // Scoped to this workspace so a caller cannot reach a built-in, a
        // personal preset, or another workspace's preset by guessing an id.
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
        const preset = await SlashCommandPresets.update(Number(slashCommandId), updates);
        if (!preset) return response.sendStatus(422);
        response
          .status(200)
          .json({ preset: SlashCommandPresets.toPublic({ ...existing, ...updates }) });
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
      eitherRoleValid([ROLES.admin, ROLES.manager], ["admin"]),
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

  // Parsed Files in separate endpoint just to keep the workspace endpoints clean
  workspaceParsedFilesEndpoints(app);
}

module.exports = { workspaceEndpoints };
