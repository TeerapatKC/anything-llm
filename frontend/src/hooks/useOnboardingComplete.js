import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import System from "@/models/system";
import paths from "@/utils/paths";

/**
 * Keeps the onboarding screens out of reach once the instance has an owner.
 *
 * Only a definite `true` redirects - `System.isOnboardingComplete` answers null when it
 * could not reach the server, and an unreachable server is no reason to move anyone.
 */
export default function useRedirectToHomeOnOnboardingComplete() {
  const navigate = useNavigate();
  useEffect(() => {
    async function checkOnboardingComplete() {
      const onboardingComplete = await System.isOnboardingComplete();
      if (onboardingComplete !== true) return;
      navigate(paths.home());
    }
    checkOnboardingComplete();
  }, []);
}

/**
 * The other direction: sends the visitor to onboarding while the instance still has no
 * owner. `PrivateRoute` already does this for every page behind a session, but the login
 * page is public, so a browser sitting on /login - a bookmark, or a tab left open across a
 * `docker compose down -v` - would otherwise keep offering a password form for an instance
 * that has no account to sign in to, and no way to reach the setup screen.
 *
 * Again only a definite `false` redirects, so a backend that is briefly unreachable leaves
 * the caller where it is rather than throwing it into setup.
 *
 * @returns {boolean} whether the check has settled; false while the caller should wait
 */
export function useRedirectToOnboardingIfIncomplete() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    async function checkOnboardingIncomplete() {
      const onboardingComplete = await System.isOnboardingComplete();
      if (onboardingComplete === false) {
        navigate(paths.onboarding.home());
        return;
      }
      setChecked(true);
    }
    checkOnboardingIncomplete();
  }, []);
  return checked;
}
