import { userFromStorage, safeJsonParse } from "@/utils/request";
import { AUTH_PERMISSIONS, AUTH_ROLE_LABEL } from "@/utils/constants";

/**
 * Mirror of the server permission catalog (`server/utils/permissions/index.js`).
 * Keep the two in sync - the server is the enforcement point, this copy only decides
 * which controls are worth rendering.
 */
export const PERMISSIONS = {
  SUPER_ADMIN: "system.admin",
  SYSTEM_SETTINGS: "system.settings",
  SYSTEM_MODEL_ROUTING: "system.model_routing",
  SYSTEM_PROMPTS: "system.prompts",
  SYSTEM_APPEARANCE: "system.appearance",
  SYSTEM_EVENT_LOGS: "system.event_logs",
  SYSTEM_API_KEYS: "system.api_keys",
  SYSTEM_BROWSER_EXTENSION: "system.browser_extension",
  SYSTEM_MOBILE: "system.mobile",
  SYSTEM_COMMUNITY_HUB: "system.community_hub",
  SYSTEM_EXPERIMENTAL: "system.experimental",

  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  USERS_ASSIGN_ROLES: "users.assign_roles",
  INVITES_MANAGE: "invites.manage",
  ROLES_MANAGE: "roles.manage",

  WORKSPACES_VIEW_ALL: "workspaces.view_all",
  WORKSPACES_CREATE: "workspaces.create",
  WORKSPACES_MANAGE: "workspaces.manage",
  WORKSPACES_DELETE: "workspaces.delete",
  WORKSPACES_MANAGE_MEMBERS: "workspaces.manage_members",

  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_MANAGE: "documents.manage",
  DOCUMENTS_DATA_CONNECTORS: "documents.data_connectors",

  CHATS_SEND: "chats.send",
  CHATS_VIEW_ALL: "chats.view_all",
  CHATS_UNLIMITED: "chats.unlimited",

  AGENTS_MANAGE_SKILLS: "agents.manage_skills",
  AGENTS_FLOWS: "agents.flows",
  AGENTS_MCP_SERVERS: "agents.mcp_servers",

  EMBEDS_MANAGE: "embeds.manage",
  EMBEDS_VIEW_CHATS: "embeds.view_chats",
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
 * The permission keys held by the signed-in user. In single-user mode there is no user
 * record at all - that single operator implicitly holds everything.
 * @param {Object|null|undefined} user - the signed-in user; omit to read it from storage
 * @returns {string[]|null} null means "no user, everything allowed"
 */
function permissionsOf(user) {
  const currentUser = user === undefined ? userFromStorage() : user;
  if (!currentUser) return null;

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
 * @param {string|string[]} permissions
 * @param {Object|null} [user] - omit to read the cached session user
 * @returns {boolean}
 */
export function userCan(permissions, user) {
  const required = Array.isArray(permissions) ? permissions : [permissions];
  const held = permissionsOf(user);
  if (held === null) return true;
  if (held.includes(PERMISSIONS.SUPER_ADMIN)) return true;
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
  if (held === null) return true;
  if (held.includes(PERMISSIONS.SUPER_ADMIN)) return true;
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
        role.permissions?.includes(PERMISSIONS.SUPER_ADMIN) ||
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
  if (userCan(PERMISSIONS.SUPER_ADMIN, actor)) return true;
  const target = roles.find((role) => role.name === roleName);
  if (!target) return false;
  return userCan(target.permissions || [], actor);
}

/**
 * True when the user has no elevated permissions at all - the "chat only" case that
 * used to be expressed as `role === "default"`.
 * @param {Object|null} [user] - omit to read the cached session user
 * @returns {boolean}
 */
export function userIsChatOnly(user) {
  return !userCanAny(
    [
      PERMISSIONS.WORKSPACES_CREATE,
      PERMISSIONS.WORKSPACES_MANAGE,
      PERMISSIONS.WORKSPACES_DELETE,
      PERMISSIONS.WORKSPACES_MANAGE_MEMBERS,
      PERMISSIONS.WORKSPACES_VIEW_ALL,
      PERMISSIONS.DOCUMENTS_UPLOAD,
      PERMISSIONS.DOCUMENTS_MANAGE,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.INVITES_MANAGE,
      PERMISSIONS.ROLES_MANAGE,
      PERMISSIONS.SYSTEM_SETTINGS,
      PERMISSIONS.SYSTEM_APPEARANCE,
    ],
    user
  );
}
