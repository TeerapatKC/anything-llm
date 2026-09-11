const AgentPlugins = require("./aibitat/plugins");
const Provider = require("./aibitat/providers/ai-provider");
const { AgentFlows } = require("../agentFlows");
const MCPCompatibilityLayer = require("../MCP");
const {
  DEFAULT_SKILLS,
  resolveConfigForWorkspace,
  resolveRuntimeForWorkspace,
} = require("./workspaceSkills");

/**
 * Configuration for agent skills that require availability checks and disabled sub-skill lists.
 * Each entry maps a skill name to its availability checker and disabled skills list key.
 */
const SKILL_FILTER_CONFIG = {
  "filesystem-agent": {
    getAvailability: () =>
      require("./aibitat/plugins/filesystem/lib").isToolAvailable(),
    disabledSettingKey: "disabled_filesystem_skills",
  },
  "create-files-agent": {
    getAvailability: () =>
      require("./aibitat/plugins/create-files/lib").isToolAvailable(),
    disabledSettingKey: "disabled_create_files_skills",
  },
  // Single-stage skill (no sub-skills) - only `available` is read for these,
  // see the "normal single-stage plugin" branch below.
  "send-email": {
    getAvailability: () => require("../smtp").isSendingEnabled(),
  },
};

const USER_AGENT = {
  name: "USER",
  getDefinition: () => {
    return {
      interrupt: "ALWAYS",
      role: "I am the human monitor and oversee this chat. Any questions on action or decision making should be directed to me.",
    };
  },
};

const WORKSPACE_AGENT = {
  name: "@agent",
  /**
   * Get the definition for the workspace agent with its role (prompt) and functions in Aibitat format
   * @param {string} _provider - Unused, kept for call-site compatibility
   * @param {import("@prisma/client").workspaces | null} workspace
   * @param {import("@prisma/client").users | null} user
   * @param {string} [prompt] - Current user message for memory reranking
   * @returns {Promise<{ role: string, functions: object[] }>}
   */
  getDefinition: async (
    _provider = null,
    workspace = null,
    user = null,
    prompt = ""
  ) => {
    let [role, clarifyingQuestionsSkills] = await Promise.all([
      Provider.systemPrompt({
        workspace,
        user,
        prompt,
      }),
      clarifyingQuestionsSkillIfEnabled(workspace),
    ]);

    // If clarifying questions tools are enabled, add a note to the role that the user must use the request-user-input tool to ask questions.
    if (!!clarifyingQuestionsSkills?.length)
      role +=
        "\n\nWhen you need information from the user (URLs, file paths, preferences, choices, etc.), you MUST use the request-user-input tool. Do not ask questions in your text response - the user cannot reply to text. Only the tool can collect user input. Never ask for information that the user already supplied clearly in the current prompt; when an explicit request to remember a complete fact is already satisfied, acknowledge it without asking again.";

    const skillConfig = await resolveConfigForWorkspace(workspace);
    return {
      role,
      functions: [
        ...(await agentSkillsFromSystemSettings(workspace, skillConfig)),
        ...clarifyingQuestionsSkills,
        ...flowPluginsForConfig(skillConfig, workspace),
        ...(await mcpServersForConfig(skillConfig, workspace)),
      ],
    };
  },
};

/**
 * Conditionally include the request-user-input sub-tools in the workspace agent's
 * function list when clarifying questions are enabled.
 * Returns an empty array when disabled so the tools aren't visible to the LLM.
 * Names use the parent#child convention so #attachPlugins loads each sub-tool.
 *
 * The instance-wide setting is only the default here - a workspace that has
 * overridden this knob decides for itself.
 * @param {import("@prisma/client").workspaces | null} workspace
 * @returns {Promise<string[]>}
 */
async function clarifyingQuestionsSkillIfEnabled(workspace = null) {
  const { clarifyingQuestionsEnabled: enabled } =
    await resolveRuntimeForWorkspace(workspace);
  if (!enabled) return [];

  const parentName = AgentPlugins.requestUserInput.name;
  const subPlugins = AgentPlugins.requestUserInput.plugin;
  if (!Array.isArray(subPlugins)) return [];
  return subPlugins.map((sub) => `${parentName}#${sub.name}`);
}

/**
 * Fetches and preloads the names/identifiers for plugins that will be dynamically
 * loaded later.
 *
 * Skill selection is per-workspace: `resolveConfigForWorkspace` returns either the
 * workspace's own stored config or, for a workspace that has never been configured,
 * the instance-wide defaults. Passing no workspace therefore preserves the original
 * instance-wide behaviour (used by ephemeral/background agents).
 * @param {import("@prisma/client").workspaces | null} workspace
 * @param {object | null} preresolvedConfig - already-resolved config, to avoid a second lookup
 * @returns {Promise<string[]>}
 */
async function agentSkillsFromSystemSettings(
  workspace = null,
  preresolvedConfig = null
) {
  const systemFunctions = [];
  const config =
    preresolvedConfig ?? (await resolveConfigForWorkspace(workspace));

  // Built-in skills that are on by default unless turned off for this workspace.
  DEFAULT_SKILLS.forEach((skill) => {
    if (config.activeDefaultSkills.includes(skill))
      systemFunctions.push(AgentPlugins[skill].name);
  });

  const _setting = config.activeSkills;

  // Pre-load disabled sub-skills and availability for configured skills
  const skillFilterState = {};
  for (const skillName of Object.keys(SKILL_FILTER_CONFIG)) {
    if (!_setting.includes(skillName)) continue;
    const filterConfig = SKILL_FILTER_CONFIG[skillName];
    skillFilterState[skillName] = {
      available: await filterConfig.getAvailability(),
      disabledSubSkills: config.disabledSubSkills[skillName] ?? [],
    };
  }

  for (const skillName of _setting) {
    if (!AgentPlugins.hasOwnProperty(skillName)) continue;

    // This is a plugin module with many sub-children plugins who
    // need to be named via `${parent}#${child}` naming convention
    if (Array.isArray(AgentPlugins[skillName].plugin)) {
      for (const subPlugin of AgentPlugins[skillName].plugin) {
        // Check if this skill has filter configuration
        const filterState = skillFilterState[skillName];
        if (filterState) {
          if (!filterState.available) continue;
          if (filterState.disabledSubSkills.includes(subPlugin.name)) continue;
        }

        systemFunctions.push(
          `${AgentPlugins[skillName].name}#${subPlugin.name}`
        );
      }
      continue;
    }

    // This is normal single-stage plugin - still respects an availability
    // check if one is configured (e.g. send-email requires SMTP to be ready).
    const filterState = skillFilterState[skillName];
    if (filterState && !filterState.available) continue;
    systemFunctions.push(AgentPlugins[skillName].name);
  }
  return systemFunctions;
}

/**
 * Agent flows enabled for this workspace, intersected with the flows the workspace is
 * actually allowed to load: the global pool plus the ones it owns. Passing the workspace
 * is what keeps another workspace's flow out even if its uuid is still sitting in this
 * workspace's saved `activeFlows`.
 * @param {object} config - resolved workspace skill config
 * @param {object|null} workspace - the workspace the agent is running in
 * @returns {string[]}
 */
function flowPluginsForConfig(config, workspace = null) {
  const available = AgentFlows.activeFlowPluginsForWorkspace(workspace?.id);
  if (!Array.isArray(config?.activeFlows)) return available;
  return available.filter((id) =>
    config.activeFlows.includes(id.replace(/^@@flow_/, ""))
  );
}

/**
 * MCP servers enabled for this workspace, intersected with the servers that actually
 * booted and with the ones this workspace is allowed to reference at all.
 *
 * Ownership is applied here rather than left to `activeMcpServers`, for the same
 * reason agent flows and SQL connections apply it: a server another workspace added
 * carries that workspace's credentials, so a stale name sitting in a saved config
 * must not be able to hand this agent a tool that talks to it. A null
 * `activeMcpServers` still means "every server this workspace may see", which is the
 * pre-feature behaviour used by unconfigured workspaces.
 * @param {object} config - resolved workspace skill config
 * @param {object|null} workspace - the workspace the agent is running in
 * @returns {Promise<string[]>}
 */
async function mcpServersForConfig(config, workspace = null) {
  const { mcpServerNamesForWorkspace } = require("../MCP/scope");
  const booted = await new MCPCompatibilityLayer().activeMCPServers();
  const permitted = new Set(
    await mcpServerNamesForWorkspace(workspace, config)
  );
  return booted.filter((id) => permitted.has(id.replace(/^@@mcp_/, "")));
}

/**
 * Resolve a UI skill/tool identifier into the names needed to toggle it on a live
 * agent session. `loadable` are the funcsToLoad-style identifiers handed to the
 * plugin loader to (re)register the tool via `aibitat.use()`; `registered` are the
 * resulting `aibitat.functions` Map keys to delete when disabling.
 *
 * Handles flows (`@@flow_<uuid>`), multi-stage parents (e.g. sql-agent -> each
 * child), imported hubIds, MCP server tools, single built-ins, and sub-skill
 * child names.
 * @param {string} skill - Skill key, `@@flow_<uuid>`, MCP `<server>-<tool>`, hubId, or sub-skill name.
 * @param {object} [opts]
 * @param {string|null} [opts.serverName] - MCP server name; required to enable an MCP tool.
 * @returns {{ loadable: string[], registered: string[] }}
 */
function resolveAgentSkill(skill = "", { serverName = null } = {}) {
  // Flow tool: loaded by `@@flow_<uuid>`, registered under its sanitized tool name.
  if (skill.startsWith("@@flow_")) {
    const uuid = skill.replace("@@flow_", "");
    const flow = AgentFlows.loadFlow(uuid);
    if (!flow) return { loadable: [], registered: [] };
    return {
      loadable: [skill],
      registered: [AgentFlows.sanitizeToolName(flow.name) || `flow_${uuid}`],
    };
  }

  // MCP server tool (`<server>-<tool>`): the Map key matches the UI id exactly.
  // Enabling reloads the server so the current suppression state is respected.
  if (serverName)
    return { loadable: [`@@mcp_${serverName}`], registered: [skill] };

  // Top-level built-in skill.
  const plugin = AgentPlugins[skill];
  if (plugin) {
    // Multi-stage plugin (e.g. sql-agent) registers one function per child.
    if (Array.isArray(plugin.plugin))
      return {
        loadable: plugin.plugin.map((c) => `${plugin.name}#${c.name}`),
        registered: plugin.plugin.map((c) => c.name),
      };
    return { loadable: [plugin.name], registered: [plugin.name] };
  }

  // Sub-skill child name (e.g. a filesystem-agent child): find its parent so the
  // loader can attach just that child via the `parent#child` convention.
  for (const key of Object.keys(AgentPlugins)) {
    const parent = AgentPlugins[key];
    if (!Array.isArray(parent?.plugin)) continue;
    const child = parent.plugin.find((c) => c.name === skill);
    if (child)
      return {
        loadable: [`${parent.name}#${child.name}`],
        registered: [child.name],
      };
  }

  // Fallback: treat the id as both the loadable entry and the registered name.
  return { loadable: [skill], registered: [skill] };
}

module.exports = {
  USER_AGENT,
  WORKSPACE_AGENT,
  agentSkillsFromSystemSettings,
  flowPluginsForConfig,
  mcpServersForConfig,
  resolveAgentSkill,
};
