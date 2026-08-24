import React from "react";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import { Navigate } from "react-router-dom";
import paths from "@/utils/paths";
import useQuery from "@/hooks/useQuery";
import useSimpleSSO from "@/hooks/useSimpleSSO";
import { useRedirectToOnboardingIfIncomplete } from "@/hooks/useOnboardingComplete";

/**
 * Login page.
 *
 * If Simple SSO is enabled and no login is allowed, the user will be redirected to the SSO login page
 * which may not have a token so the login will fail.
 *
 * @returns {JSX.Element}
 */
export default function Login() {
  const query = useQuery();
  // This page is public, so nothing else checks whether the instance has been set up.
  // Without this, a fresh deploy shows a password form for an instance that has no
  // account to sign in to.
  const onboardingChecked = useRedirectToOnboardingIfIncomplete();
  const { loading: ssoLoading, ssoConfig } = useSimpleSSO();
  const { loading, requiresAuth } = usePasswordModal(!!query.get("nt"));

  if (loading || ssoLoading || !onboardingChecked) return <FullScreenLoader />;

  // If simple SSO is enabled and no login is allowed, redirect to the SSO login page.
  if (ssoConfig.enabled && ssoConfig.noLogin) {
    // If a noLoginRedirect is provided and no token is provided, redirect to that webpage.
    if (!!ssoConfig.noLoginRedirect && !query.has("token"))
      return window.location.replace(ssoConfig.noLoginRedirect);
    // Otherwise, redirect to the SSO login page.
    else return <Navigate to={paths.sso.login()} />;
  }

  if (requiresAuth === false) return <Navigate to={paths.home()} />;

  return <PasswordModal />;
}
