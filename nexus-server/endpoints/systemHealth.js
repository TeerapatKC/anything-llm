const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const { Document } = require("../models/documents");
const { Workspace } = require("../models/workspace");
const { DocumentProcessingQueue } = require("../models/documentProcessingQueue");
const {
  checkLLMHealth,
  checkEmbedderHealth,
  checkVectorDbHealth,
  checkCollectorHealth,
  checkDocumentQueueHealth,
} = require("../utils/helpers/systemHealth");

/**
 * V.1 System Administration surface: aggregate health-check + single-document
 * retry. Deliberately does NOT include GPU/storage/memory metrics or a real
 * service-restart action - both are out of scope for V.1 (see product plan).
 */
function systemHealthEndpoints(app) {
  if (!app) return;

  app.get(
    "/system/health",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (_request, response) => {
      try {
        const [llm, embedder, vectorDb, collector, documentQueue] =
          await Promise.all([
            checkLLMHealth().catch((error) => ({ status: "error", error: error.message })),
            checkEmbedderHealth().catch((error) => ({ status: "error", error: error.message })),
            checkVectorDbHealth().catch((error) => ({ status: "error", error: error.message })),
            checkCollectorHealth().catch((error) => ({ status: "error", error: error.message })),
            checkDocumentQueueHealth().catch((error) => ({ status: "error", error: error.message })),
          ]);

        response.status(200).json({
          webApp: { status: "ok", timestamp: new Date().toISOString() },
          llm,
          embedder,
          vectorDb,
          collector,
          documentQueue,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // List of currently-failed documents instance-wide, so an admin can see
  // WHICH documents need a retry (not just the count from /system/health) -
  // the "Failed Documents" item in the product doc's monitoring status list.
  app.get(
    "/system/documents/failed",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { limit = 50, offset = 0 } = request.query;
        const documents = await DocumentProcessingQueue.failed(
          Number(limit),
          Number(offset)
        );
        response.status(200).json({ documents });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  // Instance-wide retry for a single failed document, regardless of which
  // workspace it belongs to - reuses the same collector+embed pipeline as the
  // per-workspace /workspace/:slug/document/:docId/reprocess endpoint.
  app.post(
    "/system/document/:docId/retry",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { docId } = request.params;
        const document = await Document.get({ docId });
        if (!document)
          return response.status(404).json({ success: false, error: "Document not found." });

        const workspace = await Workspace.get({ id: document.workspaceId });
        if (!workspace)
          return response.status(404).json({ success: false, error: "Owning workspace not found." });
        if (workspace.status === "archived")
          return response.status(400).json({
            success: false,
            error: "Cannot retry a document in an archived workspace - restore the workspace first.",
          });

        await EventLogs.logEvent(
          "document_retry_attempted",
          { workspaceName: workspace.name, filename: document.filename, docId },
          response.locals?.user?.id
        );

        await Document.removeDocuments(workspace, [document.docpath], response.locals?.user?.id);
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          workspace,
          [document.docpath],
          response.locals?.user?.id
        );

        if (failedToEmbed.length > 0) {
          await EventLogs.logFailure(
            "document_processing_failed",
            { workspaceName: workspace.name, filename: document.filename, error: errors?.[0] },
            response.locals?.user?.id
          );
          return response.status(200).json({ success: false, error: errors?.[0] || "Retry failed." });
        }

        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );
}

module.exports = { systemHealthEndpoints };
