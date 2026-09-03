const { TokenManager } = require("../../../helpers/tiktoken");
const {
  NativeEmbeddingReranker,
} = require("../../../EmbeddingRerankers/native");

const MAX_TEXT_LENGTH = 1000;

class ToolReranker {
  /**
   * The default number of top tools to keep after reranking
   * @type {number}
   */
  static defaultTopN = 15;

  static instance = null;

  constructor() {
    if (ToolReranker.instance) return ToolReranker.instance;
    ToolReranker.instance = this;
    this.tokenManager = new TokenManager();
    this.reranker = null;
    this.toolGroups = null;
  }

  log(text, ...args) {
    console.log(`\x1b[33m[IntelligentSkillSelector]\x1b[0m ${text}`, ...args);
  }

  /**
   * Check if tool reranking is enabled via environment variable
   * @returns {boolean}
   */
  static isEnabled() {
    if (!("AGENT_SKILL_RERANKER_ENABLED" in process.env)) return true;
    if (process.env.AGENT_SKILL_RERANKER_ENABLED === "false") return false;
    return true;
  }

  /**
   * Get the configured topN value from environment or use default
   * @returns {number}
   */
  static getTopN() {
    const envTopN = parseInt(process.env.AGENT_SKILL_RERANKER_TOP_N, 10);
    return !isNaN(envTopN) && envTopN > 0 ? envTopN : ToolReranker.defaultTopN;
  }

  /**
   * Truncate text to max length, trying to break at word boundary
   */
  #truncateText(text, maxLength = MAX_TEXT_LENGTH) {
    if (!text || text.length <= maxLength) return text;
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    return lastSpace > maxLength * 0.8
      ? truncated.slice(0, lastSpace)
      : truncated;
  }

  /**
   * Get or initialize the reranker instance
   */
  async #getReranker() {
    if (!this.reranker) {
      this.reranker = new NativeEmbeddingReranker();
      await this.reranker.initClient();
    }
    return this.reranker;
  }

  /**
   * Build a map of tool name -> the set of sibling tool names that belong to the
   * same multi-stage skill (e.g. sql-agent's list-databases/list-tables/
   * get-table-schema/query, or filesystem-agent's read/write/list/etc children).
   *
   * Multi-stage skills are a pipeline: a "query"-type tool is frequently useless
   * without the "discovery"-type tools that precede it (you can't sql-query a
   * database you never listed). Semantic similarity to the user's prompt has no
   * notion of that dependency, so reranking alone can drop the discovery tool
   * while keeping the now-unusable query tool. Grouping lets rerank() pin whole
   * skills back together instead of only the highest-scoring member.
   * @returns {Map<string, Set<string>>}
   */
  #getToolGroups() {
    if (this.toolGroups) return this.toolGroups;
    const groups = new Map();
    try {
      const AgentPlugins = require("../plugins");
      for (const key of Object.keys(AgentPlugins)) {
        const entry = AgentPlugins[key];
        if (!Array.isArray(entry?.plugin)) continue;
        const names = entry.plugin.map((child) => child.name).filter(Boolean);
        if (names.length < 2) continue;
        const nameSet = new Set(names);
        for (const name of names) groups.set(name, nameSet);
      }
    } catch (error) {
      this.log(`Could not load tool groups for pinning: ${error.message}`);
    }
    this.toolGroups = groups;
    return groups;
  }

  /**
   * Convert a tool/function definition to a text representation for reranking.
   * @param {Object} tool - The tool definition object
   * @returns {{text: string, toolName: string, tool: Object, tokens: number}}
   */
  #toolToDocument(tool) {
    const parts = [];
    if (!tool || !tool.name)
      return { text: null, toolName: null, tool: null, tokens: 0 };

    parts.push(tool.name);
    if (tool.description) parts.push(tool.description);

    if (tool.parameters?.properties) {
      const paramNames = Object.keys(tool.parameters.properties);
      if (paramNames.length > 0) {
        const paramDescriptions = paramNames.map((name) => {
          const prop = tool.parameters.properties[name];
          return prop.description ? `${name}: ${prop.description}` : name;
        });
        parts.push(paramDescriptions.join(", "));
      }
    }

    if (
      tool.examples &&
      Array.isArray(tool.examples) &&
      tool.examples.length > 0
    ) {
      const examplePrompts = tool.examples
        .map((ex) => ex.prompt)
        .filter(Boolean);
      if (examplePrompts.length > 0) {
        parts.push(examplePrompts.join("; "));
      }
    }

    const textContent = parts.join("\n");
    return {
      text: textContent,
      toolName: tool.name,
      tool,
      tokens: this.tokenManager.countFromString(textContent),
    };
  }

  /**
   * Rerank tools based on the user prompt and return the top N most relevant tools.
   * Uses chunked processing to handle large numbers of tools efficiently.
   * @param {string} userPrompt - The user's query/prompt
   * @param {Object[]} tools - Array of tool/function definitions from aibitat.functions
   * @param {Object} options - Options for reranking
   * @param {number} options.topN - Number of top tools to return
   * @param {boolean} options.enabled - Overrides the instance-wide on/off switch, so a
   * workspace that turned reranking on can still use it while the instance default is off.
   * @returns {Promise<Object[]>} - Array of reranked tools (top N)
   */
  async rerank(userPrompt, tools = [], options = {}) {
    const {
      enabled = ToolReranker.isEnabled(),
      topN = ToolReranker.getTopN(),
    } = options;
    if (!enabled) return tools;
    if (!tools || tools.length === 0) return tools;

    if (tools.length <= topN) {
      this.log(`${tools.length} tools <= ${topN}, skipping reranking`);
      return tools;
    }

    try {
      this.log(`Starting tool reranking for ${tools.length} tools...`);
      const documents = tools.map((tool) => this.#toolToDocument(tool));
      const originalTokenCount = documents.reduce(
        (acc, doc) => acc + doc.tokens,
        0
      );

      const startTime = Date.now();
      // Truncate and format documents for reranking
      const rerankDocs = documents.map((doc) => ({
        text: this.#truncateText(doc.text),
      }));

      const reranker = await this.#getReranker();
      const reranked = await reranker.rerank(
        this.#truncateText(userPrompt),
        rerankDocs,
        { topK: topN }
      );
      const elapsedMs = Date.now() - startTime;

      const rerankedIndices = reranked.map((doc) => ({
        index: doc.rerank_corpus_id,
        score: doc.rerank_score,
      }));

      // Reranking alone can split a multi-stage skill across the cut line - e.g.
      // keep sql-query but drop sql-list-databases, leaving the agent a query
      // tool it has no way to address. Pin whole groups back together so a
      // skill that made the cut always travels with every stage it needs.
      const toolGroups = this.#getToolGroups();
      const toolByName = new Map(
        documents.map((doc) => [doc.toolName, doc])
      );
      const selectedNames = new Set(
        rerankedIndices.map(({ index }) => documents[index].toolName)
      );
      const pinnedNames = [];
      for (const name of Array.from(selectedNames)) {
        const siblings = toolGroups.get(name);
        if (!siblings) continue;
        for (const sibling of siblings) {
          if (selectedNames.has(sibling) || !toolByName.has(sibling)) continue;
          selectedNames.add(sibling);
          pinnedNames.push(sibling);
        }
      }

      const rerankedTools = rerankedIndices
        .map(({ index }) => documents[index].tool)
        .concat(pinnedNames.map((name) => toolByName.get(name).tool));
      const newTokenCount =
        rerankedIndices.reduce((acc, { index }) => acc + documents[index].tokens, 0) +
        pinnedNames.reduce((acc, name) => acc + toolByName.get(name).tokens, 0);
      const percentSaved = Math.round(
        ((originalTokenCount - newTokenCount) / originalTokenCount) * 100
      );
      this.log(`
Identified top ${rerankedIndices.length} of ${tools.length} tools in ${elapsedMs}ms${pinnedNames.length ? `, pinned ${pinnedNames.length} more to keep multi-stage skills intact` : ""}
${originalTokenCount.toLocaleString()} -> ${newTokenCount.toLocaleString()} tokens \x1b[0;93m(${percentSaved}% reduction)\x1b[0m`);

      let logText = "Selected tools:\n";
      rerankedIndices.forEach(({ index }, i) => {
        logText += `  ${i + 1}. ${documents[index].toolName}\n`;
      });
      pinnedNames.forEach((name, i) => {
        logText += `  ${rerankedIndices.length + i + 1}. ${name} (pinned - sibling of a selected multi-stage skill)\n`;
      });
      this.log(logText);
      return rerankedTools;
    } catch (error) {
      this.log(`Error during tool reranking: ${error.message}`);
      this.log("Falling back to original tool set");
      return tools;
    }
  }
}

module.exports = { ToolReranker };
