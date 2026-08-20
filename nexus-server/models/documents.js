const { v4: uuidv4 } = require("uuid");
const { getVectorDbClass } = require("../utils/helpers");
const prisma = require("../utils/prisma");
const { Telemetry } = require("./telemetry");
const { EventLogs } = require("./eventLogs");
const { safeJsonParse } = require("../utils/http");
const { getModelTag } = require("../endpoints/utils");

const Document = {
  writable: [
    "pinned",
    "watched",
    "lastUpdatedAt",
    "status",
    "statusMessage",
    "title",
  ],
  VALID_STATUSES: [
    "queued",
    "processing",
    "completed",
    "failed",
    "unsupported",
    "disabled",
  ],

  /**
   * Best-effort classification of a collector-reported failure reason into
   * "unsupported" (bad file type/format - retrying won't help without a
   * different file) vs generic "failed" (transient/processing error - retry
   * might succeed). Collector error strings aren't a fixed enum, so this is a
   * pattern match, not a guarantee - defaults to "failed" when unsure.
   * @param {string} reason
   * @returns {"unsupported"|"failed"}
   */
  classifyFailureReason: function (reason = "") {
    if (!reason || typeof reason !== "string") return "failed";
    const UNSUPPORTED_PATTERNS = [
      /unsupported/i,
      /not supported/i,
      /invalid file ?type/i,
      /cannot process/i,
      /unknown mimetype/i,
      /no parser/i,
    ];
    return UNSUPPORTED_PATTERNS.some((pattern) => pattern.test(reason))
      ? "unsupported"
      : "failed";
  },

  /**
   * Record a document that never made it to Document.addDocuments at all -
   * i.e. the collector itself rejected/failed on it (unsupported type, parse
   * error, collector offline) before any vectorization was attempted. Without
   * this, such failures were previously invisible (no DB row created at all),
   * which is what this method fixes: they now show up in the KB document list
   * and the instance-wide processing-queue view with a reason.
   * @param {{id: number, slug: string}} workspace
   * @param {string} filename - original filename
   * @param {string} sourcePath - best-available path (e.g. the multer hotdir
   *   path) - kept only for audit/reference; NOT expected to be re-readable
   *   for a meaningful retry since the underlying file/format issue remains.
   * @param {string} reason
   * @returns {Promise<Object|null>} the created record, or null on failure
   */
  recordUploadFailure: async function (workspace, filename, sourcePath, reason) {
    try {
      const status = this.classifyFailureReason(reason);
      const record = await prisma.workspace_documents.create({
        data: {
          docId: uuidv4(),
          filename,
          docpath: sourcePath || filename,
          workspaceId: workspace.id,
          status,
          statusMessage: reason || null,
        },
      });
      await EventLogs.logFailure(
        "document_processing_failed",
        { workspaceName: workspace?.name, filename, status, reason },
        null
      );
      return record;
    } catch (error) {
      console.error("Failed to record upload failure", error.message);
      return null;
    }
  },
  /**
   * @param {import("@prisma/client").workspace_documents} document - Document PrismaRecord
   * @returns {{
   *  metadata: (null|object),
   *  type: import("./documentSyncQueue.js").validFileType,
   *  source: string
   * }}
   */
  parseDocumentTypeAndSource: function (document) {
    const metadata = safeJsonParse(document.metadata, null);
    if (!metadata) return { metadata: null, type: null, source: null };

    // Parse the correct type of source and its original source path.
    const idx = metadata.chunkSource.indexOf("://");
    const [type, source] = [
      metadata.chunkSource.slice(0, idx),
      metadata.chunkSource.slice(idx + 3),
    ];
    return { metadata, type, source: this._stripSource(source, type) };
  },

  forWorkspace: async function (workspaceId = null) {
    if (!workspaceId) return [];
    return await prisma.workspace_documents.findMany({
      where: { workspaceId },
    });
  },

  delete: async function (clause = {}) {
    try {
      await prisma.workspace_documents.deleteMany({ where: clause });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  get: async function (clause = {}) {
    try {
      const document = await prisma.workspace_documents.findFirst({
        where: clause,
      });
      return document || null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  where: async function (
    clause = {},
    limit = null,
    orderBy = null,
    include = null,
    select = null
  ) {
    try {
      const results = await prisma.workspace_documents.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
        ...(include !== null ? { include } : {}),
        ...(select !== null ? { select: { ...select } } : {}),
      });
      return results;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  addDocuments: async function (workspace, additions = [], userId = null) {
    const VectorDb = getVectorDbClass();
    // Matches the shape every other return path in this function uses -
    // callers destructure `{ failedToEmbed, errors, embedded }`, not
    // `{ failed, embedded }`.
    if (additions.length === 0)
      return { failedToEmbed: [], errors: [], embedded: [] };
    const { fileData } = require("../utils/files");
    const { emitProgress } = require("../utils/EmbeddingWorkerManager");
    const embedded = [];
    const failedToEmbed = [];
    const errors = new Set();

    emitProgress(workspace.slug, {
      type: "batch_starting",
      workspaceSlug: workspace.slug,
      userId,
      filenames: additions,
      totalDocs: additions.length,
    });

    for (const [index, path] of additions.entries()) {
      const docProgress = {
        workspaceSlug: workspace.slug,
        userId,
        filename: path,
        docIndex: index,
        totalDocs: additions.length,
      };
      const filename = path.split(/[/\\]/).pop();

      // Create the document record up front (status: "processing") so a
      // failure below is still visible/retryable in the KB UI and the
      // instance-wide processing-queue view, instead of vanishing silently.
      const docId = uuidv4();
      let docRecord = null;
      try {
        docRecord = await prisma.workspace_documents.create({
          data: {
            docId,
            filename,
            docpath: path,
            workspaceId: workspace.id,
            status: "processing",
          },
        });
      } catch (error) {
        console.error("Failed to pre-create document record", error.message);
      }

      emitProgress(workspace.slug, { type: "doc_starting", ...docProgress });

      const data = await fileData(path);
      if (!data) {
        const message = "Failed to load file data";
        if (docRecord) await this.setStatus(docRecord.id, "failed", message);
        failedToEmbed.push(filename);
        errors.add(message);
        emitProgress(workspace.slug, {
          type: "doc_failed",
          ...docProgress,
          error: message,
        });
        continue;
      }

      const { pageContent: _pageContent, ...metadata } = data;

      global.__embeddingProgress = {
        workspaceSlug: workspace.slug,
        filename: path,
        userId,
      };

      const { vectorized, error } = await VectorDb.addDocumentToNamespace(
        workspace.slug,
        { ...data, docId },
        path
      );

      if (!vectorized) {
        console.error("Failed to vectorize", metadata?.title || filename);
        failedToEmbed.push(metadata?.title || filename);
        errors.add(error);
        if (docRecord)
          await this.setStatus(docRecord.id, "failed", error || "Unknown error");
        emitProgress(workspace.slug, {
          type: "doc_failed",
          ...docProgress,
          error: error || "Unknown error",
        });
        continue;
      }

      try {
        if (docRecord) {
          await prisma.workspace_documents.update({
            where: { id: docRecord.id },
            data: {
              metadata: JSON.stringify(metadata),
              status: "completed",
              statusMessage: null,
              lastUpdatedAt: new Date(),
            },
          });
        } else {
          // Pre-create above failed - fall back to the original single-insert path.
          await prisma.workspace_documents.create({
            data: {
              docId,
              filename,
              docpath: path,
              workspaceId: workspace.id,
              metadata: JSON.stringify(metadata),
              status: "completed",
            },
          });
        }
        embedded.push(path);
        emitProgress(workspace.slug, {
          type: "doc_complete",
          ...docProgress,
        });
      } catch (error) {
        console.error(error.message);
        await EventLogs.logFailure(
          "vectordb_operation_failed",
          { workspaceName: workspace?.name, filename, error: error.message },
          userId
        );
        emitProgress(workspace.slug, {
          type: "doc_failed",
          ...docProgress,
          error: "Failed to save document record",
        });
      }
    }

    global.__embeddingProgress = null;

    emitProgress(workspace.slug, {
      type: "all_complete",
      workspaceSlug: workspace.slug,
      userId,
      totalDocs: additions.length,
      embedded: embedded.length,
      failed: failedToEmbed.length,
    });

    await Telemetry.sendTelemetry("documents_embedded_in_workspace", {
      LLMSelection: process.env.LLM_PROVIDER || "openai",
      Embedder: process.env.EMBEDDING_ENGINE || "inherit",
      VectorDbSelection: process.env.VECTOR_DB || "lancedb",
      TTSSelection: process.env.TTS_PROVIDER || "native",
      LLMModel: getModelTag(),
    });
    await EventLogs.logEvent(
      "workspace_documents_added",
      {
        workspaceName: workspace?.name || "Unknown Workspace",
        numberOfDocumentsAdded: additions.length,
      },
      userId
    );
    return { failedToEmbed, errors: Array.from(errors), embedded };
  },

  removeDocuments: async function (workspace, removals = [], userId = null) {
    const VectorDb = getVectorDbClass();
    if (removals.length === 0) return;

    for (const path of removals) {
      const document = await this.get({
        docpath: path,
        workspaceId: workspace.id,
      });
      if (!document) continue;
      await VectorDb.deleteDocumentFromNamespace(
        workspace.slug,
        document.docId
      );

      try {
        await prisma.workspace_documents.delete({
          where: { id: document.id, workspaceId: workspace.id },
        });
        await prisma.document_vectors.deleteMany({
          where: { docId: document.docId },
        });
      } catch (error) {
        console.error(error.message);
        await EventLogs.logFailure(
          "vectordb_operation_failed",
          { workspaceName: workspace?.name, docId: document.docId, error: error.message },
          userId
        );
      }
    }

    await EventLogs.logEvent(
      "workspace_documents_removed",
      {
        workspaceName: workspace?.name || "Unknown Workspace",
        numberOfDocuments: removals.length,
      },
      userId
    );
    return true;
  },

  /**
   * Update the lifecycle status of a single document.
   * @param {number} id - workspace_documents.id
   * @param {"queued"|"processing"|"completed"|"failed"|"disabled"} status
   * @param {string|null} statusMessage - reason text, typically only set for "failed"
   * @returns {Promise<{document: Object|null, message: string|null}>}
   */
  setStatus: async function (id = null, status = null, statusMessage = null) {
    if (!id) throw new Error("No document id provided to setStatus");
    if (!this.VALID_STATUSES.includes(status))
      return { document: null, message: `Invalid status: ${status}` };
    return this.update(id, {
      status,
      statusMessage: status === "failed" ? statusMessage : null,
      lastUpdatedAt: new Date(),
    });
  },

  /**
   * Set a display-title override for a document without touching filename/docpath/docId,
   * so the underlying vector identity is untouched by a rename.
   * @param {number} id - workspace_documents.id
   * @param {string} newTitle
   * @returns {Promise<{document: Object|null, message: string|null}>}
   */
  rename: async function (id = null, newTitle = null) {
    if (!id) throw new Error("No document id provided to rename");
    if (!newTitle || typeof newTitle !== "string" || !newTitle.trim())
      return { document: null, message: "A non-empty title is required." };

    const document = await this.get({ id: Number(id) });
    if (!document) return { document: null, message: "Document not found." };

    const result = await this.update(id, { title: String(newTitle).slice(0, 500) });
    if (result.document)
      await EventLogs.logEvent(
        "document_renamed",
        { documentId: id, filename: document.filename, newTitle },
        null
      );
    return result;
  },

  /**
   * Soft-disable a document: it stays embedded in the vector DB but is
   * excluded from RAG context/citations (filtered in server/utils/chats/stream.js)
   * until re-enabled. Reversible, unlike deletion. Only meaningful for a
   * document that's actually completed/embedded - disabling anything else is
   * a no-op with a clear message rather than silently "succeeding".
   * @param {number} id - workspace_documents.id
   * @returns {Promise<{document: Object|null, message: string|null}>}
   */
  disable: async function (id = null) {
    if (!id) throw new Error("No document id provided to disable");
    const document = await this.get({ id: Number(id) });
    if (!document) return { document: null, message: "Document not found." };
    if (document.status !== "completed")
      return {
        document: null,
        message: `Cannot disable a document with status "${document.status}" - only a completed document can be disabled.`,
      };
    return this.update(id, { status: "disabled" });
  },

  /**
   * Re-enable a previously disabled document, restoring it to "completed"
   * (visible/usable) status. Only valid from "disabled" - a document that
   * was never actually completed (queued/processing/failed/unsupported) has
   * no vectors to re-include, so flipping it to "completed" would misreport
   * it as usable when it was never actually embedded.
   * @param {number} id - workspace_documents.id
   * @returns {Promise<{document: Object|null, message: string|null}>}
   */
  enable: async function (id = null) {
    if (!id) throw new Error("No document id provided to enable");
    const existing = await this.get({ id: Number(id) });
    if (!existing) return { document: null, message: "Document not found." };
    if (existing.status !== "disabled")
      return {
        document: null,
        message: `Cannot enable a document with status "${existing.status}" - only a disabled document can be re-enabled.`,
      };
    return this.update(id, { status: "completed" });
  },

  /**
   * Given a desired filename, return a filename guaranteed not to collide with
   * an existing document anywhere in the instance (filenames are deduped
   * instance-wide, not per-workspace, because uploads land in a shared hotdir
   * before any workspace context exists). Never overwrites, never blocks -
   * always returns a usable, unique name by appending a numeric suffix.
   *
   * `workspace_documents.filename` can't be used for this check - it stores
   * the collector's POST-PROCESSING output name ("<original>-<uuid>.json"),
   * never the raw uploaded name this function is given, so comparing against
   * it never matches. Collision is instead checked directly on disk: against
   * the shared hotdir (files not yet picked up by the collector - the actual
   * overwrite race this function exists to close) and against
   * custom-documents/ (every file the collector has already written is named
   * "<original>-<uuid>.json", which is the only place the original name
   * survives post-processing).
   * @param {string} originalname
   * @returns {Promise<string>}
   */
  resolveUniqueFilename: async function (originalname = "") {
    if (!originalname) return originalname;
    const dotIndex = originalname.lastIndexOf(".");
    const base = dotIndex > 0 ? originalname.slice(0, dotIndex) : originalname;
    const ext = dotIndex > 0 ? originalname.slice(dotIndex) : "";

    const fs = require("fs");
    const path = require("path");
    const { hotdirPath, documentsPath } = require("../utils/files");
    const customDocumentsPath = path.resolve(documentsPath, "custom-documents");

    const nameCollides = (candidate) => {
      if (fs.existsSync(path.resolve(hotdirPath, candidate))) return true;
      if (!fs.existsSync(customDocumentsPath)) return false;

      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`^${escaped}-[0-9a-f-]{36}\\.json$`, "i");
      return fs.readdirSync(customDocumentsPath).some((f) => pattern.test(f));
    };

    let candidate = originalname;
    let counter = 2;
    while (nameCollides(candidate)) {
      candidate = `${base}-${counter}${ext}`;
      counter++;
    }
    return candidate;
  },

  count: async function (clause = {}, limit = null) {
    try {
      const count = await prisma.workspace_documents.count({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
      });
      return count;
    } catch (error) {
      console.error("FAILED TO COUNT DOCUMENTS.", error.message);
      return 0;
    }
  },
  update: async function (id = null, data = {}) {
    if (!id) throw new Error("No workspace document id provided for update");

    const validKeys = Object.keys(data).filter((key) =>
      this.writable.includes(key)
    );
    if (validKeys.length === 0)
      return { document: { id }, message: "No valid fields to update!" };

    // Only persist the allowlisted subset - `validKeys` was previously computed
    // but not actually applied, so a caller passing extra non-writable fields
    // (e.g. workspaceId, docId, docpath, metadata) alongside legitimate ones
    // would have had all of them written through unfiltered.
    const filteredData = {};
    for (const key of validKeys) filteredData[key] = data[key];

    try {
      const document = await prisma.workspace_documents.update({
        where: { id },
        data: filteredData,
      });
      return { document, message: null };
    } catch (error) {
      console.error(error.message);
      return { document: null, message: error.message };
    }
  },
  _updateAll: async function (clause = {}, data = {}) {
    try {
      await prisma.workspace_documents.updateMany({
        where: clause,
        data,
      });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },
  content: async function (docId) {
    if (!docId) throw new Error("No workspace docId provided!");
    const document = await this.get({ docId: String(docId) });
    if (!document) throw new Error(`Could not find a document by id ${docId}`);

    const { fileData } = require("../utils/files");
    const data = await fileData(document.docpath);
    return { title: data.title, content: data.pageContent };
  },
  contentByDocPath: async function (docPath) {
    const { fileData } = require("../utils/files");
    const data = await fileData(docPath);
    return { title: data.title, content: data.pageContent };
  },

  // Some data sources have encoded params in them we don't want to log - so strip those details.
  _stripSource: function (sourceString, type) {
    if (["confluence", "github"].includes(type)) {
      const _src = new URL(sourceString);
      _src.search = ""; // remove all search params that are encoded for resync.
      return _src.toString();
    }

    return sourceString;
  },

  /**
   * Functions for the backend API endpoints - not to be used by the frontend or elsewhere.
   * @namespace api
   */
  api: {
    /**
     * Process a document upload from the API and upsert it into the database. This
     * functionality should only be used by the backend /v1/documents/upload endpoints for post-upload embedding.
     * @param {string} wsSlugs - The slugs of the workspaces to embed the document into, will be comma-separated list of workspace slugs
     * @param {string} docLocation - The location/path of the document that was uploaded
     * @returns {Promise<boolean>} - True if the document was uploaded successfully, false otherwise
     */
    uploadToWorkspace: async function (wsSlugs = "", docLocation = null) {
      if (!docLocation)
        return console.log(
          "No document location provided for embedding",
          docLocation
        );

      const slugs = wsSlugs
        .split(",")
        .map((slug) => String(slug)?.trim()?.toLowerCase());
      if (slugs.length === 0)
        return console.log(`No workspaces provided got: ${wsSlugs}`);

      const { Workspace } = require("./workspace");
      const workspaces = await Workspace.where({ slug: { in: slugs } });
      if (workspaces.length === 0)
        return console.log("No valid workspaces found for slugs: ", slugs);

      // Upsert the document into each workspace - do this sequentially
      // because the document may be large and we don't want to overwhelm the embedder, plus on the first
      // upsert we will then have the cache of the document - making n+1 embeds faster. If we parallelize this
      // we will have to do a lot of extra work to ensure that the document is not embedded more than once.
      for (const workspace of workspaces) {
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          workspace,
          [docLocation]
        );
        if (failedToEmbed.length > 0)
          return console.log(
            `Failed to embed document into workspace ${workspace.slug}`,
            errors
          );
        console.log(`Document embedded into workspace ${workspace.slug}...`);
      }

      return true;
    },
  },
};

module.exports = { Document };
