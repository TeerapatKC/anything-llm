import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { FullScreenLoader } from "../Preloader";
import { sessionStateForUser } from "@/utils/session";
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
  isSuperAdmin,
} from "@/utils/permissions";
import UserMenu from "../UserMenu";
import { KeyboardShortcutWrapper } from "@/utils/keyboardShortcuts";

/**
 * Refreshes the cached permission list before any gated UI renders. This runs on every
 * load so that changing what a role grants takes effect on the user's next page load,
 * and so sessions predating the permission system are not left denied everything.
 */
async function hydratePermissions() {
  if (!userFromStorage()) return;
  const { permissions, workspacePermissions, roleDisplayName } =
    await Role.myPermissions();
  storePermissions(permissions);
  storeWorkspacePermissions(workspacePermissions);
  storeRoleLabel(roleDisplayName);
}

// Every page is permissioned off the signed-in user's role - there is no unauthenticated
// mode, so a request without a valid session always lands on /login.
function useIsAuthenticated() {
  const [isAuthd, setIsAuthed] = useState(null);
  const [shouldRedirectToOnboarding, setShouldRedirectToOnboarding] =
    useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const onboardingComplete = await System.isOnboardingComplete();

      // Check for the onboarding redirect condition
      if (onboardingComplete === false) {
        setShouldRedirectToOnboarding(true);
        setIsAuthed(true);
        return;
      }

      const localUser = localStorage.getItem(AUTH_USER);
      const localAuthToken = localStorage.getItem(AUTH_TOKEN);
      if (!localUser || !localAuthToken) {
        setIsAuthed(false);
        return;
      }

      const session = await sessionStateForUser();
      if (!session.valid) {
        localStorage.removeItem(AUTH_USER);
        localStorage.removeItem(AUTH_TOKEN);
        localStorage.removeItem(AUTH_TIMESTAMP);
        clearPermissions();
        clearRoleLabel();
        setIsAuthed(false);
        return;
      }

      // An account still holding an admin-generated password is refused by every other
      // endpoint (including the permissions call below), so stop here and let the caller
      // render the change-password screen.
      if (session.requiresPasswordChange) {
        setRequiresPasswordChange(true);
        setIsAuthed(true);
        return;
      }

      await hydratePermissions();
      setIsAuthed(true);
    };
    validateSession();
  }, []);

  return {
    isAuthd,
    shouldRedirectToOnboarding,
    requiresPasswordChange,
  };
}

/**
 * Allows a route only to users whose role grants at least one of `permissions`.
 * @param {{Component: React.ComponentType, permissions: string[], hideUserMenu?: boolean}} props
 */
export function PermissionRoute({
  Component,
  permissions = [],
  hideUserMenu = false,
}) {
  const { isAuthd, shouldRedirectToOnboarding, requiresPasswordChange } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  if (requiresPasswordChange) return <Navigate to={paths.changePassword()} />;

  const user = userFromStorage();
  const allowed = userCanAny(permissions, user);
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
 * Allows a route only to the instance owner.
 *
 * Deliberately a role check rather than a permission check, mirroring the server: the
 * screens behind it (ownership transfer, instance reset) must never become reachable by
 * ticking a box on a custom role.
 * @param {{Component: React.ComponentType, hideUserMenu?: boolean}} props
 */
export function SuperAdminRoute({ Component, hideUserMenu = false }) {
  const { isAuthd, shouldRedirectToOnboarding, requiresPasswordChange } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  if (requiresPasswordChange) return <Navigate to={paths.changePassword()} />;

  if (!isAuthd || !isSuperAdmin(userFromStorage()))
    return <Navigate to={paths.home()} />;

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
  const { isAuthd, shouldRedirectToOnboarding, requiresPasswordChange } =
    useIsAuthenticated();
  const { slug } = useParams();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  if (requiresPasswordChange) return <Navigate to={paths.changePassword()} />;

  const user = userFromStorage();
  const allowed = workspaceCanAny(permissions, slug, user);
  if (!isAuthd || !allowed) return <Navigate to={paths.home()} />;

  return (
    <KeyboardShortcutWrapper>
      <UserMenu>
        <Component />
      </UserMenu>
    </KeyboardShortcutWrapper>
  );
}

export default function PrivateRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding, requiresPasswordChange } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" />;
  }

  if (requiresPasswordChange) return <Navigate to={paths.changePassword()} />;

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
