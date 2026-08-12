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
  const parsed = typeof config === "string" ? safeJsonParse(config, null) : config;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

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
  };
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
};
