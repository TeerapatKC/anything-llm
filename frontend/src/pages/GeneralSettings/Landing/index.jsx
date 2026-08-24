import { Navigate } from "react-router-dom";
import paths from "@/utils/paths";
import { PERMISSIONS, userCanAny } from "@/utils/permissions";

/**
 * Where `/settings` actually lands you.
 *
 * The Settings menu used to point straight at the branding screen, which quietly made
 * `system.appearance` the key to the whole settings area: reserve that one permission and
 * an administrator who still had Users, Roles, Workspaces and Invites was bounced to the
 * home page with no way in at all.
 *
 * So the door is no longer a fixed page. The first screen the user can actually open
 * wins, and only someone who can open none of them is sent home.
 *
 * Order mirrors the sidebar, except that branding is tried first so the common case still
 * lands exactly where it always did.
 */
const DESTINATIONS = [
  {
    path: () => paths.settings.branding(),
    needs: [PERMISSIONS.SYSTEM_APPEARANCE],
  },
  { path: () => paths.settings.users(), needs: [PERMISSIONS.USERS_VIEW] },
  { path: () => paths.settings.roles(), needs: [PERMISSIONS.ROLES_MANAGE] },
  {
    path: () => paths.settings.workspaces(),
    needs: [PERMISSIONS.WORKSPACES_VIEW_ALL],
  },
  { path: () => paths.settings.invites(), needs: [PERMISSIONS.INVITES_MANAGE] },
  { path: () => paths.settings.chats(), needs: [PERMISSIONS.CHATS_VIEW_ALL] },
  {
    path: () => paths.settings.llmPreference(),
    needs: [PERMISSIONS.SYSTEM_SETTINGS_LLM],
  },
  {
    path: () => paths.settings.vectorDatabase(),
    needs: [PERMISSIONS.SYSTEM_SETTINGS_VECTOR_DB],
  },
  {
    path: () => paths.settings.embedder.modelPreference(),
    needs: [PERMISSIONS.SYSTEM_SETTINGS_EMBEDDER],
  },
  {
    path: () => paths.settings.defaultSystemPrompt(),
    needs: [PERMISSIONS.SYSTEM_PROMPTS],
  },
  {
    path: () => paths.settings.agentSkills(),
    needs: [PERMISSIONS.AGENTS_MANAGE_SKILLS],
  },
  {
    path: () => paths.settings.apiKeys(),
    needs: [PERMISSIONS.SYSTEM_API_KEYS],
  },
  {
    path: () => paths.settings.logs(),
    needs: [PERMISSIONS.SYSTEM_EVENT_LOGS_VIEW],
  },
  {
    path: () => paths.settings.embedChatWidgets(),
    needs: [PERMISSIONS.EMBEDS_MANAGE],
  },
  {
    path: () => paths.communityHub.trending(),
    needs: [PERMISSIONS.SYSTEM_COMMUNITY_HUB],
  },
];

/**
 * The first settings screen this user may open, or null if there is none.
 * @returns {string|null}
 */
export function firstReachableSettingsPath() {
  const destination = DESTINATIONS.find((entry) => userCanAny(entry.needs));
  return destination ? destination.path() : null;
}

export default function SettingsLanding() {
  const destination = firstReachableSettingsPath();
  // Nothing under Settings is theirs to open, so there is nowhere to land.
  if (!destination) return <Navigate to={paths.home()} replace />;
  return <Navigate to={destination} replace />;
}
