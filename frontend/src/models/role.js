import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const Role = {
  /**
   * All roles on the instance with their granted permission keys and member counts.
   * @returns {Promise<{roles: Array, error: string|null}>}
   */
  all: async function () {
    return await fetch(`${API_BASE}/roles`, { headers: baseHeaders() })
      .then((res) => res.json())
      .catch((e) => ({ roles: [], error: e.message }));
  },

  /**
   * The permission catalog, grouped by category, for rendering the checkbox list.
   * @returns {Promise<{categories: Array, error: string|null}>}
   */
  permissionCatalog: async function (scope = "system") {
    return await fetch(`${API_BASE}/roles/permissions?scope=${scope}`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ categories: [], error: e.message }));
  },

  create: async function (data) {
    return await fetch(`${API_BASE}/roles/new`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => ({ role: null, error: e.message }));
  },

  update: async function (id, data) {
    return await fetch(`${API_BASE}/roles/${id}`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => ({ role: null, error: e.message }));
  },

  delete: async function (id) {
    return await fetch(`${API_BASE}/roles/${id}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /**
   * The permissions the signed-in user currently holds. Used to refresh the cached
   * session user after an operator changes what their role grants.
   * @returns {Promise<{permissions: string[], role: string|null}>}
   */
  myPermissions: async function () {
    return await fetch(`${API_BASE}/roles/me/permissions`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ permissions: [], role: null }));
  },
};

/**
 * Workspace roles are the reusable per-workspace roles (Viewer, Contributor, ...) that
 * are assigned to each member of a workspace.
 */
export const WorkspaceRole = {
  all: async function () {
    return await fetch(`${API_BASE}/workspace-roles`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ roles: [], error: e.message }));
  },

  create: async function (data) {
    return await fetch(`${API_BASE}/workspace-roles/new`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => ({ role: null, error: e.message }));
  },

  update: async function (id, data) {
    return await fetch(`${API_BASE}/workspace-roles/${id}`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => ({ role: null, error: e.message }));
  },

  delete: async function (id) {
    return await fetch(`${API_BASE}/workspace-roles/${id}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /**
   * The roles assignable inside one workspace - shared ones plus that workspace's own.
   * @param {string} slug
   */
  forWorkspace: async function (slug) {
    return await fetch(`${API_BASE}/workspace/${slug}/roles`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ roles: [], canDefineRoles: false, error: e.message }));
  },

  /** Creates a role that exists only inside one workspace. */
  createInWorkspace: async function (slug, data) {
    return await fetch(`${API_BASE}/workspace/${slug}/roles/new`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => ({ role: null, error: e.message }));
  },

  updateInWorkspace: async function (slug, id, data) {
    return await fetch(`${API_BASE}/workspace/${slug}/roles/${id}`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => ({ role: null, error: e.message }));
  },

  deleteInWorkspace: async function (slug, id) {
    return await fetch(`${API_BASE}/workspace/${slug}/roles/${id}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },

  /** The members of one workspace with the workspace role each holds. */
  members: async function (slug) {
    return await fetch(`${API_BASE}/workspace/${slug}/members`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ members: [], error: e.message }));
  },

  /** Changes the workspace role one member holds in one workspace. */
  setMemberRole: async function (slug, userId, workspaceRoleId) {
    return await fetch(`${API_BASE}/workspace/${slug}/members/${userId}/role`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ workspaceRoleId }),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },
};

export default Role;
