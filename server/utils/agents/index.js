const AIbitat = require("./aibitat");
const AgentPlugins = require("./aibitat/plugins");
const {
  WorkspaceAgentInvocation,
} = require("../../models/workspaceAgentInvocation");
const { WorkspaceParsedFiles } = require("../../models/workspaceParsedFiles");
const { User } = require("../../models/user");
const { Workspace } = require("../../models/workspace");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { safeJsonParse } = require("../http");
const {
  USER_AGENT,
  WORKSPACE_AGENT,
  resolveAgentSkill,
} = require("./defaults");
const { AgentFlows } = require("../agentFlows");
const MCPCompatibilityLayer = require("../MCP");
const { getAndClearInvocationAttachments } = require("../chats/agents");
const { DocumentManager } = require("../DocumentManager");

class AgentHandler {
  #invocationUUID;
  #funcsToLoad = [];
  // Startup args (socket, etc.) retained so tools toggled on mid-session can be
  // loaded with the same options used at session start.
  #args = null;
  invocation = null;
  aibitat = null;
  channel = null;
  provider = null;
  model = null;
  attachments = [];

  constructor({ uuid }) {
    this.#invocationUUID = uuid;
  }

  log(text, ...args) {
    console.log(`\x1b[36m[AgentHandler]\x1b[0m ${text}`, ...args);
  }

  closeAlert() {
    this.log(`End ${this.#invocationUUID}::${this.provider}:${this.model}`);
  }

  /**
   * Determine if the message should invoke the agent handler.
   * This is true when the user explicitly invokes an agent (via @agent prefix)
   * or when the workspace is in automatic mode **and** the provider supports native tool calling.
   * @param {object} parameters
   * @param {string} parameters.message - The message to check for agent invocation.
   * @param { import("@prisma/client").workspaces} parameters.workspace - The workspace to check for agent invocation.
   * @param {string} parameters.chatMode - The chat mode to check for agent invocation.
   * @returns {Promise<boolean>}
   */
  static async isAgentInvocation({
    message,
    workspace = null,
    chatMode = null,
  }) {
    if (this.#isAgentCommandInvocation({ message })) return true;
    if (chatMode === "automatic") {
      if (!workspace) return false;
      if (await Workspace.supportsNativeToolCalling(workspace)) return true;
      return false;
    }
    return false;
  }

  /**
   * Determine if the message provided is an agent invocation.
   * @param {{message:string}} parameters
   * @returns {boolean}
   */
  static #isAgentCommandInvocation({ message }) {
    const agentHandles = WorkspaceAgentInvocation.parseAgents(message);
    if (agentHandles.length > 0) return true;
    return false;
  }

  async #chatHistory(limit = 10) {
    try {
      const rawHistory = (
        await WorkspaceChats.where(
          {
            workspaceId: this.invocation.workspace_id,
            user_id: this.invocation.user_id || null,
            thread_id: this.invocation.thread_id || null,
            api_session_id: null,
            include: true,
          },
          limit,
          { id: "desc" }
        )
      ).reverse();

      const { generatedImageAttachments } = require("../files");
      const agentHistory = [];
      rawHistory.forEach((chatLog) => {
        const response = safeJsonParse(chatLog.response, {});
        // Re-read `/img` generated images off disk as attachments so they reach
        // the agent as vision context, the same way they do in normal chat.
        const attachments = generatedImageAttachments(response?.outputs);
        agentHistory.push(
          {
            from: USER_AGENT.name,
            to: WORKSPACE_AGENT.name,
            content: chatLog.prompt,
            state: "success",
            ...(attachments.length > 0 ? { attachments } : {}),
          },
          {
            from: WORKSPACE_AGENT.name,
            to: USER_AGENT.name,
            content: response?.text || "",
            state: "success",
          }
        );
      });
      return agentHistory;
    } catch (e) {
      this.log("Error loading chat history", e.message);
      return [];
    }
  }

  checkSetup() {
    if (!process.env.GENERIC_OPEN_AI_BASE_PATH)
      throw new Error(
        "Generic OpenAI API base path must be configured for agents."
      );
  }

  /**
   * Finds the default model for a given provider. If no default model is set for it's associated ENV then
   * it will return a reasonable base model for the provider if one exists.
   * @param {string} provider - The provider to find the default model for.
   * @returns {string|null} The default model for the provider.
   */
  providerDefault() {
    return process.env.GENERIC_OPEN_AI_MODEL_PREF || null;
  }

  /**
   * Attempts to find a fallback provider and model to use if the workspace
   * does not have an explicit `agentProvider` and `agentModel` set.
   * 1. Fallback to the workspace `chatProvider` and `chatModel` if they exist.
   * 2. Fallback to the system `LLM_PROVIDER` and try to load the associated default model via ENV params or a base available model.
   * 3. Otherwise, return null - will likely throw an error the user can act on.
   * @returns {object|null} - An object with provider and model keys.
   */
  #getFallbackProvider() {
    // If workspace chat uses the model router, fall back to it.
    // Model is null here since the router determines it at resolve time.
    if (this.invocation.workspace.chatProvider === "nexusai-router") {
      return { provider: "nexusai-router", model: null };
    }

    // First, fallback to the workspace chat provider and model if they exist
    if (
      this.invocation.workspace.chatProvider &&
      this.invocation.workspace.chatModel
    ) {
      return {
        provider: this.invocation.workspace.chatProvider,
        model: this.invocation.workspace.chatModel,
      };
    }

    // If workspace does not have chat provider and model fallback
    // to system provider and try to load provider default model
    const systemProvider = process.env.LLM_PROVIDER;
    if (systemProvider === "nexusai-router") {
      return { provider: "nexusai-router", model: null };
    }

    const systemModel = this.providerDefault(systemProvider);
    if (systemProvider && systemModel) {
      return {
        provider: systemProvider,
        model: systemModel,
      };
    }

    return null;
  }

  /**
   * Finds or assumes the model preference value to use for API calls.
   * If multi-model loading is supported, we use their agent model selection of the workspace
   * If not supported, we attempt to fallback to the system provider value for the LLM preference
   * and if that fails - we assume a reasonable base model to exist.
   * @returns {string|null} the model preference value to use in API calls
   */
  #fetchModel() {
    // Provider was not explicitly set for workspace, so we are going to run our fallback logic
    // that will set a provider and model for us to use.
    if (!this.provider) {
      const fallback = this.#getFallbackProvider();
      if (!fallback) throw new Error("No valid provider found for the agent.");
      this.provider = fallback.provider; // re-set the provider to the fallback provider so it is not null.
      return fallback.model; // set its defined model based on fallback logic.
    }

    // The provider was explicitly set, so check if the workspace has an agent model set.
    if (this.invocation.workspace.agentModel)
      return this.invocation.workspace.agentModel;

    // Otherwise, we have no model to use - so guess a default model to use via the provider
    // and it's system ENV params and if that fails - we return either a base model or null.
    return this.providerDefault();
  }

  async #providerSetupAndCheck() {
    this.provider = this.invocation.workspace.agentProvider ?? null; // set provider to workspace agent provider if it exists
    this.model = this.#fetchModel();

    // If provider resolved to model router, resolve the actual provider/model
    if (this.provider === "nexusai-router") {
      await this.#resolveRouterProvider();
    }

    if (this.provider !== "generic-openai") {
      this.provider = "generic-openai";
      this.model = this.providerDefault();
    }
    this.log(`Start ${this.#invocationUUID}::${this.provider}:${this.model}`);
    this.checkSetup();
  }

  async #resolveRouterProvider(prompt = null) {
    const { NexusAIModelRouter } = require("../AiProviders/modelRouter");
    const routerWorkspace = this.invocation.workspace.router_id
      ? this.invocation.workspace
      : {
          ...this.invocation.workspace,
          router_id: process.env.MODEL_ROUTER_ID
            ? Number(process.env.MODEL_ROUTER_ID)
            : null,
        };

    // Resolve the thread slug from the numeric thread_id so the route cache key
    // matches the key used everywhere else.
    let thread = null;
    if (this.invocation.thread_id) {
      if (!this._threadSlug) {
        const { WorkspaceThread } = require("../../models/workspaceThread");
        const threadRecord = await WorkspaceThread.get({
          id: this.invocation.thread_id,
        });
        this._threadSlug = threadRecord?.slug || null;
      }
      thread = this._threadSlug ? { slug: this._threadSlug } : null;
    }

    const router = new NexusAIModelRouter(routerWorkspace);
    const { ModelRouterService } = require("../router");
    const workspace = this.invocation.workspace;
    const user = this.invocation.user_id
      ? { id: this.invocation.user_id }
      : null;
    const effectivePrompt = prompt || this.invocation.prompt;
    const ctx = await ModelRouterService.gatherRoutingContext({
      workspace,
      user,
      thread: this.invocation.thread_id
        ? { id: this.invocation.thread_id }
        : null,
      message: effectivePrompt,
    });

    await router.resolve(
      {
        prompt: effectivePrompt,
        conversationTokenCount: ctx.conversationTokenCount,
        conversationMessageCount: ctx.conversationMessageCount,
        attachments: this.attachments || [],
      },
      { user, thread }
    );

    this.provider = "generic-openai";
    this.model =
      router.resolvedRoute.provider === "generic-openai"
        ? router.resolvedRoute.model
        : this.providerDefault();
    this.routingMetadata = router.routingMetadata;
    // Held so the model-router-cooldown plugin can restart the cooldown when
    // the agent stops responding. Routing re-resolves per turn, so this always
    // points at the router for the current route.
    this._modelRouter = router;
  }

  async #validInvocation() {
    const invocation = await WorkspaceAgentInvocation.getWithWorkspace({
      uuid: String(this.#invocationUUID),
    });
    if (invocation?.closed)
      throw new Error("This agent invocation is already closed");
    this.invocation = invocation ?? null;
  }

  parseCallOptions(args, config = {}, pluginName) {
    const callOpts = {};
    for (const [param, definition] of Object.entries(config)) {
      if (
        definition.required &&
        (!Object.prototype.hasOwnProperty.call(args, param) ||
          args[param] === null)
      ) {
        this.log(
          `'${param}' required parameter for '${pluginName}' plugin is missing. Plugin may not function or crash agent.`
        );
        continue;
      }
      callOpts[param] = Object.prototype.hasOwnProperty.call(args, param)
        ? args[param]
        : definition.default || null;
    }
    return callOpts;
  }

  async #attachPlugins(args) {
    for (const name of this.#funcsToLoad)
      await this.#attachPluginByName(name, args);
  }

  /**
   * Load a single plugin (by its funcsToLoad-style identifier) onto the live
   * aibitat instance. Used both at session start by #attachPlugins and when a
   * tool is toggled on mid-session.
   * @param {string} name - The plugin identifier (plain, `parent#child`, `@@flow_<uuid>`, `@@mcp_<server>`, or `@@<hubId>`).
   * @param {object} args - Startup args (socket, etc.) used to resolve call options.
   */
  async #attachPluginByName(name, args) {
    // Load child plugin
    if (name.includes("#")) {
      const [parent, childPluginName] = name.split("#");
      if (!Object.prototype.hasOwnProperty.call(AgentPlugins, parent)) {
        this.log(
          `${parent} is not a valid plugin. Skipping inclusion to agent cluster.`
        );
        return;
      }

      const childPlugin = AgentPlugins[parent].plugin.find(
        (child) => child.name === childPluginName
      );
      if (!childPlugin) {
        this.log(
          `${parent} does not have child plugin named ${childPluginName}. Skipping inclusion to agent cluster.`
        );
        return;
      }

      const callOpts = this.parseCallOptions(
        args,
        childPlugin?.startupConfig?.params,
        name
      );
      this.aibitat.use(childPlugin.plugin(callOpts));
      this.log(`Attached ${parent}:${childPluginName} plugin to Agent cluster`);
      return;
    }

    // Load flow plugin. This is marked by `@@flow_` in the array of functions to load.
    // Replace the @@flow_ placeholder in the agent's function list with the actual
    // tool name so the function lookup in reply() can find it.
    if (name.startsWith("@@flow_")) {
      const uuid = name.replace("@@flow_", "");
      const plugin = AgentFlows.loadFlowPlugin(uuid, this.aibitat);
      if (!plugin) {
        this.log(
          `Flow ${uuid} not found in flows directory. Skipping inclusion to agent cluster.`
        );
        return;
      }

      this.aibitat.agents.get("@agent").functions = this.aibitat.agents
        .get("@agent")
        .functions.filter((f) => f !== name);
      this.aibitat.agents.get("@agent").functions.push(plugin.name);

      this.aibitat.use(plugin.plugin());
      this.log(
        `Attached flow ${plugin.name} (${plugin.flowName}) plugin to Agent cluster`
      );
      return;
    }

    // Load MCP plugin. This is marked by `@@mcp_` in the array of functions to load.
    // All sub-tools are loaded here and are denoted by `pluginName:toolName` as their identifier.
    // This will replace the parent MCP server plugin with the sub-tools as child plugins so they
    // can be called directly by the agent when invoked.
    // Since to get to this point, the `activeMCPServers` method has already been called, we can
    // safely assume that the MCP server is running and the tools are available/loaded.
    if (name.startsWith("@@mcp_")) {
      const mcpPluginName = name.replace("@@mcp_", "");
      const plugins =
        await new MCPCompatibilityLayer().convertServerToolsToPlugins(
          mcpPluginName,
          this.aibitat
        );
      if (!plugins) {
        this.log(
          `MCP ${mcpPluginName} not found in MCP server config. Skipping inclusion to agent cluster.`
        );
        return;
      }

      // Remove the old function from the agent functions directly
      // and push the new ones onto the end of the array so that they are loaded properly.
      this.aibitat.agents.get("@agent").functions = this.aibitat.agents
        .get("@agent")
        .functions.filter((f) => f.name !== name);
      for (const plugin of plugins)
        this.aibitat.agents.get("@agent").functions.push(plugin.name);

      plugins.forEach((plugin) => {
        this.aibitat.use(plugin.plugin());
        this.log(`Attached MCP::${plugin.toolName} MCP tool to Agent cluster`);
      });
      return;
    }

    // Load single-stage plugin.
    if (!Object.prototype.hasOwnProperty.call(AgentPlugins, name)) {
      this.log(
        `${name} is not a valid plugin. Skipping inclusion to agent cluster.`
      );
      return;
    }

    const callOpts = this.parseCallOptions(
      args,
      AgentPlugins[name].startupConfig.params
    );
    const AIbitatPlugin = AgentPlugins[name];
    this.aibitat.use(AIbitatPlugin.plugin(callOpts));
    this.log(`Attached ${name} plugin to Agent cluster`);
  }

  /**
   * Toggle a tool/skill on or off for the running agent mid-session. Enabling
   * loads the plugin(s) via aibitat.use() and ensures the agent can reference
   * them; disabling pops the registered function(s) off the aibitat functions
   * Map. Changes apply on the agent's next turn. Registered on the aibitat
   * instance as `toggleAgentTool` so the websocket plugin can call it.
   * @param {object} params
   * @param {string} params.skill - Skill key, `@@flow_<uuid>`, MCP `<server>-<tool>`, hubId, or sub-skill name.
   * @param {boolean} [params.enabled=true] - Whether the tool should be enabled.
   * @param {string|null} [params.serverName=null] - MCP server name; required to enable an MCP tool.
   */
  async #toggleAgentTool({ skill, enabled = true, serverName = null }) {
    if (!skill || !this.aibitat?.agents.has(WORKSPACE_AGENT.name)) return;
    if (
      enabled &&
      skill === "generate-image" &&
      !require("../ImageGenerators").isImageGenerationAvailable()
    )
      return;
    const { loadable, registered } = resolveAgentSkill(skill, { serverName });
    const agent = () => this.aibitat.agents.get(WORKSPACE_AGENT.name);

    if (enabled) {
      for (const entry of loadable) {
        if (!agent().functions.includes(entry)) agent().functions.push(entry);
        await this.#attachPluginByName(entry, this.#args);
      }
      // Dedupe in case re-enabling a flow/MCP tool re-pushed a name already
      // resolved into the agent's function list at session start.
      agent().functions = [...new Set(agent().functions)];
      this.log(`Enabled tool(s) [${registered.join(", ")}] mid-session.`);
      return;
    }

    for (const name of registered) this.aibitat.removeFunction(name);
    this.log(`Disabled tool(s) [${registered.join(", ")}] mid-session.`);
  }

  async #loadAgents() {
    // Default User agent and workspace agent
    this.log(`Attaching user and default agent to Agent cluster.`);
    const user = this.invocation.user_id
      ? await User.get({ id: Number(this.invocation.user_id) })
      : null;
    const userAgentDef = await USER_AGENT.getDefinition();
    const workspaceAgentDef = await WORKSPACE_AGENT.getDefinition(
      this.provider,
      this.invocation.workspace,
      user,
      this.invocation.prompt
    );

    this.aibitat.agent(USER_AGENT.name, userAgentDef);
    this.aibitat.agent(WORKSPACE_AGENT.name, workspaceAgentDef);
    this.#funcsToLoad = [
      ...(userAgentDef?.functions || []),
      ...(workspaceAgentDef?.functions || []),
    ];
  }

  async init() {
    await this.#validInvocation();

    // Retrieve cached attachments (images, etc.) from the HTTP request. Before
    // provider setup, because a model router resolves there and its
    // `hasImageAttachment` rules need to see them.
    this.attachments = getAndClearInvocationAttachments(this.#invocationUUID);

    await this.#providerSetupAndCheck();
    return this;
  }

  /**
   * Fetch fresh parsed files and pinned documents, format them for injection into user messages.
   * Called on every chat turn to ensure context is always up-to-date.
   * @returns {Promise<string>} Formatted context string to append to user message
   */
  async #fetchParsedFileContext() {
    const user = this.invocation.user_id
      ? { id: this.invocation.user_id }
      : null;
    const thread = this.invocation.thread_id
      ? { id: this.invocation.thread_id }
      : null;
    const documentManager = new DocumentManager({
      workspace: this.invocation.workspace,
    });

    return Promise.all([
      WorkspaceParsedFiles.getContextFiles(
        this.invocation.workspace,
        thread,
        user
      ),
      documentManager.pinnedDocs(),
    ])
      .then(([parsedFiles, pinnedDocs]) => {
        const allDocuments = [
          ...(parsedFiles || []).map((doc) => ({
            name: doc.title || "Uploaded Document",
            content: doc.pageContent,
            metadata: doc,
          })),
          ...(pinnedDocs || []).map((doc) => ({
            name: doc.title || doc.metadata?.title || "Pinned Document",
            content: doc.pageContent,
            metadata: doc.metadata || doc,
          })),
        ];

        if (allDocuments.length === 0) return "";
        if (parsedFiles?.length > 0)
          this.log(
            `Injecting ${parsedFiles.length} parsed file(s) into user message`
          );
        if (pinnedDocs?.length > 0)
          this.log(
            `Injecting ${pinnedDocs.length} pinned document(s) into user message`
          );

        this.aibitat?.addDocumentCitations(allDocuments);

        return (
          "\n\n<attached_documents>\n" +
          allDocuments
            .map((doc, i) => {
              const filename = doc.name || `Document ${i + 1}`;
              return `<document name="${filename}">\n${doc.content}\n</document>`;
            })
            .join("\n") +
          "\n</attached_documents>"
        );
      })
      .catch((e) => {
        this.log("Error fetching parsed file context", e.message);
        return "";
      });
  }

  async createAIbitat(
    args = {
      socket: null,
    }
  ) {
    this.#args = args;
    // Runtime knobs follow the instance unless this workspace overrode them.
    const { resolveRuntimeForWorkspace } = require("./workspaceSkills");
    const skillRuntime = await resolveRuntimeForWorkspace(
      this.invocation.workspace
    );

    this.aibitat = new AIbitat({
      provider: this.provider ?? "openai",
      model: this.model ?? "gpt-4.1-nano",
      chats: await this.#chatHistory(20),
      maxToolCalls: skillRuntime.maxToolCalls,
      skillRuntime,
      handlerProps: {
        invocation: this.invocation,
        log: this.log,
        routingMetadata: this.routingMetadata || null,
      },
    });

    // Register callback to fetch fresh parsed file context on each chat turn
    // This injects parsed files into user messages instead of system prompt
    this.aibitat.fetchParsedFileContext = () => this.#fetchParsedFileContext();

    // Register callback so the websocket plugin can toggle tools on/off for the
    // running agent mid-session.
    this.aibitat.toggleAgentTool = (payload) => this.#toggleAgentTool(payload);

    // If the workspace uses the model router, attach a resolver so routing
    // is re-evaluated on every agent turn instead of only at initialization.
    // Skip the first invocation since routing was already resolved during init()
    // and re-resolving would cause shouldNotify to return false (route already recorded).
    if (this.routingMetadata) {
      let isFirstCall = true;
      this.aibitat.resolveRoute = async (prompt) => {
        if (isFirstCall) {
          isFirstCall = false;
          return { provider: this.provider, model: this.model };
        }
        try {
          await this.#resolveRouterProvider(prompt);
          this.aibitat.handlerProps.routingMetadata =
            this.routingMetadata || null;
          return { provider: this.provider, model: this.model };
        } catch (e) {
          this.log(
            "Router re-resolution failed, keeping current route",
            e.message
          );
          return null;
        }
      };

      this.log(
        `Attached ${AgentPlugins.modelRouterCooldown.name} plugin to Agent cluster`
      );
      this.aibitat.use(
        AgentPlugins.modelRouterCooldown.plugin(() =>
          this._modelRouter?.onInferenceComplete()
        )
      );
    }

    // Attach standard websocket plugin for frontend communication.
    this.log(`Attached ${AgentPlugins.websocket.name} plugin to Agent cluster`);
    this.aibitat.use(
      AgentPlugins.websocket.plugin({
        socket: args.socket,
        muteUserReply: true,
        introspection: true,
        userId: this.invocation.user_id || null,
      })
    );

    // Attach standard chat-history plugin for message storage.
    this.log(
      `Attached ${AgentPlugins.chatHistory.name} plugin to Agent cluster`
    );
    this.aibitat.use(AgentPlugins.chatHistory.plugin());

    // Load required agents (Default + custom)
    await this.#loadAgents();

    // Attach all required plugins for functions to operate.
    await this.#attachPlugins(args);
  }

  /**
   * Strip the @agent command from the message if it exists.
   * Prevents hallucination by the agent when the @agent command is used from the model thinking
   * it is an agent or something itself.
   * If the user sent nothing after the @agent command - assume its a greeting.
   * @param {string} message - The message to strip the @agent command from.
   * @returns {string} The message with the @agent command stripped.
   */
  #stripAgentCommand(message = "") {
    const stripped = String(message)
      .replace(/^@agent\s*/, "")
      .trim();
    if (!stripped) return "Hello!";
    return stripped;
  }

  startAgentCluster() {
    return this.aibitat.start({
      from: USER_AGENT.name,
      to: this.channel ?? WORKSPACE_AGENT.name,
      content: this.#stripAgentCommand(this.invocation.prompt),
      attachments: this.attachments,
    });
  }
}

module.exports.AgentHandler = AgentHandler;
