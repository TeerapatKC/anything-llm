import { useState, useEffect } from "react";
import System from "../../../models/system";
import LoginForm from "./LoginForm";
import {
  AUTH_TOKEN,
  AUTH_USER,
  AUTH_TIMESTAMP,
} from "../../../utils/constants";
import { clearPermissions, clearRoleLabel } from "@/utils/permissions";
import useLogo from "../../../hooks/useLogo";

export default function PasswordModal() {
  const { loginLogo, isCustomLogo } = useLogo();
  return (
    <div className="fixed inset-0 bg-zinc-950 light:bg-slate-50 flex flex-col items-center justify-center overflow-hidden">
      <img
        src={loginLogo}
        alt="Logo"
        className={`max-h-[80px] ${isCustomLogo ? "rounded-lg" : ""}`}
        style={{ objectFit: "contain" }}
      />
      <LoginForm />
    </div>
  );
}

export function usePasswordModal(notry = false) {
  const [auth, setAuth] = useState({
    loading: true,
    requiresAuth: false,
  });

  useEffect(() => {
    async function checkAuthReq() {
      if (!window) return;

      // If the last validity check is still valid
      // we can skip the loading.
      if (!System.needsAuthCheck() && notry === false) {
        setAuth({ loading: false, requiresAuth: false });
        return;
      }

      const currentToken = window.localStorage.getItem(AUTH_TOKEN);
      if (!currentToken) {
        setAuth({ loading: false, requiresAuth: true });
        return;
      }

      const valid = notry ? false : await System.checkAuth(currentToken);
      if (!valid) {
        setAuth({ loading: false, requiresAuth: true });
        window.localStorage.removeItem(AUTH_USER);
        clearPermissions();
        clearRoleLabel();
        window.localStorage.removeItem(AUTH_TOKEN);
        window.localStorage.removeItem(AUTH_TIMESTAMP);
        return;
      }

      setAuth({ loading: false, requiresAuth: false });
    }
    checkAuthReq();
  }, []);

  return auth;
}
