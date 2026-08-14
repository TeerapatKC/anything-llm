import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { FullScreenLoader } from "../Preloader";
import validateSessionTokenForUser from "@/utils/session";
import paths from "@/utils/paths";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { userFromStorage } from "@/utils/request";
import System from "@/models/system";
import Role from "@/models/role";
import {
  userCanAny,
  workspaceCanAny,
  storePermissions,
  storeWorkspacePermissions,
  clearPermissions,
  storeRoleLabel,
  clearRoleLabel,
} from "@/utils/permissions";
import UserMenu from "../UserMenu";
import { KeyboardShortcutWrapper } from "@/utils/keyboardShortcuts";

/**
 * Refreshes the cached permission list before any gated UI renders. This runs on every
 * load so that changing what a role grants takes effect on the user's next page load,
 * and so sessions predating the permission system are not left denied everything.
 */
async function hydratePermissions() {
  if (!userFromStorage()) return; // single-user mode has no user record
  const { permissions, workspacePermissions, roleDisplayName } =
    await Role.myPermissions();
  storePermissions(permissions);
  storeWorkspacePermissions(workspacePermissions);
  storeRoleLabel(roleDisplayName);
}

// Used only for Multi-user mode only as we permission specific pages based on the
// permissions the user's role grants. When in single user mode we just bypass any authchecks.
function useIsAuthenticated() {
  const [isAuthd, setIsAuthed] = useState(null);
  const [shouldRedirectToOnboarding, setShouldRedirectToOnboarding] =
    useState(false);
  const [multiUserMode, setMultiUserMode] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const onboardingComplete = await System.isOnboardingComplete();
      const { MultiUserMode, RequiresAuth } = await System.keys();
      setMultiUserMode(MultiUserMode);

      // Check for the onboarding redirect condition
      if (onboardingComplete === false) {
        setShouldRedirectToOnboarding(true);
        setIsAuthed(true);
        return;
      }

      // Single User mode without password - no auth required
      if (!MultiUserMode && !RequiresAuth) {
        setIsAuthed(true);
        return;
      }

      // Single User password mode check
      if (!MultiUserMode && RequiresAuth) {
        const localAuthToken = localStorage.getItem(AUTH_TOKEN);
        if (!localAuthToken) {
          setIsAuthed(false);
          return;
        }

        const isValid = await validateSessionTokenForUser();
        setIsAuthed(isValid);
        return;
      }

      // Multi-user mode checks
      const localUser = localStorage.getItem(AUTH_USER);
      const localAuthToken = localStorage.getItem(AUTH_TOKEN);
      if (!localUser || !localAuthToken) {
        setIsAuthed(false);
        return;
      }

      const isValid = await validateSessionTokenForUser();
      if (!isValid) {
        localStorage.removeItem(AUTH_USER);
        localStorage.removeItem(AUTH_TOKEN);
        localStorage.removeItem(AUTH_TIMESTAMP);
        clearPermissions();
        clearRoleLabel();
        setIsAuthed(false);
        return;
      }

      await hydratePermissions();
      setIsAuthed(true);
    };
    validateSession();
  }, []);

  return { isAuthd, shouldRedirectToOnboarding, multiUserMode };
}

/**
 * Allows a route only to users whose role grants at least one of `permissions`. In
 * single user mode there is one operator who holds everything, so the check is skipped.
 * @param {{Component: React.ComponentType, permissions: string[], hideUserMenu?: boolean}} props
 */
export function PermissionRoute({
  Component,
  permissions = [],
  hideUserMenu = false,
}) {
  const { isAuthd, shouldRedirectToOnboarding, multiUserMode } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  const user = userFromStorage();
  const allowed = !multiUserMode || userCanAny(permissions, user);
  if (!isAuthd || !allowed) return <Navigate to={paths.home()} />;

  return hideUserMenu ? (
    <KeyboardShortcutWrapper>
      <Component />
    </KeyboardShortcutWrapper>
  ) : (
    <KeyboardShortcutWrapper>
      <UserMenu>
        <Component />
      </UserMenu>
    </KeyboardShortcutWrapper>
  );
}

/**
 * Allows a route only to users who hold one of `permissions` *inside the workspace the
 * URL names*. Used for `/workspace/:slug/settings/...`, where the answer depends on
 * which workspace is being opened rather than on any instance-wide role.
 * @param {{Component: React.ComponentType, permissions: string[]}} props
 */
export function WorkspacePermissionRoute({ Component, permissions = [] }) {
  const { isAuthd, shouldRedirectToOnboarding, multiUserMode } =
    useIsAuthenticated();
  const { slug } = useParams();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  const user = userFromStorage();
  const allowed = !multiUserMode || workspaceCanAny(permissions, slug, user);
  if (!isAuthd || !allowed) return <Navigate to={paths.home()} />;

  return (
    <KeyboardShortcutWrapper>
      <UserMenu>
        <Component />
      </UserMenu>
    </KeyboardShortcutWrapper>
  );
}

// Allows access only in single user mode — redirects to home in multi-user mode
export function SingleUserRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding, multiUserMode } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  return isAuthd && !multiUserMode ? (
    <KeyboardShortcutWrapper>
      <Component />
    </KeyboardShortcutWrapper>
  ) : (
    <Navigate to={paths.home()} />
  );
}

export default function PrivateRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding } = useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" />;
  }

  return isAuthd ? (
    <KeyboardShortcutWrapper>
      <UserMenu>
        <Component />
      </UserMenu>
    </KeyboardShortcutWrapper>
  ) : (
    <Navigate to={paths.login(true)} />
  );
}
