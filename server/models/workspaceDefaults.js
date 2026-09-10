const prisma = require("../utils/prisma");

/**
 * The two kinds of workspace this instance can hold.
 *
 * `shared` is the ordinary workspace: many members, a settings screen, created by
 * whoever holds `workspaces.create`. `personal` is a private workspace provisioned for
 * exactly one person - see models/personalWorkspace.js.
 */
const WORKSPACE_TYPES = { SHARED: "shared", PERSONAL: "personal" };

/**
 * Instance-wide defaults, kept as one profile per workspace type.
 *
 * The two profiles hold the *same* fields on purpose, so an operator reading the admin
 * screen can see that private and shared workspaces differ in their values rather than
 * in which knobs exist at all. Only the provisioning fields at the end are meaningful
 * for private workspaces, since nothing provisions shared ones.
 *
 * Every field defaults to `null`, meaning "follow the instance-wide setting" - the
 * system prompt page, the agent skills page, the LLM preference page. A fresh install
 * therefore behaves exactly as it did before profiles existed, and an operator only has
 * to fill in what they actually want to differ.
 *
 * Stored as one JSON blob per type in `system_settings`, written through this model
 * rather than through SystemSettings.updateSettings so the generic settings endpoint
 * can never be talked into writing one.
 */
const WorkspaceDefaults = {
  TYPES: WORKSPACE_TYPES,

  /**
   * Workspace columns a profile may seed on creation. Anything not listed here keeps
   * the workspace column default.
   * @type {string[]}
   */
  WORKSPACE_FIELDS: [
    "openAiPrompt",
    "chatProvider",
    "chatModel",
    "chatMode",
    "openAiTemp",
    "openAiHistory",
    "similarityThreshold",
    "topN",
    "queryRefusalResponse",
    "vectorSearchMode",
    "agentProvider",
    "agentModel",
  ],

  /** Provisioning knobs. Only read for the `personal` profile. */
  PROVISIONING_DEFAULTS: {
    // Off until an operator turns it on: an upgrade must never silently mint a
    // workspace for every account on the instance.
    enabled: false,
    quotaPerUser: 1,
    nameTemplate: "{username}'s Space",
    // The workspace role the owner is given inside their own private workspace. NULL
    // resolves to the `personal-owner` system role at provisioning time.
    ownerRoleId: null,
  },

  _label: function (type) {
    return type === WORKSPACE_TYPES.PERSONAL
      ? "workspace_defaults_personal"
      : "workspace_defaults_shared";
  },

  /**
   * Coerce a stored or user-supplied profile into the full shape. Unknown keys are
   * dropped and unusable values become `null` (inherit) rather than a guess.
   * @param {object|string|null} value
   * @param {"shared"|"personal"} type
   * @returns {object}
   */
  normalize: function (value = null, type = WORKSPACE_TYPES.SHARED) {
    let parsed = value;
    if (typeof value === "string") {
      // Strict parse, like the agent skill config: this is our own machine-written
      // JSON, and a repaired object would quietly become a profile nobody chose.
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = null;
      }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      parsed = {};

    const workspace = {};
    const source =
      parsed.workspace && typeof parsed.workspace === "object"
        ? parsed.workspace
        : {};
    for (const field of this.WORKSPACE_FIELDS) {
      const raw = source[field];
      workspace[field] = raw === undefined || raw === "" ? null : raw;
    }

    const profile = {
      type,
      workspace,
      // NULL => this type follows the instance-wide agent skill settings, which is what
      // every workspace did before profiles existed.
      agentSkillConfig: this._normalizeSkillConfig(parsed.agentSkillConfig),
    };
    if (type !== WORKSPACE_TYPES.PERSONAL) return profile;

    const defaults = this.PROVISIONING_DEFAULTS;
    profile.enabled = parsed.enabled === true;
    profile.quotaPerUser = this._quota(
      parsed.quotaPerUser,
      defaults.quotaPerUser
    );
    profile.nameTemplate =
      typeof parsed.nameTemplate === "string" && parsed.nameTemplate.trim()
        ? parsed.nameTemplate.trim().slice(0, 255)
        : defaults.nameTemplate;
    profile.ownerRoleId =
      parsed.ownerRoleId === null || parsed.ownerRoleId === undefined
        ? null
        : Number(parsed.ownerRoleId) || null;
    return profile;
  },

  _normalizeSkillConfig: function (value) {
    if (value === null || value === undefined) return null;
    const { normalizeConfig } = require("../utils/agents/workspaceSkills");
    return normalizeConfig(value);
  },

  /**
   * A quota is a whole number of workspaces, and zero is meaningful: it stops anyone
   * creating a new private workspace without touching what already exists.
   */
  _quota: function (value, fallback = 1) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(parsed, 100);
  },

  /**
   * Read a profile.
   * @param {"shared"|"personal"} type
   * @returns {Promise<object>}
   */
  get: async function (type = WORKSPACE_TYPES.SHARED) {
    try {
      const setting = await prisma.system_settings.findFirst({
        where: { label: this._label(type) },
      });
      return this.normalize(setting?.value ?? null, type);
    } catch (error) {
      console.error("WorkspaceDefaults.get error:", error.message);
      return this.normalize(null, type);
    }
  },

  /** Both profiles at once, for the admin screen. */
  all: async function () {
    return {
      shared: await this.get(WORKSPACE_TYPES.SHARED),
      personal: await this.get(WORKSPACE_TYPES.PERSONAL),
    };
  },

  /**
   * Write a profile. Merges over what is stored, so a screen that posts one section
   * does not blank the other.
   * @param {"shared"|"personal"} type
   * @param {object} updates
   * @returns {Promise<{profile: object|null, error: string|null}>}
   */
  update: async function (type = WORKSPACE_TYPES.SHARED, updates = {}) {
    try {
      const current = await this.get(type);
      const merged = this.normalize(
        {
          ...current,
          ...updates,
          workspace: { ...current.workspace, ...(updates.workspace ?? {}) },
          agentSkillConfig:
            updates.agentSkillConfig === undefined
              ? current.agentSkillConfig
              : updates.agentSkillConfig,
        },
        type
      );

      const label = this._label(type);
      const value = JSON.stringify(merged);
      await prisma.system_settings.upsert({
        where: { label },
        update: { value },
        create: { label, value },
      });
      return { profile: merged, error: null };
    } catch (error) {
      console.error("WorkspaceDefaults.update error:", error.message);
      return { profile: null, error: error.message };
    }
  },

  /**
   * The column values a newly created workspace of this type starts with. Only fields
   * the profile actually sets are returned, so everything else keeps falling through to
   * the instance-wide settings the way it always has.
   * @param {"shared"|"personal"} type
   * @returns {Promise<object>}
   */
  newWorkspaceFields: async function (type = WORKSPACE_TYPES.SHARED) {
    const profile = await this.get(type);
    const fields = {};
    for (const [field, value] of Object.entries(profile.workspace)) {
      if (value === null || value === undefined || value === "") continue;
      fields[field] = value;
    }
    return fields;
  },

  /**
   * The agent skill config a workspace of this type falls back to when it has none of
   * its own. NULL means "keep following the instance-wide agent settings".
   * @param {"shared"|"personal"} type
   * @returns {Promise<object|null>}
   */
  agentSkillConfigFor: async function (type = WORKSPACE_TYPES.SHARED) {
    const profile = await this.get(type);
    return profile.agentSkillConfig;
  },
};

module.exports = { WorkspaceDefaults, WORKSPACE_TYPES };
