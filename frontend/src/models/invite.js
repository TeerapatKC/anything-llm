import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const Invite = {
  checkInvite: async (inviteCode) => {
    return await fetch(`${API_BASE}/invite/${inviteCode}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { invite: null, error: e.message };
      });
  },
  acceptInvite: async (inviteCode, newUserInfo = {}) => {
    return await fetch(`${API_BASE}/invite/${inviteCode}`, {
      method: "POST",
      body: JSON.stringify(newUserInfo),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
  /**
   * Claim an invite with an account that already exists. `token` is passed
   * explicitly for the case where the visitor signs in on the invite screen
   * itself — localStorage has not been written yet at that point.
   */
  claimInvite: async (inviteCode, token = null) => {
    return await fetch(`${API_BASE}/invite/${inviteCode}/claim`, {
      method: "POST",
      headers: baseHeaders(token),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
};

export default Invite;
