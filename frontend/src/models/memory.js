import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

/**
 * @typedef {Object} Memory
 * @property {number} id
 * @property {number|null} userId
 * @property {number|null} workspaceId
 * @property {"workspace"|"global"} scope
 * @property {string} content
 * @property {string|null} lastUsedAt
 * @property {string} createdAt
 * @property {string} updatedAt
 */

const DEFAULT_PREFERENCES = {
  preferences: { memoryEnabled: null, memoryAutoExtraction: null },
  instance: { memoryEnabled: false, memoryAutoExtraction: true },
  effective: { memoryEnabled: false, memoryAutoExtraction: false },
};

const Memory = {
  /**
   * The signed-in user's personalization preferences.
   *
   * `preferences` is what they chose (`null` = follow the instance), `instance`
   * is the admin policy they sit under, and `effective` is the two ANDed - the
   * UI needs all three to show the right state and explain why it is off.
   * @returns {Promise<typeof DEFAULT_PREFERENCES>}
   */
  preferences: async function () {
    return await fetch(`${API_BASE}/memories/preferences`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => ({ ...DEFAULT_PREFERENCES, ...res }))
      .catch(() => DEFAULT_PREFERENCES);
  },

  /**
   * Update the signed-in user's own preferences.
   * @param {{memoryEnabled?: boolean|null, memoryAutoExtraction?: boolean|null}} updates
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  updatePreferences: async function (updates) {
    return await fetch(`${API_BASE}/memories/preferences`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(updates),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /**
   * Fetch all memories (global + workspace) for a workspace.
   * @param {string} slug
   * @returns {Promise<{global: Memory[], workspace: Memory[]}>}
   */
  forWorkspace: async function (slug) {
    return await fetch(`${API_BASE}/workspaces/${slug}/memories`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.memories || { global: [], workspace: [] })
      .catch(() => ({ global: [], workspace: [] }));
  },

  /**
   * Create a new memory for a workspace.
   * @param {string} slug
   * @param {{content: string, scope?: "workspace"|"global"}} body
   * @returns {Promise<{memory: Memory|null, error?: string}>}
   */
  create: async function (slug, { content, scope = "workspace" }) {
    return await fetch(`${API_BASE}/workspaces/${slug}/memories`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ content, scope }),
    })
      .then((res) => res.json())
      .catch((e) => ({ memory: null, error: e.message }));
  },

  /**
   * Update an existing memory's content.
   * @param {number} memoryId
   * @param {{content: string}} body
   * @returns {Promise<{memory: Memory|null, error?: string}>}
   */
  update: async function (memoryId, { content }) {
    return await fetch(`${API_BASE}/memories/${memoryId}`, {
      method: "PUT",
      headers: baseHeaders(),
      body: JSON.stringify({ content }),
    })
      .then((res) => res.json())
      .catch((e) => ({ memory: null, error: e.message }));
  },

  /**
   * Delete a memory.
   * @param {number} memoryId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  delete: async function (memoryId) {
    return await fetch(`${API_BASE}/memories/${memoryId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /**
   * Promote a workspace-scoped memory to global.
   * @param {number} memoryId
   * @returns {Promise<{memory: Memory|null, error?: string}>}
   */
  promoteToGlobal: async function (memoryId) {
    return await fetch(`${API_BASE}/memories/${memoryId}/promote`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ memory: null, error: e.message }));
  },

  /**
   * Demote a global memory to a specific workspace.
   * @param {number} memoryId
   * @param {string} slug
   * @returns {Promise<{memory: Memory|null, error?: string}>}
   */
  demoteToWorkspace: async function (memoryId, slug) {
    return await fetch(`${API_BASE}/memories/${memoryId}/demote/${slug}`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ memory: null, error: e.message }));
  },
};

export default Memory;
