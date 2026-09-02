import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const Line = {
  /**
   * Current LINE connector status: whether it's configured/active, which
   * workspace it answers from, and the webhook URL's secret suffix (if any).
   * @returns {Promise<object>}
   */
  config: async () => {
    return await fetch(`${API_BASE}/line/config`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  /**
   * Verify the channel access token with LINE, then save + activate the connector.
   * @param {{channel_access_token: string, channel_secret: string, default_workspace: string|null}} data
   * @returns {Promise<{success: boolean, error: string|null, botDisplayName?: string}>}
   */
  connect: async (data) => {
    return await fetch(`${API_BASE}/line/connect`, {
      method: "POST",
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /**
   * Disconnect the LINE bot and delete its stored credentials.
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  disconnect: async () => {
    return await fetch(`${API_BASE}/line/disconnect`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /**
   * LINE users who completed username + email-OTP verification.
   * @returns {Promise<{users: {lineUserId: string, username: string, activeWorkspace: string|null, verifiedAt: string|null}[]}>}
   */
  approvedUsers: async () => {
    return await fetch(`${API_BASE}/line/approved-users`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ users: [], error: e.message }));
  },

  /**
   * Set which of their own accessible workspaces a verified LINE user starts in.
   * @param {string} lineUserId
   * @param {string} workspaceSlug
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  setUserWorkspace: async (lineUserId, workspaceSlug) => {
    return await fetch(`${API_BASE}/line/set-user-workspace`, {
      method: "POST",
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lineUserId, workspaceSlug }),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /**
   * Un-pair a LINE user - they'll need to /link again to chat.
   * @param {string} lineUserId
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  revokeUser: async (lineUserId) => {
    return await fetch(`${API_BASE}/line/revoke-user`, {
      method: "POST",
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lineUserId }),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /**
   * The signed-in user's own LINE connection, if they have one.
   * @returns {Promise<{available: boolean, basicId: string|null, addFriendUrl: string|null, link: object|null}>}
   */
  myConnection: async () => {
    return await fetch(`${API_BASE}/line/my-connection`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { available: false, basicId: null, addFriendUrl: null, link: null };
      });
  },

  /**
   * Mint a short-lived code the signed-in user sends to the bot to link their chat.
   * @returns {Promise<{success: boolean, code: string|null, username: string|null, expiresAt: number|null, ttlMs: number|null, basicId: string|null, addFriendUrl: string|null, error: string|null}>}
   */
  requestPairingCode: async () => {
    return await fetch(`${API_BASE}/line/pairing-code`, {
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
   * Detach the signed-in user's own LINE chat.
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  unlinkSelf: async () => {
    return await fetch(`${API_BASE}/line/unlink`, {
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

export default Line;
