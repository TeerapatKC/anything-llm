const { v4: uuidv4 } = require("uuid");
const { DocumentManager } = require("../DocumentManager");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { WorkspaceParsedFiles } = require("../../models/workspaceParsedFiles");
const { Document } = require("../../models/documents");
const { EventLogs } = require("../../models/eventLogs");
const {
  getVectorDbClass,
  resolveProviderConnector,
  getBaseLLMProviderModel,
} = require("../helpers");
const { writeResponseChunk } = require("../helpers/chat/responses");
const { supportsVision } = require("../AiProviders/modelCapabilities");
const { grepAgents } = require("./agents");
const {
  grepCommand,
  VALID_COMMANDS,
  chatPrompt,
  recentChatHistory,
  sourceIdentifier,
} = require("./index");

// Structured "why didn't I get an answer" states surfaced alongside the
// existing `type` field on SSE payloads so the frontend can show a specific,
// actionable message instead of one generic error string for every case.
//
// NOTE on NO_PERMISSION: intentionally not emitted from this file. Access to
// a workspace's chat endpoint is gated upstream by validWorkspaceSlug, which
// deliberately returns a bare 404 for both "workspace doesn't exist" and
// "exists but you're not a member" - collapsing those cases avoids letting an
// authenticated-but-unrelated user enumerate which workspace slugs exist on
// the instance. `NO_PERMISSION` IS used (see
// server/utils/middleware/workspaceRoleProtected.js) for workspace-scoped
// admin actions, where the caller already knows the workspace exists by the
// time a permission check can fail.
const CHAT_STATE = {
  KB_EMPTY: "KB_EMPTY",
  DOC_PROCESSING: "DOC_PROCESSING",
  NO_KB_MATCH: "NO_KB_MATCH",
  MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE",
  UNSUPPORTED_ATTACHMENT: "UNSUPPORTED_ATTACHMENT",
  // Distinct from MODEL_UNAVAILABLE: the LLM itself may be fine, it's the
  // retrieval/vector-store layer that failed (unreachable DB, bad namespace).
  VECTOR_DB_UNAVAILABLE: "VECTOR_DB_UNAVAILABLE",
  // Workspace was explicitly set to "inactive" by a workspace/instance admin
  // (Workspace.setStatus) - "closed temporarily" per the product spec, so
  // members should be blocked from chatting until an admin reactivates it.
  WORKSPACE_INACTIVE: "WORKSPACE_INACTIVE",
};

/**
 * Best-effort extraction of a page number from a chunkSource string, e.g. the
 * PDF-fragment convention "...somefile.pdf#page=12". Not all loaders encode a
 * page number at all - returns null when one can't be determined, rather than
 * guessing.
 * @param {string} chunkSource
 * @returns {number|null}
 */
function extractPageNumber(chunkSource = "") {
  if (!chunkSource || typeof chunkSource !== "string") return null;
  const pageFragmentMatch = chunkSource.match(/[#&]page=(\d+)/i);
  return pageFragmentMatch ? Number(pageFragmentMatch[1]) : null;
}

/**
 * Normalizes a citation/source object so the frontend can rely on `docId`
 * (for an "open document" action) and `pageNumber` (when determinable) always
 * being present keys, even when null.
 * @param {Object} source
 * @returns {Object}
 */
function enrichCitation(source = {}) {
  return {
    ...source,
    docId: source.docId ?? null,
    pageNumber: source.pageNumber ?? extractPageNumber(source.chunkSource),
  };
}

const VALID_CHAT_MODE = ["automatic", "chat", "query"];

async function streamChatWithWorkspace(
  response,
  workspace,
  message,
  chatMode = "automatic",
  user = null,
  thread = null,
  attachments = []
) {
  const uuid = uuidv4();

  if (workspace?.status === "inactive") {
    return writeResponseChunk(response, {
      id: uuid,
      type: "abort",
      state: CHAT_STATE.WORKSPACE_INACTIVE,
      textResponse: null,
      sources: [],
      close: true,
      error:
        "This workspace has been temporarily closed by an administrator and is not accepting messages right now.",
    });
  }

  const updatedMessage = await grepCommand(message, user);

  if (Object.keys(VALID_COMMANDS).includes(updatedMessage)) {
    const data = await VALID_COMMANDS[updatedMessage](
      workspace,
      message,
      uuid,
      user,
      thread
    );
    writeResponseChunk(response, data);
    return;
  }

  // If is agent enabled chat we will exit this flow early.
  // Wrapped because "automatic" chat mode probes the agent/tool-calling
  // provider here - if the workspace/system has no valid provider configured
  // at all, this throws synchronously and (without this catch) would bubble
  // all the way up to chat.js's generic handler, losing the structured
  // `state` field entirely (found via manual testing against an unconfigured
  // provider - see MODEL_UNAVAILABLE below).
  let isAgentChat = false;
  try {
    isAgentChat = await grepAgents({
      uuid,
      response,
      message: updatedMessage,
      user,
      workspace,
      thread,
      attachments,
    });
  } catch (error) {
    await EventLogs.logFailure(
      "llm_chat_failed",
      { workspaceName: workspace?.name, stage: "agent_detection", error: error.message },
      user?.id
    );
    return writeResponseChunk(response, {
      id: uuid,
      type: "abort",
      state: CHAT_STATE.MODEL_UNAVAILABLE,
      textResponse: null,
      sources: [],
      close: true,
      error: `The AI model is currently unavailable: ${error.message}`,
    });
  }
  if (isAgentChat) return;

  const {
    connector: LLMConnector,
    routingMetadata,
    prefetchedContext,
    error: routerError,
  } = await resolveLLMConnector({
    workspace,
    message: updatedMessage,
    user,
    thread,
    attachments,
  });

  if (routerError) {
    await EventLogs.logFailure(
      "llm_chat_failed",
      { workspaceName: workspace?.name, stage: "connector_resolution", error: routerError },
      user?.id
    );
    return writeResponseChunk(response, {
      id: uuid,
      type: "abort",
      state: CHAT_STATE.MODEL_UNAVAILABLE,
      textResponse: null,
      sources: [],
      close: true,
      error: routerError,
    });
  }

  if (routingMetadata?.routedTo?.shouldNotify) {
    writeResponseChunk(response, {
      uuid: `${uuid}:route`,
      type: "modelRouteNotification",
      routedTo: routingMetadata.routedTo,
    });
  }

  // Best-effort pre-check: if the resolved provider/model is known NOT to
  // support vision, fail fast with a friendly state instead of sending the
  // attachment to the provider and surfacing an opaque error. Anything not
  // confidently "false" (including router-resolved models) is allowed through.
  if (attachments.length > 0) {
    const visionProvider = workspace?.chatProvider || process.env.LLM_PROVIDER;
    const visionModel =
      workspace?.chatModel || getBaseLLMProviderModel({ provider: visionProvider });
    if (supportsVision(visionProvider, visionModel) === false) {
      return writeResponseChunk(response, {
        id: uuid,
        type: "abort",
        state: CHAT_STATE.UNSUPPORTED_ATTACHMENT,
        textResponse: null,
        sources: [],
        close: true,
        error: `The current model (${visionModel || "unknown"}) does not support image/file attachments.`,
      });
    }
  }

  const VectorDb = getVectorDbClass();

  // `??` (not `||`) so an explicit 0 - "send no chat history" - is respected;
  // `0 || 20` would silently discard that setting and use the default instead.
  const messageLimit = workspace?.openAiHistory ?? 20;
  const [hasVectorizedSpace, embeddingsCount] = await Promise.all([
    VectorDb.hasNamespace(workspace.slug),
    VectorDb.namespaceCount(workspace.slug),
  ]);

  // User is trying to query-mode chat a workspace that has no data in it - so
  // we should exit early as no information can be found under these conditions.
  if ((!hasVectorizedSpace || embeddingsCount === 0) && chatMode === "query") {
    // Distinguish "documents are still being processed" (actionable - wait)
    // from "there are simply no documents at all" (also actionable - upload).
    const stillProcessingCount = await Document.count({
      workspaceId: workspace.id,
      status: { in: ["queued", "processing"] },
    });
    const state =
      stillProcessingCount > 0 ? CHAT_STATE.DOC_PROCESSING : CHAT_STATE.KB_EMPTY;
    const textResponse =
      workspace?.queryRefusalResponse ??
      (state === CHAT_STATE.DOC_PROCESSING
        ? "Some documents in this workspace are still being processed. Please try again shortly."
        : "This workspace does not have any documents ready yet.");
    writeResponseChunk(response, {
      id: uuid,
      type: "textResponse",
      state,
      textResponse,
      sources: [],
      attachments,
      close: true,
      error: null,
    });
    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: textResponse,
        sources: [],
        type: chatMode,
        attachments,
      },
      threadId: thread?.id || null,
      include: false,
      user,
    });
    return;
  }

  // If we are here we know that we are in a workspace that is:
  // 1. Chatting in "chat" mode and may or may _not_ have embeddings
  // 2. Chatting in "query" mode and has at least 1 embedding
  let completeText;
  let metrics = {};
  let contextTexts = [];
  let sources = [];
  let pinnedDocIdentifiers = [];

  // If the router pre-fetched context we can reuse it; otherwise fetch fresh.
  const {
    rawHistory,
    chatHistory,
    pinnedDocs: prefetchedPinnedDocs,
    parsedFiles: prefetchedParsedFiles,
  } = prefetchedContext ??
  (await recentChatHistory({ user, workspace, thread, messageLimit }));

  // Pinned docs — reuse pre-fetched if available, otherwise fetch with token cap.
  const pinnedDocs =
    prefetchedPinnedDocs ??
    (await new DocumentManager({
      workspace,
      maxTokens: LLMConnector.promptWindowLimit(),
    }).pinnedDocs());
  pinnedDocs.forEach((doc) => {
    const { pageContent, ...metadata } = doc;
    pinnedDocIdentifiers.push(sourceIdentifier(doc));
    contextTexts.push(doc.pageContent);
    sources.push(
      enrichCitation({
        text:
          pageContent.slice(0, 1_000) +
          "...continued on in source document...",
        ...metadata,
      })
    );
  });

  // Parsed files — reuse pre-fetched if available, otherwise fetch fresh.
  const parsedFiles =
    prefetchedParsedFiles ??
    (await WorkspaceParsedFiles.getContextFiles(
      workspace,
      thread || null,
      user || null
    ));
  parsedFiles.forEach((doc) => {
    const { pageContent, ...metadata } = doc;
    contextTexts.push(doc.pageContent);
    sources.push(
      enrichCitation({
        text:
          pageContent.slice(0, 1_000) +
          "...continued on in source document...",
        ...metadata,
      })
    );
  });

  const vectorSearchResults =
    embeddingsCount !== 0
      ? await VectorDb.performSimilaritySearch({
          namespace: workspace.slug,
          input: updatedMessage,
          LLMConnector,
          similarityThreshold: workspace?.similarityThreshold,
          topN: workspace?.topN,
          filterIdentifiers: pinnedDocIdentifiers,
          rerank: workspace?.vectorSearchMode === "rerank",
        })
      : {
          contextTexts: [],
          sources: [],
          message: null,
        };

  // Failed similarity search if it was run at all and failed.
  if (!!vectorSearchResults.message) {
    await EventLogs.logFailure(
      "vectordb_operation_failed",
      {
        workspaceName: workspace?.name,
        stage: "similarity_search",
        error: vectorSearchResults.message,
      },
      user?.id
    );
    writeResponseChunk(response, {
      id: uuid,
      type: "abort",
      state: CHAT_STATE.VECTOR_DB_UNAVAILABLE,
      textResponse: null,
      sources: [],
      close: true,
      error: vectorSearchResults.message,
    });
    return;
  }

  // Soft-disabled documents stay embedded in the vector DB but must be excluded
  // from RAG context/citations until re-enabled. Filtered here (post-search)
  // rather than at the vector-DB layer for V.1 simplicity.
  if (vectorSearchResults.sources.length > 0) {
    const disabledDocIds = new Set(
      (
        await Document.where({
          workspaceId: workspace.id,
          status: "disabled",
        })
      ).map((doc) => doc.docId)
    );
    if (disabledDocIds.size > 0) {
      vectorSearchResults.sources = vectorSearchResults.sources.filter(
        (source) => !disabledDocIds.has(source.docId)
      );
    }
  }

  const { fillSourceWindow } = require("../helpers/chat");
  const filledSources = fillSourceWindow({
    nDocs: workspace?.topN || 4,
    searchResults: vectorSearchResults.sources,
    history: rawHistory,
    filterIdentifiers: pinnedDocIdentifiers,
  });

  // Why does contextTexts get all the info, but sources only get current search?
  // This is to give the ability of the LLM to "comprehend" a contextual response without
  // populating the Citations under a response with documents the user "thinks" are irrelevant
  // due to how we manage backfilling of the context to keep chats with the LLM more correct in responses.
  // If a past citation was used to answer the question - that is visible in the history so it logically makes sense
  // and does not appear to the user that a new response used information that is otherwise irrelevant for a given prompt.
  // TLDR; reduces GitHub issues for "LLM citing document that has no answer in it" while keep answers highly accurate.
  contextTexts = [...contextTexts, ...filledSources.contextTexts];
  sources = [...sources, ...vectorSearchResults.sources.map(enrichCitation)];

  // If in query mode and no context chunks are found from search, backfill, or pins -  do not
  // let the LLM try to hallucinate a response or use general knowledge and exit early
  if (chatMode === "query" && contextTexts.length === 0) {
    const textResponse =
      workspace?.queryRefusalResponse ??
      "There is no relevant information in this workspace to answer your query.";
    writeResponseChunk(response, {
      id: uuid,
      type: "textResponse",
      state: CHAT_STATE.NO_KB_MATCH,
      textResponse,
      sources: [],
      close: true,
      error: null,
    });

    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: textResponse,
        sources: [],
        type: chatMode,
        attachments,
      },
      threadId: thread?.id || null,
      include: false,
      user,
    });
    return;
  }

  // Compress & Assemble message to ensure prompt passes token limit with room for response
  // and build system messages based on inputs and history.
  // Reuse the system prompt from routing pre-fetch when available.
  const systemPrompt =
    prefetchedContext?.systemPrompt ??
    (await chatPrompt(workspace, user, {
      prompt: updatedMessage,
      rawHistory,
    }));
  const messages = await LLMConnector.compressMessages(
    {
      systemPrompt,
      userPrompt: updatedMessage,
      contextTexts,
      chatHistory,
      attachments,
    },
    rawHistory
  );

  // If streaming is not explicitly enabled for connector
  // we do regular waiting of a response and send a single chunk.
  try {
    if (LLMConnector.streamingEnabled() !== true) {
      console.log(
        `\x1b[31m[STREAMING DISABLED]\x1b[0m Streaming is not available for ${LLMConnector.constructor.name}. Will use regular chat method.`
      );
      const { textResponse, metrics: performanceMetrics } =
        await LLMConnector.getChatCompletion(messages, {
          temperature: workspace?.openAiTemp ?? LLMConnector.defaultTemp,
          user: user,
        });

      completeText = textResponse;
      metrics = performanceMetrics;
      writeResponseChunk(response, {
        uuid,
        sources,
        type: "textResponseChunk",
        textResponse: completeText,
        close: true,
        error: false,
        metrics,
      });
    } else {
      const stream = await LLMConnector.streamGetChatCompletion(messages, {
        temperature: workspace?.openAiTemp ?? LLMConnector.defaultTemp,
        user: user,
      });
      completeText = await LLMConnector.handleStream(response, stream, {
        uuid,
        sources,
      });
      metrics = stream.metrics;
    }
  } catch (error) {
    await EventLogs.logFailure(
      "llm_chat_failed",
      {
        workspaceName: workspace?.name,
        stage: "completion",
        error: error.message,
      },
      user?.id
    );
    return writeResponseChunk(response, {
      uuid,
      type: "abort",
      state: CHAT_STATE.MODEL_UNAVAILABLE,
      textResponse: null,
      sources: [],
      close: true,
      error: `The AI model is currently unavailable: ${error.message}`,
    });
  }

  if (completeText?.length > 0) {
    const { chat } = await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: completeText,
        sources,
        type: chatMode,
        attachments,
        metrics,
      },
      threadId: thread?.id || null,
      user,
    });

    writeResponseChunk(response, {
      uuid,
      type: "finalizeResponseStream",
      close: true,
      error: false,
      chatId: chat.id,
      metrics,
    });
    return;
  }

  writeResponseChunk(response, {
    uuid,
    type: "finalizeResponseStream",
    close: true,
    error: false,
    metrics,
  });
  return;
}

async function resolveLLMConnector({
  workspace,
  message,
  user,
  thread,
  attachments,
}) {
  try {
    const result = await resolveProviderConnector({
      workspace,
      prompt: message,
      user,
      thread,
      attachments,
    });
    return { ...result, error: null };
  } catch (routerError) {
    return {
      connector: null,
      routingMetadata: null,
      prefetchedContext: null,
      error: `Model router error: ${routerError.message}`,
    };
  }
}

module.exports = {
  VALID_CHAT_MODE,
  streamChatWithWorkspace,
};
