import React, { useState, createContext, useEffect } from "react";
import {
  AUTH_TIMESTAMP,
  AUTH_TOKEN,
  AUTH_USER,
  USER_PROMPT_INPUT_MAP,
} from "@/utils/constants";
import System from "./models/system";
import { useNavigate } from "react-router-dom";
import { safeJsonParse } from "@/utils/request";
import {
  storePermissions,
  clearPermissions,
  clearRoleLabel,
} from "@/utils/permissions";

export const AuthContext = createContext(null);
export function AuthProvider(props) {
  const localUser = localStorage.getItem(AUTH_USER);
  const localAuthToken = localStorage.getItem(AUTH_TOKEN);
  const [store, setStore] = useState({
    user: localUser ? safeJsonParse(localUser, null) : null,
    authToken: localAuthToken ? localAuthToken : null,
  });

  const navigate = useNavigate();

  /* NOTE: There's no reason for these helper functions to be stateful. They
   * could just be regular funcs or methods on a basic object.
   *
   * `updateUser` is how a newly issued session is handed to this provider.
   * Writing AUTH_USER/AUTH_TOKEN to local storage directly instead does not
   * work: `authToken` below is read once, at mount, and the refresh effect only
   * fires when it *changes* - so a session created after mount (onboarding, which
   * runs before any account exists) would leave `store.user` null for the rest of
   * the page's life, and anything reading `useUser()` renders empty.
   */
  const [actions] = useState({
    updateUser: (user, authToken = "") => {
      localStorage.setItem(AUTH_USER, JSON.stringify(user));
      localStorage.setItem(AUTH_TOKEN, authToken);
      setStore({ user, authToken });
    },
    unsetUser: () => {
      localStorage.removeItem(AUTH_USER);
      localStorage.removeItem(AUTH_TOKEN);
      localStorage.removeItem(AUTH_TIMESTAMP);
      localStorage.removeItem(USER_PROMPT_INPUT_MAP);
      clearPermissions();
      clearRoleLabel();
      setStore({ user: null, authToken: null });
    },
  });

  /*
   * On initial mount and whenever the token changes, fetch a new user object.
   * If the session is dead or the user is suspended (success === false) log them out and
   * redirect to the login page; otherwise refresh the cached user and their permissions.
   */
  useEffect(() => {
    async function refreshUser() {
      const { success, user: refreshedUser } = await System.refreshUser();
      if (!success) {
        localStorage.removeItem(AUTH_USER);
        localStorage.removeItem(AUTH_TOKEN);
        localStorage.removeItem(AUTH_TIMESTAMP);
        localStorage.removeItem(USER_PROMPT_INPUT_MAP);
        clearPermissions();
        clearRoleLabel();
        setStore({ user: null, authToken: null });
        navigate("/login");
        return;
      }

      localStorage.setItem(AUTH_USER, JSON.stringify(refreshedUser));
      // Keep the permission cache in step with the role the refreshed user now holds.
      storePermissions(refreshedUser.permissions);
      setStore((prev) => ({
        ...prev,
        user: refreshedUser,
      }));
    }
    if (store.authToken) refreshUser();
  }, [store.authToken]);

  return (
    <AuthContext.Provider value={{ store, actions }}>
      {props.children}
    </AuthContext.Provider>
  );
}
