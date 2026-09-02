import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const Telegram = {
  /**
   * Get the current Telegram bot configuration.
   * @returns {Promise<{config: object|null, error: string|null}>}
   */
  getConfig: async function () {
    return await fetch(`${API_BASE}/telegram/config`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { config: null, error: e.message };
      });
  },

  /**
   * Connect and start the Telegram bot with the given token.
   * @param {string} botToken - The bot API token from BotFather.
   * @returns {Promise<{success: boolean, bot_username: string|null, error: string|null}>}
   */
  connect: async function (botToken) {
    return await fetch(`${API_BASE}/telegram/connect`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ bot_token: botToken }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  /**
   * Disconnect and stop the Telegram bot.
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  disconnect: async function () {
    return await fetch(`${API_BASE}/telegram/disconnect`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  /**
   * Get the current bot connection status.
   * @returns {Promise<{active: boolean, bot_username: string|null}>}
   */
  status: async function () {
    return await fetch(`${API_BASE}/telegram/status`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { active: false, bot_username: null };
      });
  },

  /**
   * Every Telegram chat bound to an account on this instance. Admin view.
   * @returns {Promise<{users: Array}>}
   */
  getLinkedUsers: async function () {
    return await fetch(`${API_BASE}/telegram/linked-users`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { users: [] };
      });
  },

  /**
   * Disconnect someone else's Telegram chat. Admin action.
   * @param {string} chatId
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  unlinkUser: async function (chatId) {
    return await fetch(`${API_BASE}/telegram/unlink-user`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ chatId }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  /**
   * Update the Telegram bot configuration.
   * @param {object} updates - Config fields to update (e.g. voice_response_mode).
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  updateConfig: async function (updates) {
    return await fetch(`${API_BASE}/telegram/update-config`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(updates),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  /**
   * The signed-in user's own Telegram connection, if they have one.
   * @returns {Promise<{available: boolean, bot_username: string|null, link: object|null}>}
   */
  myConnection: async function () {
    return await fetch(`${API_BASE}/telegram/my-connection`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { available: false, bot_username: null, link: null };
      });
  },

  /**
   * Mint a short-lived code the signed-in user sends to the bot to link their chat.
   * @returns {Promise<{success: boolean, code: string|null, username: string|null, expiresAt: number|null, bot_username: string|null, error: string|null}>}
   */
  requestPairingCode: async function () {
    return await fetch(`${API_BASE}/telegram/pairing-code`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, code: null, error: e.message };
      });
  },

  /**
   * Detach the signed-in user's own Telegram chat.
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  unlinkSelf: async function () {
    return await fetch(`${API_BASE}/telegram/unlink`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
};

export default Telegram;
