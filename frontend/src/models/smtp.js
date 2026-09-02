import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const SMTP = {
  /**
   * Current SMTP configuration (password masked).
   * @returns {Promise<object>}
   */
  settings: async () => {
    return await fetch(`${API_BASE}/smtp`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => ({ error: e.message }));
  },

  /**
   * Save the SMTP configuration.
   * @param {{enabled: boolean, provider: string, host: string, port: string|number, secure: boolean, username: string, password: string, fromEmail: string, fromName: string}} data
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  update: async (data) => {
    return await fetch(`${API_BASE}/smtp`, {
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
   * Send a test email using the saved SMTP configuration.
   * @param {string} to
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  sendTest: async (to) => {
    return await fetch(`${API_BASE}/smtp/test`, {
      method: "POST",
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to }),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },
};

export default SMTP;
