/**
 * Memory Injection
 *
 * Used by chat handlers (streaming, sync, API) to enrich the system prompt with
 * the user's stored memories so the model has the user's context at every turn.
 *
 * Exports `promptWithMemories(opts)`. Given a base system prompt, it looks up
 * the user's global + workspace memories, reranks the workspace set against
 * the current prompt + recent history (only when there are more than
 * Memory.MAX_INJECTED_WORKSPACE_LIMIT to choose from), formats the selected memories as
 * a markdown section, and appends it to the system prompt. Returns the
 * original prompt unchanged when memories are disabled or the user has none.
 */
const { Memory } = require("../../models/memory");

/**
 * Fetches and formats relevant memories for injection into the system prompt.
 * Returns global memories (up to 5) + top 5 workspace memories (reranked if >5 exist).
 * @param {Object|null} user - the requesting user, carrying their personalization preferences
 * @param {number} workspaceId
 * @param {string} prompt - The current user message
 * @param {object[]} rawHistory - Recent chat history objects with .prompt field
 * @returns {Promise<string>} Formatted memory section or empty string
 */
async function getMemoriesForPrompt(user, workspaceId, prompt, rawHistory) {
  try {
    // Both the instance policy and this person's own preference have to allow it.
    if (!(await Memory.enabledForUser(user))) return "";

    const userId = user?.id ?? null;
    const [globalMemories, workspaceMemories] = await Promise.all([
      Memory.globalForUser(userId),
      Memory.forUserWorkspace(userId, workspaceId),
    ]);

    if (globalMemories.length === 0 && workspaceMemories.length === 0)
      return "";

    let selectedWorkspace = workspaceMemories;
    if (workspaceMemories.length > Memory.MAX_INJECTED_WORKSPACE_LIMIT) {
      const hasContext = prompt?.trim() || rawHistory?.length > 0;
      selectedWorkspace = hasContext
        ? await rerankMemories(workspaceMemories, prompt, rawHistory)
        : workspaceMemories.slice(0, Memory.MAX_INJECTED_WORKSPACE_LIMIT);
    }

    const injectedIds = [
      ...globalMemories.map((m) => m.id),
      ...selectedWorkspace.map((m) => m.id),
    ];
    Memory.updateLastUsed(injectedIds);

    return formatMemories(globalMemories, selectedWorkspace);
  } catch (error) {
    console.error("[Memory Injection] Error:", error.message);
    return "";
  }
}

/**
 * Reranks workspace memories against the current prompt + recent history.
 * Falls back to most recently created memories if reranker fails.
 * @param {object[]} memories
 * @param {string} prompt
 * @param {object[]} rawHistory
 * @returns {Promise<object[]>}
 */
async function rerankMemories(memories, prompt, rawHistory) {
  try {
    const {
      NativeEmbeddingReranker,
    } = require("../EmbeddingRerankers/native/index.js");
    const reranker = new NativeEmbeddingReranker();

    const recentMessages = (rawHistory || [])
      .slice(-3)
      .map((m) => m.prompt)
      .filter(Boolean)
      .join(" ");
    const query = `${prompt} ${recentMessages}`.trim();
    const documents = memories.map((m) => ({ text: m.content }));

    const reranked = await reranker.rerank(query, documents, {
      topK: Memory.MAX_INJECTED_WORKSPACE_LIMIT,
    });

    return reranked.map((r) => memories[r.rerank_corpus_id]);
  } catch (error) {
    console.error(
      "[Memory Injection] Reranker failed, falling back to recent:",
      error.message
    );
    return memories.slice(0, Memory.MAX_INJECTED_WORKSPACE_LIMIT);
  }
}

/**
 * Formats global and workspace memories into a prompt section string.
 * @param {object[]} globalMemories
 * @param {object[]} workspaceMemories
 * @returns {string}
 */
function formatMemories(globalMemories, workspaceMemories) {
  const lines = [];
  for (const m of globalMemories) lines.push(`- ${m.content}`);
  for (const m of workspaceMemories) lines.push(`- ${m.content}`);
  if (lines.length === 0) return "";
  return `## Things I Remember About You\n${lines.join("\n")}`;
}

/**
 * Appends any relevant memories onto a base system prompt.
 * @param {Object} opts
 * @param {string} opts.systemPrompt - The base system prompt
 * @param {Object|null} opts.user - the requesting user
 * @param {number} opts.workspaceId
 * @param {string} [opts.prompt] - Current user message (used for reranking)
 * @param {object[]} [opts.rawHistory] - Recent chat history (used for reranking)
 * @returns {Promise<string>} The system prompt with memories appended (if any)
 */
async function promptWithMemories({
  systemPrompt,
  user,
  workspaceId,
  prompt = "",
  rawHistory = [],
}) {
  const memoriesContext = await getMemoriesForPrompt(
    user,
    workspaceId,
    prompt,
    rawHistory
  );
  return memoriesContext
    ? `${systemPrompt}\n\n${memoriesContext}`
    : systemPrompt;
}

module.exports = { promptWithMemories };
