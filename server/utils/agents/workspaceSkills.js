const { SystemSettings } = require("../../models/systemSettings");
const { safeJsonParse } = require("../http");
const AgentPlugins = require("./aibitat/plugins");
const ImportedPlugin = require("./imported");
const { AgentFlows } = require("../agentFlows");

/**
 * Per-workspace agent skill configuration.
 *
 * Historically every agent skill toggle lived in `system_settings` (built-in
 * skills) or in the `active` flag of a plugin/flow file on disk (imported
 * skills, flows) and applied to every workspace at once. This module keeps that
 * instance-wide config as the *default*, but lets each workspace own an
 * independent copy stored as JSON on `workspaces.agentSkillConfig`.
 *
 * Resolution rules:
 *  - `agentSkillConfig === null` -> workspace was never configured, so the
 *    instance-wide defaults are used verbatim. This keeps every pre-existing
 *    workspace behaving exactly as before this feature landed.
 *  - Otherwise the stored config is authoritative for that workspace and the
 *    instance-wide values are ignored.
 *
 * Shape of the stored JSON:
 * {
 *   activeDefaultSkills: string[],              // built-in default-on skills kept enabled
 *   activeSkills: string[],                     // configurable built-in skills enabled
 *   disabledSubSkills: { [parent]: string[] },  // per-parent disabled child skills
 *   activeImportedSkills: string[],             // imported plugin hubIds
 *   activeFlows: string[],                      // agent flow uuids
 *   activeMcpServers: string[],                 // MCP server names
 * }
 */

/** Built-in skills that are enabled unless explicitly disabled. */
const DEFAULT_SKILLS = [
  AgentPlugins.memory.name,
  AgentPlugins.docSummarizer.name,
  AgentPlugins.webScraping.name,
];

/** Parent skills whose children can be individually disabled. */
const SUB_SKILL_PARENTS = {
  "filesystem-agent": "disabled_filesystem_skills",
  "create-files-agent": "disabled_create_files_skills",
  "gmail-agent": "disabled_gmail_skills",
  "outlook-agent": "disabled_outlook_skills",
};

const EMPTY_CONFIG = {
  activeDefaultSkills: [],
  activeSkills: [],
  disabledSubSkills: {},
  activeImportedSkills: [],
  activeFlows: [],
  activeMcpServers: [],
};

/**
 * Normalize an arbitrary (user-supplied or stored) config into the full shape,
 * dropping anything unexpected so a malformed record can never break an agent
 * session.
 * @param {object|string|null} config
 * @returns {object|null} normalized config, or null if it isn't usable
 */
function normalizeConfig(config = null) {
  let parsed = config;
  if (typeof config === "string") {
    // Deliberately strict JSON.parse rather than the shared safeJsonParse:
    // safeJsonParse runs jsonrepair, which would coerce a corrupted record into
    // some unrelated object. That object then normalizes to an all-empty config,
    // i.e. an agent with *zero* skills, instead of falling back to the instance
    // defaults. This is our own machine-written JSON, so it should never need
    // repairing - if it doesn't parse cleanly, treat it as absent.
    try {
      parsed = JSON.parse(config);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  // Require at least one recognized key so an object that happens to parse but
  // carries none of our fields is treated as absent rather than as "disable
  // everything".
  const KNOWN_KEYS = [
    "activeDefaultSkills",
    "activeSkills",
    "disabledSubSkills",
    "activeImportedSkills",
    "activeFlows",
    "activeMcpServers",
    "searchProvider",
  ];
  if (!KNOWN_KEYS.some((key) => key in parsed)) return null;

  const stringArray = (value) =>
    Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];

  const disabledSubSkills = {};
  if (
    parsed.disabledSubSkills &&
    typeof parsed.disabledSubSkills === "object" &&
    !Array.isArray(parsed.disabledSubSkills)
  ) {
    for (const parent of Object.keys(SUB_SKILL_PARENTS)) {
      const children = stringArray(parsed.disabledSubSkills[parent]);
      if (children.length) disabledSubSkills[parent] = children;
    }
  }

  return {
    activeDefaultSkills: stringArray(parsed.activeDefaultSkills),
    activeSkills: stringArray(parsed.activeSkills),
    disabledSubSkills,
    activeImportedSkills: stringArray(parsed.activeImportedSkills),
    activeFlows: stringArray(parsed.activeFlows),
    activeMcpServers: stringArray(parsed.activeMcpServers),
    // Which search engine web-browsing uses for this workspace. The engines'
    // API keys stay instance-wide; only the choice of engine is per-workspace.
    // null => fall back to the instance-wide `agent_search_provider`.
    searchProvider:
      typeof parsed.searchProvider === "string" && parsed.searchProvider
        ? parsed.searchProvider
        : null,
  };
}

/**
 * Read the instance-wide configuration and express it in the same shape a
 * workspace config uses. This is what an unconfigured workspace resolves to,
 * and what a newly configured workspace is seeded from.
 * @returns {Promise<object>}
 */
async function instanceDefaultConfig() {
  const disabledDefaultSkills = safeJsonParse(
    await SystemSettings.getValueOrFallback(
      { label: "disabled_agent_skills" },
      "[]"
    ),
    []
  );
  const activeSkills = safeJsonParse(
    await SystemSettings.getValueOrFallback(
      { label: "default_agent_skills" },
      "[]"
    ),
    []
  );

  const disabledSubSkills = {};
  for (const [parent, settingKey] of Object.entries(SUB_SKILL_PARENTS)) {
    const disabled = safeJsonParse(
      await SystemSettings.getValueOrFallback({ label: settingKey }, "[]"),
      []
    );
    if (disabled.length) disabledSubSkills[parent] = disabled;
  }

  return {
    activeDefaultSkills: DEFAULT_SKILLS.filter(
      (skill) => !disabledDefaultSkills.includes(skill)
    ),
    activeSkills,
    disabledSubSkills,
    // Imported skills and flows carry their own `active` flag on disk; MCP
    // servers are active whenever they boot. Mirror that as the default so an
    // unconfigured workspace keeps today's behaviour.
    activeImportedSkills: ImportedPlugin.activeImportedPlugins().map((id) =>
      id.replace(/^@@/, "")
    ),
    activeFlows: AgentFlows.activeFlowPlugins().map((id) =>
      id.replace(/^@@flow_/, "")
    ),
    activeMcpServers: null, // null => "all booted servers", resolved at call time
    searchProvider:
      (await SystemSettings.getValueOrFallback(
        { label: "agent_search_provider" },
        null
      )) ?? null,
  };
}

/**
 * Resolve which search engine web-browsing should use for a given workspace.
 *
 * Only the engine *choice* is per-workspace; every engine's API key remains an
 * instance-wide setting, so a workspace can only pick between engines the
 * instance has already been configured for.
 * @param {number|string|null} workspaceId
 * @returns {Promise<string>} provider key, or "unknown" when nothing is set
 */
async function resolveSearchProviderForWorkspace(workspaceId = null) {
  const instanceProvider =
    (await SystemSettings.getValueOrFallback(
      { label: "agent_search_provider" },
      null
    )) ?? "unknown";
  if (!workspaceId) return instanceProvider;

  // Required lazily: models/workspace pulls this module in for field
  // validation, so importing it at the top would be a cycle.
  const { Workspace } = require("../../models/workspace");
  const workspace = await Workspace.get({ id: Number(workspaceId) });
  const stored = normalizeConfig(workspace?.agentSkillConfig ?? null);
  return stored?.searchProvider || instanceProvider;
}

/**
 * Resolve the effective agent skill config for a workspace.
 * @param {import("@prisma/client").workspaces | null} workspace
 * @returns {Promise<object>}
 */
async function resolveConfigForWorkspace(workspace = null) {
  const stored = normalizeConfig(workspace?.agentSkillConfig ?? null);
  if (stored) return stored;
  return await instanceDefaultConfig();
}

module.exports = {
  DEFAULT_SKILLS,
  SUB_SKILL_PARENTS,
  EMPTY_CONFIG,
  normalizeConfig,
  instanceDefaultConfig,
  resolveConfigForWorkspace,
  resolveSearchProviderForWorkspace,
};
