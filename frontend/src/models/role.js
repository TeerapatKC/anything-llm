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
  permissionCatalog: async function () {
    return await fetch(`${API_BASE}/roles/permissions`, {
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

export default Role;
