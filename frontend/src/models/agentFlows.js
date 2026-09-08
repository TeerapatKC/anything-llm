import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const AgentFlows = {
  /**
   * Save a flow configuration
   * @param {string} name - Display name of the flow
   * @param {object} config - The configuration object for the flow
   * @param {string} [uuid] - Optional UUID for updating existing flow
   * @returns {Promise<{success: boolean, error: string | null, flow: {name: string, config: object, uuid: string} | null}>}
   */
  saveFlow: async (name, config, uuid = null) => {
    return await fetch(`${API_BASE}/agent-flows/save`, {
      method: "POST",
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, config, uuid }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.error || "Failed to save flow");
        return res;
      })
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        error: e.message,
        flow: null,
      }));
  },

  /**
   * List all available flows in the system
   * @returns {Promise<{success: boolean, error: string | null, flows: Array<{name: string, uuid: string, description: string, steps: Array}>}>}
   */
  listFlows: async () => {
    return await fetch(`${API_BASE}/agent-flows/list`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        error: e.message,
        flows: [],
      }));
  },

  /**
   * Get a specific flow by UUID
   * @param {string} uuid - The UUID of the flow to retrieve
   * @returns {Promise<{success: boolean, error: string | null, flow: {name: string, config: object, uuid: string} | null}>}
   */
  getFlow: async (uuid) => {
    return await fetch(`${API_BASE}/agent-flows/${uuid}`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.error || "Failed to get flow");
        return res;
      })
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        error: e.message,
        flow: null,
      }));
  },

  /**
   * Execute a specific flow
   * @param {string} uuid - The UUID of the flow to run
   * @param {object} variables - Optional variables to pass to the flow
   * @returns {Promise<{success: boolean, error: string | null, results: object | null}>}
   */
  // runFlow: async (uuid, variables = {}) => {
  //   return await fetch(`${API_BASE}/agent-flows/${uuid}/run`, {
  //     method: "POST",
  //     headers: {
  //       ...baseHeaders(),
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({ variables }),
  //   })
  //     .then((res) => {
  //       if (!res.ok) throw new Error(response.error || "Failed to run flow");
  //       return res;
  //     })
  //     .then((res) => res.json())
  //     .catch((e) => ({
  //       success: false,
  //       error: e.message,
  //       results: null,
  //     }));
  // },

  /**
   * Delete a specific flow
   * @param {string} uuid - The UUID of the flow to delete
   * @returns {Promise<{success: boolean, error: string | null}>}
   */
  deleteFlow: async (uuid) => {
    return await fetch(`${API_BASE}/agent-flows/${uuid}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.error || "Failed to delete flow");
        return res;
      })
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        error: e.message,
      }));
  },

  /**
   * List every workspace and whether this flow is currently active for it
   * @param {string} uuid - The UUID of the flow
   * @returns {Promise<{success: boolean, error: string | null, workspaces: Array<{id: number, name: string, slug: string, enabled: boolean}>}>}
   */
  getFlowWorkspaces: async (uuid) => {
    return await fetch(`${API_BASE}/agent-flows/${uuid}/workspaces`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        error: e.message,
        workspaces: [],
      }));
  },

  /**
   * Set the exact list of workspaces that can see/use this flow
   * @param {string} uuid - The UUID of the flow
   * @param {number[]} workspaceIds - Workspace ids that should have this flow enabled
   * @returns {Promise<{success: boolean, error: string | null}>}
   */
  updateFlowWorkspaces: async (uuid, workspaceIds = []) => {
    return await fetch(`${API_BASE}/agent-flows/${uuid}/workspaces`, {
      method: "POST",
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workspaceIds }),
    })
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        error: e.message,
      }));
  },

  /**
   * Toggle a flow's active status
   * @param {string} uuid - The UUID of the flow to toggle
   * @param {boolean} active - The new active status
   * @returns {Promise<{success: boolean, error: string | null}>}
   */
  toggleFlow: async (uuid, active) => {
    try {
      const result = await fetch(`${API_BASE}/agent-flows/${uuid}/toggle`, {
        method: "POST",
        headers: {
          ...baseHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(res.error || "Failed to toggle flow");
          return res;
        })
        .then((res) => res.json());
      return { success: true, flow: result.flow };
    } catch (error) {
      console.error("Failed to toggle flow:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Flows owned by a single workspace.
   *
   * A separate namespace rather than an extra argument on the calls above, because these
   * hit workspace-scoped routes gated on a workspace permission - a workspace manager can
   * reach these without holding the instance-wide `agents.flows` permission, and cannot
   * touch a global flow through them.
   */
  workspace: {
    /**
     * @param {string} slug - workspace slug
     * @returns {Promise<{success: boolean, error: string | null, flows: Array<{name: string, uuid: string, description: string, active: boolean, scope: string}>}>}
     */
    listFlows: async (slug) => {
      return await fetch(`${API_BASE}/workspace/${slug}/agent-flows`, {
        method: "GET",
        headers: baseHeaders(),
      })
        .then((res) => res.json())
        .catch((e) => ({ success: false, error: e.message, flows: [] }));
    },

    /**
     * @param {string} slug - workspace slug
     * @param {string} uuid - flow uuid
     * @returns {Promise<{success: boolean, error: string | null, flow: object | null}>}
     */
    getFlow: async (slug, uuid) => {
      return await fetch(`${API_BASE}/workspace/${slug}/agent-flows/${uuid}`, {
        method: "GET",
        headers: baseHeaders(),
      })
        .then((res) => res.json())
        .catch((e) => ({ success: false, error: e.message, flow: null }));
    },

    /**
     * Create a flow owned by this workspace, or update one it already owns.
     * @param {string} slug - workspace slug
     * @param {string} name - display name
     * @param {object} config - flow configuration
     * @param {string|null} uuid - omit to create
     * @returns {Promise<{success: boolean, error: string | null, uuid: string | null}>}
     */
    saveFlow: async (slug, name, config, uuid = null) => {
      const url = uuid
        ? `${API_BASE}/workspace/${slug}/agent-flows/${uuid}`
        : `${API_BASE}/workspace/${slug}/agent-flows`;
      return await fetch(url, {
        method: "POST",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name, config }),
      })
        .then((res) => res.json())
        .catch((e) => ({ success: false, error: e.message, uuid: null }));
    },

    /**
     * @param {string} slug - workspace slug
     * @param {string} uuid - flow uuid
     * @returns {Promise<{success: boolean, error: string | null}>}
     */
    deleteFlow: async (slug, uuid) => {
      return await fetch(`${API_BASE}/workspace/${slug}/agent-flows/${uuid}`, {
        method: "DELETE",
        headers: baseHeaders(),
      })
        .then((res) => res.json())
        .catch((e) => ({ success: false, error: e.message }));
    },

    /**
     * @param {string} slug - workspace slug
     * @param {string} uuid - flow uuid
     * @param {boolean} active - new active state
     * @returns {Promise<{success: boolean, error: string | null}>}
     */
    toggleFlow: async (slug, uuid, active) => {
      return await fetch(
        `${API_BASE}/workspace/${slug}/agent-flows/${uuid}/toggle`,
        {
          method: "POST",
          headers: { ...baseHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ active }),
        }
      )
        .then((res) => res.json())
        .catch((e) => ({ success: false, error: e.message }));
    },
  },
};

export default AgentFlows;
