import { API_BASE } from "./constants";
import { baseHeaders } from "./request";

/**
 * Checks current localstorage and validates the session based on that. Also reports
 * whether the account is being held on an admin-generated password, which the server
 * answers freshly on every call so a reset takes hold on the next page load.
 * @returns {Promise<{valid: boolean, requiresPasswordChange: boolean}>}
 */
export async function sessionStateForUser() {
  return await fetch(`${API_BASE}/system/check-token`, {
    method: "GET",
    cache: "default",
    headers: baseHeaders(),
  })
    .then(async (res) => {
      if (res.status !== 200)
        return { valid: false, requiresPasswordChange: false };
      const data = await res.json().catch(() => ({}));
      return {
        valid: true,
        requiresPasswordChange: !!data?.requiresPasswordChange,
      };
    })
    .catch(() => ({ valid: false, requiresPasswordChange: false }));
}

// Checks current localstorage and validates the session based on that.
export default async function validateSessionTokenForUser() {
  return (await sessionStateForUser()).valid;
}
