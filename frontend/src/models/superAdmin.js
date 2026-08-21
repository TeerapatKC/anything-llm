import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

/**
 * The owner-only operations. Every route behind this model is gated on holding the
 * `super-admin` role server-side, not on a permission, so these calls 401 for everyone
 * else no matter what their role grants.
 */
const SuperAdmin = {
  /** Who owns the instance, what that means, and who ownership could move to. */
  state: async function () {
    return await fetch(`${API_BASE}/super-admin/state`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({
        owner: null,
        isOwner: false,
        capabilities: [],
        transferCandidates: [],
        error: e.message,
      }));
  },

  /**
   * Hands ownership to another account. The caller is demoted to Admin by the same
   * request, so this is the last owner-only call their session can make.
   * @param {number} targetUserId
   * @param {string} password - the caller's own password
   */
  transferOwnership: async function (targetUserId, password) {
    return await fetch(`${API_BASE}/super-admin/transfer`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ targetUserId, password }),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /** What each reset scope would remove, and the phrase required to confirm. */
  resetPreview: async function () {
    return await fetch(`${API_BASE}/super-admin/reset/preview`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({
        scopes: [],
        counts: {},
        confirmationPhrase: "",
        error: e.message,
      }));
  },

  /**
   * Irreversibly clears the chosen scopes.
   * @param {{scopes: string[], password: string, confirmation: string}} params
   */
  reset: async function ({ scopes, password, confirmation }) {
    return await fetch(`${API_BASE}/super-admin/reset`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ scopes, password, confirmation }),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /**
   * Returns the deployment to its pre-onboarding state. The caller's own account goes
   * with it, so the session is dead the moment this resolves - the caller must clear
   * local storage and send the browser to onboarding.
   * @param {{password: string, confirmation: string}} params
   */
  factoryReset: async function ({ password, confirmation }) {
    return await fetch(`${API_BASE}/super-admin/reset/factory`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ password, confirmation }),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },
};

export default SuperAdmin;
