import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useLogo from "@/hooks/useLogo";
import paths from "@/utils/paths";
import { sessionStateForUser } from "@/utils/session";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { clearPermissions, clearRoleLabel } from "@/utils/permissions";
import { ChangePasswordForm } from "@/components/Modals/ChangePassword";
import { FullScreenLoader } from "@/components/Preloader";
import { Button } from "@/components/ui/button";

function signOut() {
  window.localStorage.removeItem(AUTH_USER);
  window.localStorage.removeItem(AUTH_TOKEN);
  window.localStorage.removeItem(AUTH_TIMESTAMP);
  clearPermissions();
  clearRoleLabel();
  window.location = paths.login();
}

/**
 * Resolves whether this page should render at all, and in which of its two modes.
 * `forced` is read from the server rather than the cached session user so that a reset
 * an admin performed mid-session is picked up on the next load.
 */
function useChangePasswordState() {
  const [state, setState] = useState({
    loading: true,
    authed: false,
    forced: false,
  });

  useEffect(() => {
    async function resolve() {
      if (!localStorage.getItem(AUTH_TOKEN)) {
        setState({ loading: false, authed: false, forced: false });
        return;
      }

      const session = await sessionStateForUser();
      setState({
        loading: false,
        authed: session.valid,
        forced: session.requiresPasswordChange,
      });
    }
    resolve();
  }, []);

  return state;
}

/**
 * The `/change-password` screen. It serves double duty: the mandatory stop for anyone
 * still holding a password an admin generated for them, and a linkable page for a user
 * who simply wants to rotate their own. The forced variant omits the current-password
 * field - they authenticated with that password seconds ago - and offers no way out
 * except signing out, because the server refuses every other endpoint until they finish.
 */
export default function ChangePassword() {
  const { t } = useTranslation();
  const { loginLogo, isCustomLogo } = useLogo();
  const { loading, authed, forced } = useChangePasswordState();

  if (loading) return <FullScreenLoader />;
  if (!authed) return <Navigate to={paths.login(true)} />;

  return (
    <div className="fixed inset-0 bg-zinc-950 light:bg-slate-50 flex flex-col items-center justify-center overflow-y-auto p-6">
      <img
        src={loginLogo}
        alt="Logo"
        className={`max-h-[80px] ${isCustomLogo ? "rounded-lg" : ""}`}
        style={{ objectFit: "contain" }}
      />
      <div className="w-full max-w-md mt-8">
        <div className="flex flex-col items-center gap-y-3 mb-8">
          <h3 className="text-theme-text-primary light:text-slate-950 text-3xl font-medium text-center">
            {forced
              ? t("password_change.forced_title")
              : t("password_change.title")}
          </h3>
          <p className="text-zinc-400 light:text-zinc-600 text-sm text-center">
            {forced
              ? t("password_change.forced_description")
              : t("password_change.page_description")}
          </p>
        </div>
        <ChangePasswordForm
          requireCurrentPassword={!forced}
          onSuccess={() => (window.location = paths.home())}
          actions={({ loading: submitting }) => (
            <div className="flex flex-col items-center gap-y-4 pt-2">
              <Button
                variant="default"
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting
                  ? t("password_change.updating")
                  : forced
                    ? t("password_change.forced_submit")
                    : t("password_change.title")}
              </Button>
              <button
                type="button"
                onClick={
                  forced ? signOut : () => (window.location = paths.home())
                }
                className="text-zinc-200 light:text-zinc-600 hover:text-sky-300 light:hover:text-sky-600 hover:underline text-sm"
              >
                {forced
                  ? t("password_change.sign_out")
                  : t("password_change.cancel")}
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
