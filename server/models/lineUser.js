const prisma = require("../utils/prisma");

/**
 * A LINE chat that has been bound to a NexusAI account.
 *
 * The instance runs a single shared bot. Everything that decides what an incoming
 * message may see - which workspaces are listed, whose chat history is loaded, who
 * the chat is stored as - hangs off the row this model returns, so an unlinked
 * lineUserId can never reach a workspace. Mirrors TelegramUser.
 */
const LineUser = {
  /**
   * Fetch a link by its LINE userId, with the owning user attached.
   * @param {string} lineUserId
   * @returns {Promise<(import("@prisma/client").line_users & {user: import("@prisma/client").users})|null>}
   */
  getByLineUserId: async function (lineUserId) {
    try {
      return await prisma.line_users.findUnique({
        where: { line_user_id: String(lineUserId) },
        include: { user: true },
      });
    } catch (error) {
      console.error("LineUser.getByLineUserId", error.message);
      return null;
    }
  },

  /**
   * Fetch the link belonging to a NexusAI user, if they have one.
   * @param {number} userId
   * @returns {Promise<import("@prisma/client").line_users|null>}
   */
  getByUserId: async function (userId) {
    try {
      return await prisma.line_users.findFirst({
        where: { user_id: Number(userId) },
      });
    } catch (error) {
      console.error("LineUser.getByUserId", error.message);
      return null;
    }
  },

  /**
   * Bind a LINE chat to a user. A chat can only ever point at one account, and an
   * account only keeps its most recent chat - re-linking from a second LINE
   * account silently replaces the first so an abandoned chat cannot keep asking
   * questions as someone who has moved on.
   * @param {{lineUserId: string, userId: number, lineDisplayName?: string|null}} params
   * @returns {Promise<{link: object|null, error: string|null}>}
   */
  link: async function ({ lineUserId, userId, lineDisplayName = null }) {
    try {
      await prisma.line_users.deleteMany({
        where: {
          user_id: Number(userId),
          NOT: { line_user_id: String(lineUserId) },
        },
      });

      const link = await prisma.line_users.upsert({
        where: { line_user_id: String(lineUserId) },
        update: {
          user_id: Number(userId),
          line_display_name: lineDisplayName,
          active_workspace_id: null,
          lastActiveAt: new Date(),
        },
        create: {
          line_user_id: String(lineUserId),
          user_id: Number(userId),
          line_display_name: lineDisplayName,
        },
      });
      return { link, error: null };
    } catch (error) {
      console.error("LineUser.link", error.message);
      return { link: null, error: error.message };
    }
  },

  /**
   * Persist which workspace a chat is currently pointed at.
   * @param {string} lineUserId
   * @param {number|null} workspaceId
   * @returns {Promise<boolean>}
   */
  setActiveWorkspace: async function (lineUserId, workspaceId) {
    try {
      await prisma.line_users.update({
        where: { line_user_id: String(lineUserId) },
        data: {
          active_workspace_id: workspaceId ? Number(workspaceId) : null,
          lastActiveAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error("LineUser.setActiveWorkspace", error.message);
      return false;
    }
  },

  /**
   * Persist the language the assistant must reply in for this chat.
   * @param {string} lineUserId
   * @param {string|null} language - a supported code, or null for auto.
   * @returns {Promise<boolean>}
   */
  setResponseLanguage: async function (lineUserId, language) {
    try {
      await prisma.line_users.update({
        where: { line_user_id: String(lineUserId) },
        data: { response_language: language || null, lastActiveAt: new Date() },
      });
      return true;
    } catch (error) {
      console.error("LineUser.setResponseLanguage", error.message);
      return false;
    }
  },

  /**
   * Remove a link by LINE userId.
   * @param {string} lineUserId
   * @returns {Promise<boolean>}
   */
  unlinkByLineUserId: async function (lineUserId) {
    try {
      await prisma.line_users.deleteMany({
        where: { line_user_id: String(lineUserId) },
      });
      return true;
    } catch (error) {
      console.error("LineUser.unlinkByLineUserId", error.message);
      return false;
    }
  },

  /**
   * Remove whatever link a user holds.
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  unlinkByUserId: async function (userId) {
    try {
      await prisma.line_users.deleteMany({
        where: { user_id: Number(userId) },
      });
      return true;
    } catch (error) {
      console.error("LineUser.unlinkByUserId", error.message);
      return false;
    }
  },

  /**
   * Every link on the instance, newest first, with the owning user and the
   * workspace they are currently chatting in attached. Used by the settings page.
   * @returns {Promise<object[]>}
   */
  all: async function () {
    try {
      return await prisma.line_users.findMany({
        include: { user: true, active_workspace: true },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("LineUser.all", error.message);
      return [];
    }
  },

  /**
   * How many chats are linked on this instance.
   * @returns {Promise<number>}
   */
  count: async function () {
    try {
      return await prisma.line_users.count();
    } catch (error) {
      console.error("LineUser.count", error.message);
      return 0;
    }
  },

  /**
   * Drop every link on the instance. Called when the bot is disconnected - the
   * links are meaningless without a bot and a new bot should start clean.
   * @returns {Promise<boolean>}
   */
  deleteAll: async function () {
    try {
      await prisma.line_users.deleteMany({});
      return true;
    } catch (error) {
      console.error("LineUser.deleteAll", error.message);
      return false;
    }
  },
};

module.exports = { LineUser };
