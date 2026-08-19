import System from "@/models/system";
import showToast from "@/utils/toast";
import { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import paths from "@/utils/paths";
import { useNavigate } from "react-router-dom";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { storePermissions } from "@/utils/permissions";
import { useTranslation } from "react-i18next";
import { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from "@/utils/username";
import { PW_REGEX, PW_ALLOWED_SYMBOLS } from "@/utils/password";
import { FullScreenLoader } from "@/components/Preloader";

/**
 * Creates the instance's first system administrator, so this step is
 * unconditional - except on deploys that already created the admin from
 * `ADMIN_USERNAME`/`ADMIN_PASSWORD`, where there is nothing left to ask and we move on.
 */
export default function UserSetup({ setHeader, setForwardBtn, setBackBtn }) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true);
  const [formValid, setFormValid] = useState(false);
  const submitRef = useRef(null);
  const navigate = useNavigate();

  const TITLE = t("onboarding.userSetup.title");
  const DESCRIPTION = t("onboarding.userSetup.description");

  function handleForward() {
    submitRef.current?.click();
  }

  function handleBack() {
    navigate(paths.onboarding.llmPreference());
  }

  useEffect(() => {
    async function checkSetupState() {
      const needsAdminSetup = await System.needsAdminSetup();
      if (!needsAdminSetup) {
        // An admin was already created from the environment on first boot.
        navigate(paths.onboarding.dataHandling(), { replace: true });
        return;
      }
      setChecking(false);
    }
    checkSetupState();
  }, []);

  useEffect(() => {
    setForwardBtn({
      showing: true,
      disabled: !formValid,
      onClick: handleForward,
    });
  }, [formValid]);

  useEffect(() => {
    setHeader({ title: TITLE, description: DESCRIPTION });
    setBackBtn({ showing: true, disabled: false, onClick: handleBack });
  }, []);

  if (checking) return <FullScreenLoader />;

  return (
    <div className="w-full flex items-center justify-center flex-col gap-y-6">
      <AdminAccount
        setFormValid={setFormValid}
        submitRef={submitRef}
        navigate={navigate}
      />
    </div>
  );
}

const AdminAccount = ({ setFormValid, submitRef, navigate }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    if (!PW_REGEX.test(formData.get("password"))) {
      showToast(
        `Your password has restricted characters in it. Allowed symbols are ${PW_ALLOWED_SYMBOLS}`,
        "error"
      );
      return;
    }

    const data = {
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const { success, user, token, error } = await System.setupAdmin(data);
    if (!success) {
      showToast(`Error: ${error}`, "error");
      return;
    }

    // The setup call issues a session token so the operator is not bounced to /login
    // in the middle of onboarding.
    window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
    storePermissions(user.permissions);
    window.localStorage.setItem(AUTH_TOKEN, token);
    window.localStorage.removeItem(AUTH_TIMESTAMP);
    navigate(paths.onboarding.dataHandling());
  };

  const handleUsernameChange = debounce(
    (e) => setUsername(e.target.value),
    500
  );
  const handlePasswordChange = debounce(
    (e) => setPassword(e.target.value),
    500
  );

  useEffect(() => {
    // Enable the button on any input, so submitting surfaces the server's validation
    // errors rather than silently blocking on rules the user cannot see.
    setFormValid(username.trim().length > 0 && password.length > 0);
  }, [username, password]);

  return (
    <div className="w-full flex items-center justify-center border max-w-[600px] rounded-lg border-white/20 light:border-theme-sidebar-border">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col w-full md:px-8 px-2 py-4">
          <div className="space-y-6 flex h-full w-full">
            <div className="w-full flex flex-col gap-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block mb-3 text-sm font-medium text-theme-text-primary"
                >
                  {t("onboarding.userSetup.adminUsername")}
                </label>
                <input
                  name="username"
                  type="text"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg block w-full p-2.5 focus:outline-primary-button active:outline-primary-button placeholder:text-theme-text-secondary outline-none"
                  placeholder="Your admin username"
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  required={true}
                  autoComplete="off"
                  onChange={handleUsernameChange}
                />
              </div>
              <p className=" text-theme-text-primary/80 text-xs font-base">
                {t("common.username_requirements")}
              </p>
              <div className="mt-4">
                <label
                  htmlFor="email"
                  className="block mb-3 text-sm font-medium text-theme-text-primary"
                >
                  {t("onboarding.userSetup.adminEmail")}
                </label>
                <input
                  name="email"
                  type="email"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg block w-full p-2.5 focus:outline-primary-button active:outline-primary-button placeholder:text-theme-text-secondary outline-none"
                  placeholder="admin@example.com"
                  maxLength={255}
                  required={true}
                  autoComplete="off"
                />
              </div>
              <div className="mt-4">
                <label
                  htmlFor="password"
                  className="block mb-3 text-sm font-medium text-theme-text-primary"
                >
                  {t("onboarding.userSetup.adminPassword")}
                </label>
                <input
                  name="password"
                  type="password"
                  className="border-none bg-theme-settings-input-bg text-theme-text-primary text-sm rounded-lg block w-full p-2.5 focus:outline-primary-button active:outline-primary-button placeholder:text-theme-text-secondary outline-none"
                  placeholder="Your admin password"
                  minLength={8}
                  required={true}
                  autoComplete="off"
                  onChange={handlePasswordChange}
                />
              </div>
              <p className=" text-theme-text-primary/80 text-xs font-base">
                {t("onboarding.userSetup.adminPasswordReq")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex w-full justify-between items-center px-6 py-4 space-x-6 border-t rounded-b border-theme-sidebar-border">
          <div className="text-theme-text-secondary/80 text-xs font-base">
            {t("onboarding.userSetup.teamHint")}
          </div>
        </div>
        <button
          type="submit"
          ref={submitRef}
          hidden
          aria-hidden="true"
        ></button>
      </form>
    </div>
  );
};
