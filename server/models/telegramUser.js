const prisma = require("../utils/prisma");

/**
 * A Telegram chat that has been bound to a NexusAI account.
 *
 * The instance runs a single shared bot. Everything that decides what an incoming
 * message may see - which workspaces are listed, whose chat history is loaded, who
 * the chat is stored as - hangs off the row this model returns, so an unlinked
 * chat_id can never reach a workspace.
 */
const TelegramUser = {
  /**
   * Fetch a link by its Telegram chat id, with the owning user attached.
   * @param {string|number} chatId
   * @returns {Promise<(import("@prisma/client").telegram_users & {user: import("@prisma/client").users})|null>}
   */
  getByChatId: async function (chatId) {
    try {
      return await prisma.telegram_users.findUnique({
        where: { chat_id: String(chatId) },
        include: { user: true },
      });
    } catch (error) {
      console.error("TelegramUser.getByChatId", error.message);
      return null;
    }
  },

  /**
   * Fetch the link belonging to a NexusAI user, if they have one.
   * @param {number} userId
   * @returns {Promise<import("@prisma/client").telegram_users|null>}
   */
  getByUserId: async function (userId) {
    try {
      return await prisma.telegram_users.findFirst({
        where: { user_id: Number(userId) },
      });
    } catch (error) {
      console.error("TelegramUser.getByUserId", error.message);
      return null;
    }
  },

  /**
   * Bind a Telegram chat to a user. A chat can only ever point at one account, and
   * an account only keeps its most recent chat - re-linking from a second Telegram
   * account silently replaces the first so an abandoned chat cannot keep asking
   * questions as someone who has moved on.
   * @param {{chatId: string|number, userId: number, telegramUsername?: string|null, telegramFirstName?: string|null}} params
   * @returns {Promise<{link: object|null, error: string|null}>}
   */
  link: async function ({
    chatId,
    userId,
    telegramUsername = null,
    telegramFirstName = null,
  }) {
    try {
      await prisma.telegram_users.deleteMany({
        where: { user_id: Number(userId), NOT: { chat_id: String(chatId) } },
      });

      const link = await prisma.telegram_users.upsert({
        where: { chat_id: String(chatId) },
        update: {
          user_id: Number(userId),
          telegram_username: telegramUsername,
          telegram_first_name: telegramFirstName,
          active_workspace_id: null,
          active_thread_id: null,
          lastActiveAt: new Date(),
        },
        create: {
          chat_id: String(chatId),
          user_id: Number(userId),
          telegram_username: telegramUsername,
          telegram_first_name: telegramFirstName,
        },
      });
      return { link, error: null };
    } catch (error) {
      console.error("TelegramUser.link", error.message);
      return { link: null, error: error.message };
    }
  },

  /**
   * Persist which workspace/thread a chat is currently pointed at, and the
   * language it wants answers in.
   * @param {string|number} chatId
   * @param {{workspaceId?: number|null, threadId?: number|null, language?: string|null}} state
   * @returns {Promise<boolean>}
   */
  setActiveState: async function (
    chatId,
    { workspaceId, threadId, language } = {}
  ) {
    try {
      const data = { lastActiveAt: new Date() };
      if (workspaceId !== undefined)
        data.active_workspace_id = workspaceId ? Number(workspaceId) : null;
      if (threadId !== undefined)
        data.active_thread_id = threadId ? Number(threadId) : null;
      if (language !== undefined) data.response_language = language || null;

      await prisma.telegram_users.update({
        where: { chat_id: String(chatId) },
        data,
      });
      return true;
    } catch (error) {
      console.error("TelegramUser.setActiveState", error.message);
      return false;
    }
  },

  /**
   * Remove a link by chat id.
   * @param {string|number} chatId
   * @returns {Promise<boolean>}
   */
  unlinkByChatId: async function (chatId) {
    try {
      await prisma.telegram_users.deleteMany({
        where: { chat_id: String(chatId) },
      });
      return true;
    } catch (error) {
      console.error("TelegramUser.unlinkByChatId", error.message);
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
      await prisma.telegram_users.deleteMany({
        where: { user_id: Number(userId) },
      });
      return true;
    } catch (error) {
      console.error("TelegramUser.unlinkByUserId", error.message);
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
      return await prisma.telegram_users.findMany({
        include: { user: true, active_workspace: true },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("TelegramUser.all", error.message);
      return [];
    }
  },

  /**
   * How many chats are linked on this instance.
   * @returns {Promise<number>}
   */
  count: async function () {
    try {
      return await prisma.telegram_users.count();
    } catch (error) {
      console.error("TelegramUser.count", error.message);
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
      await prisma.telegram_users.deleteMany({});
      return true;
    } catch (error) {
      console.error("TelegramUser.deleteAll", error.message);
      return false;
    }
  },
};

module.exports = { TelegramUser };
