import { userFromStorage, safeJsonParse } from "@/utils/request";
import {
  AUTH_PERMISSIONS,
  AUTH_ROLE_LABEL,
  AUTH_WORKSPACE_PERMISSIONS,
} from "@/utils/constants";

/**
 * Mirror of the server permission catalog (`server/utils/permissions/index.js`).
 * Keep the two in sync - the server is the enforcement point, this copy only decides
 * which controls are worth rendering.
 */
export const PERMISSIONS = {
  SYSTEM_ADMIN: "system.admin",

  SYSTEM_SETTINGS: "system.settings",
  SYSTEM_SETTINGS_LLM: "system.settings.llm",
  SYSTEM_SETTINGS_EMBEDDER: "system.settings.embedder",
  SYSTEM_SETTINGS_VECTOR_DB: "system.settings.vector_db",
  SYSTEM_SETTINGS_TRANSCRIPTION: "system.settings.transcription",
  SYSTEM_SETTINGS_TEXT_SPLITTING: "system.settings.text_splitting",
  SYSTEM_SETTINGS_IMAGE_GENERATION: "system.settings.image_generation",
  SYSTEM_SETTINGS_SECURITY: "system.settings.security",
  SYSTEM_SETTINGS_PRIVACY: "system.settings.privacy",

  SYSTEM_MODEL_ROUTING: "system.model_routing",
  SYSTEM_PROMPTS: "system.prompts",

  SYSTEM_APPEARANCE: "system.appearance",
  SYSTEM_APPEARANCE_BRANDING: "system.appearance.branding",
  SYSTEM_APPEARANCE_FOOTER: "system.appearance.footer",

  SYSTEM_EVENT_LOGS: "system.event_logs",
  SYSTEM_EVENT_LOGS_VIEW: "system.event_logs.view",
  SYSTEM_EVENT_LOGS_CLEAR: "system.event_logs.clear",

  SYSTEM_API_KEYS: "system.api_keys",
  SYSTEM_BROWSER_EXTENSION: "system.browser_extension",
  SYSTEM_MOBILE: "system.mobile",

  SYSTEM_COMMUNITY_HUB: "system.community_hub",
  SYSTEM_COMMUNITY_HUB_BROWSE: "system.community_hub.browse",
  SYSTEM_COMMUNITY_HUB_IMPORT: "system.community_hub.import",
  SYSTEM_COMMUNITY_HUB_PUBLISH: "system.community_hub.publish",

  SYSTEM_EXPERIMENTAL: "system.experimental",

  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_SUSPEND: "users.suspend",
  USERS_DELETE: "users.delete",
  USERS_RESET_PASSWORD: "users.reset_password",
  USERS_ASSIGN_ROLES: "users.assign_roles",

  INVITES_MANAGE: "invites.manage",
  INVITES_CREATE: "invites.create",
  INVITES_DELETE: "invites.delete",

  ROLES_MANAGE: "roles.manage",
  ROLES_CREATE: "roles.create",
  ROLES_EDIT: "roles.edit",
  ROLES_DELETE: "roles.delete",

  WORKSPACE_ROLES_MANAGE: "workspace_roles.manage",
  WORKSPACE_ROLES_CREATE: "workspace_roles.create",
  WORKSPACE_ROLES_EDIT: "workspace_roles.edit",
  WORKSPACE_ROLES_DELETE: "workspace_roles.delete",

  WORKSPACES_CREATE: "workspaces.create",
  WORKSPACES_VIEW_ALL: "workspaces.view_all",
  WORKSPACES_MANAGE_ALL: "workspaces.manage_all",
  WORKSPACES_DELETE_ANY: "workspaces.delete_any",

  DOCUMENTS_MANAGE: "documents.manage",
  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_ORGANIZE: "documents.organize",
  DOCUMENTS_DELETE: "documents.delete",

  CHATS_VIEW_ALL: "chats.view_all",
  CHATS_EXPORT: "chats.export",
  CHATS_DELETE_ANY: "chats.delete_any",
  CHATS_UNLIMITED: "chats.unlimited",

  AGENTS_MANAGE_SKILLS: "agents.manage_skills",
  AGENTS_FLOWS: "agents.flows",
  AGENTS_FLOWS_VIEW: "agents.flows.view",
  AGENTS_FLOWS_EDIT: "agents.flows.edit",
  AGENTS_FLOWS_DELETE: "agents.flows.delete",
  AGENTS_MCP_SERVERS: "agents.mcp_servers",
  AGENTS_SCHEDULED_JOBS: "agents.scheduled_jobs",

  EMBEDS_MANAGE: "embeds.manage",
  EMBEDS_VIEW_CHATS: "embeds.view_chats",

  INTEGRATIONS_TELEGRAM: "integrations.telegram",
  INTEGRATIONS_GOOGLE: "integrations.google",
  INTEGRATIONS_OUTLOOK: "integrations.outlook",
};

/**
 * The instance-owner role. The one role the UI recognises by name, mirroring the server:
 * it is never offered in a role picker, and the account holding it cannot be edited,
 * suspended or deleted from the user administration screens.
 */
export const SUPER_ADMIN_ROLE = "super-admin";

/**
 * Mirror of the workspace-scope catalog. These are held per workspace, never globally -
 * always resolve them with `workspaceCan(permission, workspaceId)`.
 */
export const WORKSPACE_PERMISSIONS = {
  VIEW: "workspace.view",

  CHAT: "workspace.chat",
  CHAT_AGENTS: "workspace.chat.agents",
  CHAT_ATTACH_FILES: "workspace.chat.attach_files",
  CHAT_SLASH_COMMANDS: "workspace.chat.slash_commands",

  THREADS_MANAGE: "workspace.threads.manage",
  THREADS_CREATE: "workspace.threads.create",
  THREADS_RENAME: "workspace.threads.rename",
  THREADS_DELETE: "workspace.threads.delete",

  CHATS_VIEW_ALL: "workspace.chats.view_all",
  CHATS_DELETE: "workspace.chats.delete",
  CHATS_EXPORT: "workspace.chats.export",

  DOCUMENTS_VIEW: "workspace.documents.view",
  DOCUMENTS_UPLOAD: "workspace.documents.upload",
  DOCUMENTS_MANAGE: "workspace.documents.manage",
  DOCUMENTS_REMOVE: "workspace.documents.remove",
  DOCUMENTS_PIN: "workspace.documents.pin",
  DOCUMENTS_WATCH: "workspace.documents.watch",
  DATA_CONNECTORS: "workspace.data_connectors",

  SETTINGS_MANAGE: "workspace.settings.manage",
  SETTINGS_GENERAL: "workspace.settings.general",
  SETTINGS_LLM: "workspace.settings.llm",
  SETTINGS_PROMPT: "workspace.settings.prompt",
  SETTINGS_VECTOR: "workspace.settings.vector",
  SETTINGS_APPEARANCE: "workspace.settings.appearance",

  AGENTS_MANAGE: "workspace.agents.manage",

  MEMBERS_MANAGE: "workspace.members.manage",
  MEMBERS_ADD: "workspace.members.add",
  MEMBERS_REMOVE: "workspace.members.remove",
  MEMBERS_SET_ROLE: "workspace.members.set_role",

  ROLES_MANAGE: "workspace.roles.manage",
  DELETE: "workspace.delete",
};

/**
 * Caches the permissions the signed-in user holds. Kept in its own storage key rather
 * than on the user object, because several flows rewrite that object wholesale and
 * dropping the field would silently deny the user everything.
 * @param {string[]} permissions
 */
export function storePermissions(permissions = []) {
  if (!Array.isArray(permissions)) return;
  window.localStorage.setItem(AUTH_PERMISSIONS, JSON.stringify(permissions));
}

/** Drops the cached permissions - call whenever the session ends. */
export function clearPermissions() {
  window.localStorage.removeItem(AUTH_PERMISSIONS);
  window.localStorage.removeItem(AUTH_WORKSPACE_PERMISSIONS);
}

/**
 * Caches what the signed-in user may do inside each workspace, keyed by workspace id.
 * @param {Record<string, string[]>} byWorkspaceId
 */
export function storeWorkspacePermissions(byWorkspaceId = {}) {
  if (!byWorkspaceId || typeof byWorkspaceId !== "object") return;
  window.localStorage.setItem(
    AUTH_WORKSPACE_PERMISSIONS,
    JSON.stringify(byWorkspaceId)
  );
}

/**
 * Whether the user holds a workspace permission *in one specific workspace*. Instance
 * operators pass everywhere, mirroring the server.
 * @param {string|string[]} permissions - all of these must be held
 * @param {number|string|null} workspaceId
 * @param {Object|null} [user] - omit to read the cached session user
 * @returns {boolean}
 */
export function workspaceCan(permissions, workspaceId, user) {
  const required = Array.isArray(permissions) ? permissions : [permissions];
  const currentUser = user === undefined ? userFromStorage() : user;

  if (!currentUser) return false;
  if (userCanAny([PERMISSIONS.WORKSPACES_MANAGE_ALL], currentUser)) return true;
  if (!workspaceId) return false;

  const byWorkspace = safeJsonParse(
    window.localStorage.getItem(AUTH_WORKSPACE_PERMISSIONS),
    null
  );
  const held = byWorkspace?.[String(workspaceId)];
  if (!Array.isArray(held)) return false;
  return required.every((permission) => held.includes(permission));
}

/**
 * Whether the user holds at least one of the workspace permissions in a workspace.
 * @param {string[]} permissions
 * @param {number|string|null} workspaceId
 * @param {Object|null} [user] - omit to read the cached session user
 * @returns {boolean}
 */
export function workspaceCanAny(permissions = [], workspaceId, user) {
  return permissions.some((permission) =>
    workspaceCan(permission, workspaceId, user)
  );
}

/**
 * Caches the display name of the role the signed-in user currently holds (e.g.
 * "Content Editor"), so the UI never has to show the raw role identifier.
 * @param {string|null} label
 */
export function storeRoleLabel(label) {
  if (!label) return window.localStorage.removeItem(AUTH_ROLE_LABEL);
  window.localStorage.setItem(AUTH_ROLE_LABEL, label);
}

/** Drops the cached role label - call whenever the session ends. */
export function clearRoleLabel() {
  window.localStorage.removeItem(AUTH_ROLE_LABEL);
}

/**
 * The display name of the role a user holds, for showing in the UI. Falls back to the
 * raw role identifier (e.g. "content-editor") if the label has not been cached yet, so
 * something reasonable still renders before the first permission fetch resolves.
 * @param {Object|null} [user] - omit to read the cached session user
 * @returns {string|null}
 */
export function roleLabel(user) {
  const currentUser = user === undefined ? userFromStorage() : user;
  if (!currentUser?.role) return null;
  return window.localStorage.getItem(AUTH_ROLE_LABEL) || currentUser.role;
}

/**
 * The permission keys held by the signed-in user. Every session is bound to a user, so
 * no user means nothing is held.
 * @param {Object|null|undefined} user - the signed-in user; omit to read it from storage
 * @returns {string[]}
 */
function permissionsOf(user) {
  const currentUser = user === undefined ? userFromStorage() : user;
  if (!currentUser) return [];

  const cached = safeJsonParse(
    window.localStorage.getItem(AUTH_PERMISSIONS),
    null
  );
  if (Array.isArray(cached)) return cached;

  // Falls back to whatever the session payload carried, so the very first paint after
  // logging in is correct even before the cache has been primed.
  return Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
}

/**
 * Whether the user holds every one of the given permissions.
 *
 * There is deliberately no shortcut for `system.admin` here. The server expands that
 * wildcard into the concrete list before it caches it, so a holder's cached permissions
 * already name everything they actually have - and, crucially, exclude anything the owner
 * has reserved. Short-circuiting on the wildcard would hand every screen back to an
 * administrator that the server then refuses to serve.
 *
 * @param {string|string[]} permissions
 * @param {Object|null} [user] - omit to read the cached session user
 * @returns {boolean}
 */
export function userCan(permissions, user) {
  const required = Array.isArray(permissions) ? permissions : [permissions];
  const held = permissionsOf(user);
  return required.every((permission) => held.includes(permission));
}

/**
 * Whether the user holds at least one of the given permissions. Use this for surfaces
 * that several permissions can unlock, like a settings section with mixed contents.
 * @param {string[]} permissions
 * @param {Object|null} [user] - omit to read the cached session user
 * @returns {boolean}
 */
export function userCanAny(permissions = [], user) {
  const held = permissionsOf(user);
  return permissions.some((permission) => held.includes(permission));
}

/**
 * The role names in `roles` whose permission set includes `permission`.
 * @param {Array<{name: string, permissions: string[]}>} roles
 * @param {string} permission
 * @returns {string[]}
 */
export function roleNamesWith(roles = [], permission) {
  return roles
    .filter(
      (role) =>
        role.permissions?.includes(PERMISSIONS.SYSTEM_ADMIN) ||
        role.permissions?.includes(permission)
    )
    .map((role) => role.name);
}

/**
 * Whether the acting user may hand out or act on a role - the client-side mirror of the
 * server's privilege-escalation guard. You may only touch a role whose permissions are
 * a subset of your own.
 * @param {Object|null} actor
 * @param {string} roleName
 * @param {Array<{name: string, permissions: string[]}>} roles
 * @returns {boolean}
 */
export function canManageRole(actor, roleName, roles = []) {
  // The owner role is not manageable by anyone, including its own holder - it moves
  // only through an ownership transfer, and its permission set is frozen.
  if (isSuperAdminRole(roleName)) return false;
  if (userCan(PERMISSIONS.SYSTEM_ADMIN, actor)) return true;
  const target = roles.find((role) => role.name === roleName);
  if (!target) return false;
  return userCan(target.permissions || [], actor);
}

/**
 * Whether a role name is the instance-owner role.
 * @param {string|null} roleName
 * @returns {boolean}
 */
export function isSuperAdminRole(roleName) {
  return String(roleName ?? "") === SUPER_ADMIN_ROLE;
}

/**
 * Whether an account owns this instance. Mirrors the server, which is the enforcement
 * point - this only decides which controls are worth rendering.
 * @param {Object|null} [user] - omit to read the cached session user
 * @returns {boolean}
 */
export function isSuperAdmin(user) {
  const currentUser = user === undefined ? userFromStorage() : user;
  return isSuperAdminRole(currentUser?.role);
}

/**
 * The roles that may actually be picked in a user's role dropdown. Excludes the owner
 * role and any role the actor could not hand out.
 * @param {Array<{name: string, isAssignable?: boolean}>} roles
 * @param {Object|null} [actor]
 * @returns {Array}
 */
export function assignableRoles(roles = [], actor) {
  return roles.filter(
    (role) =>
      role.isAssignable !== false &&
      !isSuperAdminRole(role.name) &&
      canManageRole(actor, role.name, roles)
  );
}

/**
 * True when the user holds no instance-wide powers at all, so nothing under Settings is
 * worth showing them. What they can do inside individual workspaces is a separate
 * question answered by `workspaceCan`.
 * @param {Object|null} [user] - omit to read the cached session user
 * @returns {boolean}
 */
export function userIsChatOnly(user) {
  return !userCanAny(
    [
      PERMISSIONS.WORKSPACES_CREATE,
      PERMISSIONS.WORKSPACES_VIEW_ALL,
      PERMISSIONS.WORKSPACES_MANAGE_ALL,
      PERMISSIONS.DOCUMENTS_MANAGE,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.INVITES_MANAGE,
      PERMISSIONS.ROLES_MANAGE,
      PERMISSIONS.WORKSPACE_ROLES_MANAGE,
      PERMISSIONS.CHATS_VIEW_ALL,
      PERMISSIONS.SYSTEM_SETTINGS,
      PERMISSIONS.SYSTEM_APPEARANCE,
    ],
    user
  );
}
