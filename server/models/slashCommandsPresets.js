const { v4 } = require("uuid");
const prisma = require("../utils/prisma");
const CMD_REGEX = new RegExp(/[^a-zA-Z0-9_-]/g);

/**
 * Slash commands live at one of two scopes:
 *   - built-in  (`workspaceId: null`) - available in every workspace, managed by an
 *     instance admin under /settings/slash-commands.
 *   - workspace (`workspaceId: <id>`) - available only in that workspace, managed by
 *     a workspace manager under /workspace/<slug>/settings/slash-commands.
 *
 * A workspace command shadows a built-in that uses the same command string.
 */
const SlashCommandPresets = {
  formatCommand: function (command = "") {
    if (!command || command.length < 2) return `/${v4().split("-")[0]}`;

    let adjustedCmd = command.toLowerCase(); // force lowercase
    if (!adjustedCmd.startsWith("/")) adjustedCmd = `/${adjustedCmd}`; // Fix if no preceding / is found.
    return `/${adjustedCmd.slice(1).toLowerCase().replace(CMD_REGEX, "-")}`; // replace any invalid chars with '-'
  },

  /** @param {import("@prisma/client").slash_command_presets} preset */
  toPublic: function (preset) {
    return {
      id: preset.id,
      command: preset.command,
      prompt: preset.prompt,
      description: preset.description,
      workspaceId: preset.workspaceId,
      // Lets the chat UI label where a command came from without a second request.
      scope: preset.workspaceId === null ? "builtin" : "workspace",
    };
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

  /**
   * Every command runnable inside a workspace: the workspace's own plus the built-ins.
   * A workspace command wins over a built-in with the same command string.
   * @param {number} workspaceId
   * @returns {Promise<object[]>}
   */
  forWorkspace: async function (workspaceId = null) {
    if (!workspaceId) return [];
    try {
      const [builtins, owned] = await Promise.all([
        prisma.slash_command_presets.findMany({
          where: { workspaceId: null },
          orderBy: { createdAt: "asc" },
        }),
        prisma.slash_command_presets.findMany({
          where: { workspaceId: Number(workspaceId) },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      const shadowed = new Set(owned.map((preset) => preset.command));
      return [
        ...builtins
          .filter((preset) => !shadowed.has(preset.command))
          .map(this.toPublic),
        ...owned.map(this.toPublic),
      ];
    } catch (error) {
      console.error("Failed to get workspace presets", error.message);
      return [];
    }
  },

  /**
   * The built-in defaults, for the instance-wide management screen.
   * @returns {Promise<object[]>}
   */
  builtins: async function () {
    try {
      return (
        await prisma.slash_command_presets.findMany({
          where: { workspaceId: null },
          orderBy: { createdAt: "asc" },
        })
      ).map(this.toPublic);
    } catch (error) {
      console.error("Failed to get built-in presets", error.message);
      return [];
    }
  },

  /**
   * Only the workspace's own commands - what its settings screen edits. Built-ins are
   * deliberately excluded so a workspace manager cannot edit them from here.
   * @param {number} workspaceId
   * @returns {Promise<object[]>}
   */
  ownedByWorkspace: async function (workspaceId = null) {
    if (!workspaceId) return [];
    try {
      return (
        await prisma.slash_command_presets.findMany({
          where: { workspaceId: Number(workspaceId) },
          orderBy: { createdAt: "asc" },
        })
      ).map(this.toPublic);
    } catch (error) {
      console.error("Failed to get workspace-owned presets", error.message);
      return [];
    }
  },

  /**
   * @param {{command: string, prompt: string, description: string}} presetData
   * @param {{workspaceId?: number|null, userId?: number|null}} scope - omit workspaceId
   * (or pass null) to create a built-in.
   */
  create: async function (
    presetData = {},
    { workspaceId = null, userId = null } = {}
  ) {
    const scopedWorkspaceId = workspaceId ? Number(workspaceId) : null;
    try {
      const existingPreset = await this.get({
        workspaceId: scopedWorkspaceId,
        command: String(presetData.command),
      });
      if (existingPreset) {
        console.log(
          "SlashCommandPresets.create - preset already exists in this scope - will not create"
        );
        return existingPreset;
      }

      return await prisma.slash_command_presets.create({
        data: {
          command: String(presetData.command),
          prompt: String(presetData.prompt),
          description: String(presetData.description),
          workspaceId: scopedWorkspaceId,
          userId: userId ? Number(userId) : null,
        },
      });
    } catch (error) {
      console.error("Failed to create preset", error.message);
      return null;
    }
  },

  update: async function (presetId = null, presetData = {}) {
    try {
      return await prisma.slash_command_presets.update({
        where: { id: Number(presetId) },
        data: { ...presetData, lastUpdatedAt: new Date() },
      });
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
};

module.exports.SlashCommandPresets = SlashCommandPresets;
