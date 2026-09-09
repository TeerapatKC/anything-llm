const {
  getVectorDbClass,
  resolveProviderConnector,
} = require("../../../helpers");
const { Deduplicator } = require("../utils/dedupe");
const { Memory } = require("../../../../models/memory");
const { User } = require("../../../../models/user");

const memory = {
  name: "rag-memory",
  startupConfig: {
    params: {},
  },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          tracker: new Deduplicator(),
          name: this.name,
          description:
            "Search your local documents and workspace files for relevant information, or store information to long-term memory. Use search to find answers in uploaded documents, embedded files, or previously stored memories. Use store only when explicitly asked to remember or save something.",
          examples: [
            {
              prompt: "Check my files for information about the project",
              call: JSON.stringify({
                action: "search",
                content: "<project information to search for>",
              }),
            },
            {
              prompt: "What do you know about Plato's motives?",
              call: JSON.stringify({
                action: "search",
                content: "What are the facts about Plato's motives?",
              }),
            },
            {
              prompt: "Remember that you are a robot",
              call: JSON.stringify({
                action: "store",
                content: "I am a robot, the user told me that i am.",
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["search", "store"],
                description:
                  "The action we want to take to search for existing similar context or storage of new context.",
              },
              content: {
                type: "string",
                description:
                  "The plain text to search our local documents with or to store in our vector database.",
              },
            },
            additionalProperties: false,
          },
          handler: async function ({ action = "", content = "" }) {
            try {
              const { isDuplicate } = this.tracker.isDuplicate(this.name, {
                action,
                content,
              });
              if (isDuplicate)
                return `This was a duplicated call and it's output will be ignored.`;

              let response = "There was nothing to do.";
              if (action === "search") response = await this.search(content);
              if (action === "store") response = await this.store(content);

              this.tracker.trackRun(this.name, { action, content });
              return response;
            } catch (error) {
              console.log(error);
              return `There was an error while calling the function. ${error.message}`;
            }
          },
          search: async function (query = "") {
            try {
              const workspace = this.super.handlerProps.invocation.workspace;
              const { connector: LLMConnector } =
                await resolveProviderConnector({
                  workspace,
                  prompt: query,
                });
              const vectorDB = getVectorDbClass();
              const { contextTexts = [], sources = [] } =
                await vectorDB.performSimilaritySearch({
                  namespace: workspace.slug,
                  input: query,
                  LLMConnector,
                  similarityThreshold: workspace?.similarityThreshold,
                  topN: workspace?.topN ?? 4,
                  rerank: workspace?.vectorSearchMode === "rerank",
                });

              if (contextTexts.length === 0) {
                this.super.introspect(
                  `${this.caller}: I didn't find anything locally that would help answer this question.`
                );
                return "There was no additional context found for that query. We should search the web for this information.";
              }

              this.super.introspect(
                `${this.caller}: Found ${contextTexts.length} additional piece of context to help answer this question.`
              );

              const { visibleSources } = await Memory.migrateLegacySources(
                sources,
                this.super.handlerProps.invocation.user_id,
                workspace
              );
              this.super.addCitation?.(visibleSources);

              let combinedText = "Additional context for query:\n";
              for (const text of contextTexts) combinedText += text + "\n\n";
              return combinedText;
            } catch (error) {
              this.super.handlerProps.log(
                `memory.search raised an error. ${error.message}`
              );
              return `An error was raised while searching the vector database. ${error.message}`;
            }
          },
          store: async function (content = "") {
            try {
              const invocation = this.super.handlerProps.invocation;
              const workspace = invocation.workspace;
              const userId = invocation.user_id
                ? Number(invocation.user_id)
                : null;
              const user = userId ? await User.get({ id: userId }) : null;
              if (!(await Memory.enabledForUser(user)))
                return "Personalization and memories are disabled.";

              const existing = await Memory.get({
                userId,
                workspaceId: Number(workspace.id),
                scope: "workspace",
                content,
              });
              if (existing)
                return "This fact is already present in workspace memory.";

              const { memory: storedMemory, message } = await Memory.create({
                userId,
                workspaceId: Number(workspace.id),
                scope: "workspace",
                content,
              });
              if (!storedMemory)
                return `The memory could not be saved. ${message || "Unknown error."}`;

              this.super.introspect(
                `${this.caller}: I saved the content to the user's workspace memories.`
              );
              return "The content was saved to workspace memory successfully.";
            } catch (error) {
              this.super.handlerProps.log(
                `memory.store raised an error. ${error.message}`
              );
              return `Let the user know this action was not successful. An error was raised while storing workspace memory. ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = {
  memory,
};
