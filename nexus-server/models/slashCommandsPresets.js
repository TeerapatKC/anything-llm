const { v4 } = require("uuid");
const prisma = require("../utils/prisma");
const CMD_REGEX = new RegExp(/[^a-zA-Z0-9_-]/g);

const SlashCommandPresets = {
  formatCommand: function (command = "") {
    if (!command || command.length < 2) return `/${v4().split("-")[0]}`;

    let adjustedCmd = command.toLowerCase(); // force lowercase
    if (!adjustedCmd.startsWith("/")) adjustedCmd = `/${adjustedCmd}`; // Fix if no preceding / is found.
    return `/${adjustedCmd.slice(1).toLowerCase().replace(CMD_REGEX, "-")}`; // replace any invalid chars with '-'
  },

  get: async function (clause = {}) {
    try {
      const preset = await prisma.slash_command_presets.findFirst({
        where: clause,
      });
      return preset || null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  where: async function (clause = {}, limit) {
    try {
      const presets = await prisma.slash_command_presets.findMany({
        where: clause,
        take: limit || undefined,
      });
      return presets;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  // Command + userId must be unique combination.
  create: async function (userId = null, presetData = {}) {
    try {
      // workspaceId: null is required here, not just userId+command - a
      // workspace-shared preset also records its creator's userId as
      // metadata (see createForWorkspace), so without this a personal
      // preset lookup could otherwise match a workspace preset the same
      // person happens to have created and silently return that instead of
      // creating a genuinely new personal one.
      const existingPreset = await this.get({
        userId: userId ? Number(userId) : null,
        command: String(presetData.command),
        workspaceId: null,
      });

      if (existingPreset) {
        console.log(
          "SlashCommandPresets.create - preset already exists - will not create"
        );
        return existingPreset;
      }

      const preset = await prisma.slash_command_presets.create({
        data: {
          ...presetData,
          // This field (uid) is either the user_id or 0 (for non-multi-user mode).
          // the UID field enforces the @@unique(userId, command) constraint since
          // the real relational field (userId) cannot be non-null so this 'dummy' field gives us something
          // to constrain against within the context of prisma and sqlite that works.
          uid: userId ? Number(userId) : 0,
          userId: userId ? Number(userId) : null,
        },
      });
      return preset;
    } catch (error) {
      console.error("Failed to create preset", error.message);
      return null;
    }
  },

  /**
   * Presets shared across a workspace (visible/runnable by every member -
   * distinct from the personal, per-user presets above).
   * @param {number} workspaceId
   */
  forWorkspace: async function (workspaceId = null) {
    try {
      return (
        await prisma.slash_command_presets.findMany({
          where: { workspaceId: Number(workspaceId) },
          orderBy: { createdAt: "asc" },
        })
      )?.map((preset) => this.toPublic(preset));
    } catch (error) {
      console.error("Failed to get workspace presets", error.message);
      return [];
    }
  },

  /**
   * Creates a preset shared across a workspace rather than owned by one user -
   * `workspaceId` (not `uid`/`userId`) is what's meant to enforce uniqueness
   * for these. `uid` still needs a value that can't collide across workspaces
   * though: it defaults to 0, and the pre-existing @@unique([uid, command])
   * constraint (built for personal presets, where 0 means "no owner") would
   * otherwise reject a second workspace's identically-named command outright
   * (both rows landing on uid=0). Negating the workspace id gives each
   * workspace its own uid bucket - always negative, so it can never collide
   * with a real user id (always positive) or another workspace's bucket.
   * @param {number} workspaceId
   * @param {number|null} createdByUserId
   * @param {{command: string, prompt: string, description: string}} presetData
   */
  createForWorkspace: async function (workspaceId, createdByUserId = null, presetData = {}) {
    try {
      const existing = await this.get({
        workspaceId: Number(workspaceId),
        command: String(presetData.command),
      });
      if (existing) return existing;

      const preset = await prisma.slash_command_presets.create({
        data: {
          ...presetData,
          uid: -Number(workspaceId),
          workspaceId: Number(workspaceId),
          userId: createdByUserId ? Number(createdByUserId) : null,
        },
      });
      return preset;
    } catch (error) {
      console.error("Failed to create workspace preset", error.message);
      return null;
    }
  },

  /**
   * Strips internal-only fields before a preset is sent to the client.
   * @param {Object} preset
   */
  toPublic: function (preset = {}) {
    const { id, command, prompt, description, workspaceId } = preset;
    return { id, command, prompt, description, workspaceId: workspaceId ?? null };
  },

  getUserPresets: async function (userId = null) {
    try {
      return (
        await prisma.slash_command_presets.findMany({
          // workspaceId: null excludes workspace-shared presets this user
          // happens to have created - see the comment on create() above.
          where: { userId: !!userId ? Number(userId) : null, workspaceId: null },
          orderBy: { createdAt: "asc" },
        })
      )?.map((preset) => ({
        id: preset.id,
        command: preset.command,
        prompt: preset.prompt,
        description: preset.description,
      }));
    } catch (error) {
      console.error("Failed to get user presets", error.message);
      return [];
    }
  },

  update: async function (presetId = null, presetData = {}) {
    try {
      const preset = await prisma.slash_command_presets.update({
        where: { id: Number(presetId) },
        data: presetData,
      });
      return preset;
    } catch (error) {
      console.error("Failed to update preset", error.message);
      return null;
    }
  },

  delete: async function (presetId = null) {
    try {
      await prisma.slash_command_presets.delete({
        where: { id: Number(presetId) },
      });
      return true;
    } catch (error) {
      console.error("Failed to delete preset", error.message);
      return false;
    }
  },

  /**
   * Migrates all slash command presets with null userId to the specified admin user.
   * Called during multi-user mode enablement to assign orphaned presets to the new admin.
   * @param {number} adminUserId - The admin user ID to assign presets to
   * @returns {Promise<void>}
   */
  migrateToMultiUser: async function (adminUserId) {
    try {
      await prisma.slash_command_presets.updateMany({
        where: { userId: null },
        data: {
          userId: adminUserId,
          uid: adminUserId,
        },
      });
      console.log(
        "Successfully migrated slash command presets to multi-user mode"
      );
    } catch (error) {
      console.error(
        "Error migrating slash command presets to multi-user mode:",
        error
      );
    }
  },
};

module.exports.SlashCommandPresets = SlashCommandPresets;
