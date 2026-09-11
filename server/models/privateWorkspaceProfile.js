const prisma = require("../utils/prisma");

/**
 * The two kinds of workspace this instance can hold.
 *
 * `shared` is the ordinary workspace: many members, its own settings screens, created
 * by whoever holds `workspaces.create`. `personal` is a private workspace provisioned
 * for exactly one person - see models/personalWorkspace.js.
 */
const WORKSPACE_TYPES = { SHARED: "shared", PERSONAL: "personal" };

/** Where the profile is persisted. One row, holding the whole thing as JSON. */
const PROFILE_SETTING_LABEL = "private_workspace_profile";

/**
 * The instance-wide profile every private workspace is created from and governed by.
 *
 * Only private workspaces have one, and the reason is that only they lack a settings
 * screen of their own. A shared workspace is configured where it always was - the
 * instance settings pages for the defaults, then its own settings screens - so there is
 * nothing here for it and nothing that could quietly override it.
 *
 * Every field defaults to `null`, meaning "follow the instance-wide setting": the
 * default system prompt page, the agent skills page, the LLM preference page. A fresh
 * install therefore behaves exactly as it did before private workspaces existed, and an
 * operator only fills in what they actually want private workspaces to differ on.
 *
 * Written through this model rather than through SystemSettings.updateSettings, so the
 * generic settings endpoint can never be talked into writing it.
 */
const PrivateWorkspaceProfile = {
  SETTING_LABEL: PROFILE_SETTING_LABEL,

  /**
   * Workspace columns the profile seeds on creation. Anything not listed keeps the
   * workspace column default.
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

  /** How private workspaces are handed out. */
  PROVISIONING_DEFAULTS: {
    // Off until an operator turns it on: an upgrade must never silently mint a
    // workspace for every account on the instance.
    enabled: false,
    quotaPerUser: 1,
    nameTemplate: "{user.name}'s Space",
    // The workspace role each owner is given inside their own private workspace. NULL
    // resolves to the `personal-owner` system role at provisioning time.
    ownerRoleId: null,
  },

  /**
   * Coerce a stored or user-supplied profile into the full shape. Unknown keys are
   * dropped and unusable values become `null` (inherit) rather than a guess.
   * @param {object|string|null} value
   * @returns {object}
   */
  normalize: function (value = null) {
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
    // The Chat/Agent LLM pickers submit a sentinel value for "inherit" rather than
    // omitting the field - "default" for chatProvider, "none" for agentProvider -
    // because the form always posts every one of its inputs, including the one nobody
    // touched. Workspace.validateFields() strips these for an ordinary workspace save;
    // this model writes straight to system_settings with no such pass, so without this
    // the literal string "default"/"none" was persisted as the provider id, copied onto
    // every new private workspace, and reached getLLMProvider() unresolved - which has no
    // provider registered under either name and throws "Unknown provider: default/none."
    if (workspace.chatProvider === "default" || workspace.chatProvider === "none") {
      workspace.chatProvider = null;
      workspace.chatModel = null;
    }
    if (workspace.agentProvider === "none") workspace.agentProvider = null;

    const defaults = this.PROVISIONING_DEFAULTS;
    return {
      workspace,
      // NULL => private workspaces follow the instance-wide agent settings, which is
      // what every workspace did before the profile existed.
      agentSkillConfig: this._normalizeSkillConfig(parsed.agentSkillConfig),
      enabled: parsed.enabled === true,
      quotaPerUser: this._quota(parsed.quotaPerUser, defaults.quotaPerUser),
      nameTemplate: this._normalizeNameTemplate(
        typeof parsed.nameTemplate === "string" && parsed.nameTemplate.trim()
          ? parsed.nameTemplate
          : defaults.nameTemplate
      ),
      ownerRoleId:
        parsed.ownerRoleId === null || parsed.ownerRoleId === undefined
          ? null
          : Number(parsed.ownerRoleId) || null,
    };
  },

  _normalizeNameTemplate: function (value) {
    return String(value)
      .replaceAll("{username}", "{user.name}")
      .replaceAll("{name}", "{user.name}")
      .replaceAll("{email}", "{user.email}")
      .trim()
      .slice(0, 255);
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
   * Read the profile.
   * @returns {Promise<object>}
   */
  get: async function () {
    try {
      const setting = await prisma.system_settings.findFirst({
        where: { label: PROFILE_SETTING_LABEL },
      });
      return this.normalize(setting?.value ?? null);
    } catch (error) {
      console.error("PrivateWorkspaceProfile.get error:", error.message);
      return this.normalize(null);
    }
  },

  /**
   * Write the profile. Merges over what is stored, so a screen that posts one section
   * does not blank the others.
   * @param {object} updates
   * @returns {Promise<{profile: object|null, error: string|null}>}
   */
  update: async function (updates = {}) {
    try {
      const current = await this.get();
      const merged = this.normalize({
        ...current,
        ...updates,
        workspace: { ...current.workspace, ...(updates.workspace ?? {}) },
        agentSkillConfig:
          updates.agentSkillConfig === undefined
            ? current.agentSkillConfig
            : updates.agentSkillConfig,
      });

      const value = JSON.stringify(merged);
      await prisma.system_settings.upsert({
        where: { label: PROFILE_SETTING_LABEL },
        update: { value },
        create: { label: PROFILE_SETTING_LABEL, value },
      });
      return { profile: merged, error: null };
    } catch (error) {
      console.error("PrivateWorkspaceProfile.update error:", error.message);
      return { profile: null, error: error.message };
    }
  },

  /**
   * The column values a newly provisioned private workspace starts with. Only fields
   * the profile actually sets are returned, so everything else keeps falling through to
   * the instance-wide settings the way it always has.
   * @returns {Promise<object>}
   */
  newWorkspaceFields: async function () {
    const profile = await this.get();
    const fields = {};
    for (const [field, value] of Object.entries(profile.workspace)) {
      if (value === null || value === undefined || value === "") continue;
      fields[field] = value;
    }
    // Private workspaces are chat-first. An instance administrator can explicitly
    // opt them into automatic agent mode in the profile, but a fresh private space
    // should not silently send ordinary messages through an agent/tool grammar.
    if (fields.chatMode === undefined) fields.chatMode = "chat";
    return fields;
  },

  /**
   * The agent skill config a private workspace falls back to when it has none of its
   * own - which is all of them, since they have no screen to set one. NULL means "keep
   * following the instance-wide agent settings".
   * @returns {Promise<object|null>}
   */
  agentSkillConfig: async function () {
    return (await this.get()).agentSkillConfig;
  },
};

module.exports = { PrivateWorkspaceProfile, WORKSPACE_TYPES };
