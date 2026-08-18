import { useEffect, useState } from "react";
import System from "../../../models/system";
import { AUTH_TOKEN, AUTH_USER } from "../../../utils/constants";
import { storePermissions } from "@/utils/permissions";
import paths from "../../../utils/paths";
import { useTranslation } from "react-i18next";
import { t } from "i18next";

/**
 * Password recovery is no longer self-service - an admin generates a new password for
 * the account and hands it over, and the user is forced to replace it on login. All this
 * screen can do is tell them where to go.
 */
const ForgotPasswordNotice = ({ setShowForgotPassword }) => {
  return (
    <div className="flex flex-col justify-center items-center">
      <div className="flex items-start justify-between pt-7 pb-9">
        <div className="flex items-center flex-col gap-y-[18px] max-w-[300px]">
          <div className="flex gap-x-1">
            <h3 className="text-white light:text-slate-950 text-3xl leading-[28px] font-medium text-center white-space-nowrap block">
              {t("login.password-reset.title")}
            </h3>
          </div>
          <p className="text-zinc-400 light:text-zinc-600 text-sm text-center">
            {t("login.password-reset.admin-reset-description")}
          </p>
        </div>
      </div>
      <div className="flex items-center px-12 mt-2 space-x-2 w-full flex-col gap-y-6">
        <button
          type="button"
          className="text-zinc-950 bg-white hover:bg-zinc-300 light:bg-sky-200 light:text-slate-950 light:hover:bg-sky-300 text-sm font-semibold rounded-lg border-primary-button h-[34px] w-full"
          onClick={() => setShowForgotPassword(false)}
        >
          {t("login.password-reset.back-to-login")}
        </button>
      </div>
    </div>
  );
};

export default function MultiUserAuth() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [customAppName, setCustomAppName] = useState(null);

  const handleLogin = async (e) => {
    setError(null);
    setLoading(true);
    e.preventDefault();
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    const { valid, user, token, message } = await System.requestToken(data);
    if (valid && !!token && !!user) {
      window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
      window.localStorage.setItem(AUTH_TOKEN, token);
      storePermissions(user.permissions);
      // Users still on an admin-generated password land on the forced change screen,
      // which every private route redirects to while the flag is set.
      window.location = paths.home();
    } else {
      setError(message);
      setLoading(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchCustomAppName = async () => {
      const { appName } = await System.fetchCustomAppName();
      setCustomAppName(appName || "");
      setLoading(false);
    };
    fetchCustomAppName();
  }, []);

  if (showForgotPassword)
    return (
      <ForgotPasswordNotice setShowForgotPassword={setShowForgotPassword} />
    );

  return (
    <form
      onSubmit={handleLogin}
      className="flex flex-col justify-center items-center"
    >
      <div className="flex items-start justify-between pt-7 pb-9">
        <div className="flex items-center flex-col gap-y-[18px] max-w-[300px]">
          <div className="flex gap-x-1">
            <h3 className="text-white light:text-slate-950 text-[38px] leading-[28px] font-medium text-center white-space-nowrap block">
              {t("login.multi-user.welcome")}
            </h3>
          </div>
          <p className="text-zinc-400 light:text-zinc-600 text-sm text-center">
            {t("login.sign-in", { appName: customAppName || "AnythingLLM" })}
          </p>
        </div>
      </div>
      <div className="w-full px-12">
        <div className="w-full flex flex-col gap-y-3">
          <div className="w-full flex flex-col gap-y-2">
            <label className="text-zinc-300 light:text-slate-800 text-sm">
              {t("login.multi-user.placeholder-username")}
            </label>
            <input
              name="username"
              type="text"
              className="border-none bg-zinc-800 light:bg-slate-200 text-zinc-200 light:text-zinc-600 text-sm rounded-lg p-2.5 w-[300px] h-[34px] focus:outline-none focus:ring-1 focus:ring-sky-300"
              required={true}
              autoComplete="off"
            />
          </div>
          <div className="w-full px-0 flex flex-col gap-y-2">
            <label className="text-zinc-300 light:text-slate-800 text-sm">
              {t("login.multi-user.placeholder-password")}
            </label>
            <input
              name="password"
              type="password"
              className="border-none bg-zinc-800 light:bg-slate-200 text-zinc-200 light:text-zinc-600 text-sm rounded-lg p-2.5 w-[300px] h-[34px] focus:outline-none focus:ring-1 focus:ring-sky-300"
              required={true}
              autoComplete="off"
            />
          </div>
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
        </div>
      </div>
      <div className="flex items-center px-12 mt-9 space-x-2 w-full flex-col gap-y-6">
        <button
          disabled={loading}
          type="submit"
          className="text-zinc-950 bg-white hover:bg-zinc-300 light:bg-sky-200 light:text-slate-950 light:hover:bg-sky-300 text-sm font-semibold rounded-lg border-primary-button h-[34px] w-full"
        >
          {loading
            ? t("login.multi-user.validating")
            : t("login.multi-user.login")}
        </button>
        <button
          type="button"
          className="text-zinc-200 light:text-zinc-600 hover:text-sky-300 light:hover:text-sky-600 hover:underline text-sm flex gap-x-1"
          onClick={() => setShowForgotPassword(true)}
        >
          {t("login.multi-user.forgot-pass")}?
          <b className="font-semibold text-sky-300 light:text-sky-600">
            {t("login.multi-user.reset")}
          </b>
        </button>
      </div>
    </form>
  );
}
