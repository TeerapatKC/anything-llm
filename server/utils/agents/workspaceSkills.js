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
 *   runtime: { [knob]: value|null },            // per-knob overrides, null = inherit
 * }
 *
 * `runtime` deliberately does NOT follow the all-or-nothing rule above. The
 * knobs it holds (tool-call ceiling, skill reranker, clarifying questions) are
 * tuning values rather than a selection, so each one inherits the instance-wide
 * setting individually until the workspace overrides that specific knob. A
 * workspace that only wants a bigger tool budget therefore keeps tracking the
 * instance for everything else.
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

/**
 * Runtime knobs a workspace may override, and the type each one coerces to.
 * Every one of these used to be readable only from `process.env` or
 * `system_settings`, i.e. one value for the whole instance.
 * @type {Record<string, "int"|"bool">}
 */
const RUNTIME_FIELDS = {
  maxToolCalls: "int",
  rerankerEnabled: "bool",
  rerankerTopN: "int",
  clarifyingQuestionsEnabled: "bool",
  clarifyingQuestionsMaxPerTurn: "int",
};

/**
 * Fallbacks used when the instance itself has nothing configured. Kept in sync
 * with the values the consumers default to on their own: AIbitat's
 * `defaultMaxToolCalls()`, `ToolReranker.isEnabled()`/`defaultTopN`, and
 * request-user-input's DEFAULT_MAX_PER_TURN.
 */
const RUNTIME_DEFAULTS = {
  maxToolCalls: 10,
  rerankerEnabled: true,
  rerankerTopN: 15,
  clarifyingQuestionsEnabled: false,
  clarifyingQuestionsMaxPerTurn: 3,
};

/** A runtime block that overrides nothing - every knob follows the instance. */
const EMPTY_RUNTIME = Object.fromEntries(
  Object.keys(RUNTIME_FIELDS).map((field) => [field, null])
);

const EMPTY_CONFIG = {
  activeDefaultSkills: [],
  activeSkills: [],
  disabledSubSkills: {},
  activeImportedSkills: [],
  activeFlows: [],
  activeMcpServers: [],
  runtime: { ...EMPTY_RUNTIME },
};

/**
 * Coerce a stored/user-supplied runtime block into the full shape. Anything
 * unusable becomes `null` (inherit) rather than a guess, so a malformed value
 * can only ever fall back to the instance setting.
 * @param {object|null} value
 * @returns {Record<string, number|boolean|null>}
 */
function normalizeRuntime(value = null) {
  const runtime = { ...EMPTY_RUNTIME };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return runtime;

  for (const [field, kind] of Object.entries(RUNTIME_FIELDS)) {
    const raw = value[field];
    if (raw === null || raw === undefined || raw === "") continue;

    if (kind === "bool") {
      // A form body can deliver these as the strings "true"/"false".
      if (typeof raw === "boolean") runtime[field] = raw;
      else if (raw === "true" || raw === "false")
        runtime[field] = raw === "true";
      continue;
    }

    const parsed = Math.floor(Number(raw));
    if (Number.isFinite(parsed) && parsed > 0) runtime[field] = parsed;
  }
  return runtime;
}

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
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return null;

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
    "runtime",
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
    runtime: normalizeRuntime(parsed.runtime),
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
    // Left as all-inherit on purpose. Seeding this with the instance's current
    // numbers would freeze them into the workspace the first time it saves,
    // silently detaching it from later instance-wide changes.
    runtime: { ...EMPTY_RUNTIME },
  };
}

/**
 * The instance-wide value of every runtime knob, fully resolved. This is what a
 * workspace gets for any knob it has not overridden, and what the UI shows as
 * the "inherit" option's current value.
 * @returns {Promise<Record<string, number|boolean>>}
 */
async function instanceRuntimeConfig() {
  const envPositiveInt = (key) => {
    const parsed = parseInt(process.env[key], 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  };

  const maxPerTurn = Number(
    await SystemSettings.getValueOrFallback(
      { label: "agent_clarifying_questions_max_per_turn" },
      String(RUNTIME_DEFAULTS.clarifyingQuestionsMaxPerTurn)
    )
  );

  return {
    maxToolCalls:
      envPositiveInt("AGENT_MAX_TOOL_CALLS") ?? RUNTIME_DEFAULTS.maxToolCalls,
    // Absent means on - the reranker is opt-out, not opt-in.
    rerankerEnabled: !("AGENT_SKILL_RERANKER_ENABLED" in process.env)
      ? RUNTIME_DEFAULTS.rerankerEnabled
      : process.env.AGENT_SKILL_RERANKER_ENABLED !== "false",
    rerankerTopN:
      envPositiveInt("AGENT_SKILL_RERANKER_TOP_N") ??
      RUNTIME_DEFAULTS.rerankerTopN,
    clarifyingQuestionsEnabled:
      (await SystemSettings.getValueOrFallback(
        { label: "agent_clarifying_questions_enabled" },
        "false"
      )) === "true",
    clarifyingQuestionsMaxPerTurn:
      Number.isFinite(maxPerTurn) && maxPerTurn > 0
        ? Math.floor(maxPerTurn)
        : RUNTIME_DEFAULTS.clarifyingQuestionsMaxPerTurn,
  };
}

/**
 * Resolve the runtime knobs an agent session should run with, layering this
 * workspace's overrides over the instance-wide values one knob at a time.
 * @param {import("@prisma/client").workspaces | null} workspace
 * @returns {Promise<Record<string, number|boolean>>}
 */
async function resolveRuntimeForWorkspace(workspace = null) {
  const resolved = await instanceRuntimeConfig();
  const stored = normalizeConfig(workspace?.agentSkillConfig ?? null);
  if (!stored?.runtime) return resolved;

  for (const field of Object.keys(RUNTIME_FIELDS)) {
    const override = stored.runtime[field];
    // `false` and `0`-adjacent values are real overrides, so test for null
    // rather than falsiness.
    if (override !== null && override !== undefined) resolved[field] = override;
  }
  return resolved;
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
  RUNTIME_FIELDS,
  RUNTIME_DEFAULTS,
  EMPTY_RUNTIME,
  normalizeConfig,
  normalizeRuntime,
  instanceDefaultConfig,
  instanceRuntimeConfig,
  resolveConfigForWorkspace,
  resolveRuntimeForWorkspace,
  resolveSearchProviderForWorkspace,
};
