/**
 * The full permission catalog for the custom RBAC system, plus the seed data
 * for the built-in (isSystem) roles. Keys mirror the frontend's own copy
 * (frontend/src/utils/permissions.js's PERMISSIONS/WORKSPACE_PERMISSIONS) -
 * keep the two in sync since the client uses its copy only to decide what to
 * render, while these are the actual enforcement point (Role/WorkspaceRole
 * models + the userPermissionValid/workspacePermissionValid middleware).
 */

// Sentinel meaning "any authenticated user" - never persisted as a real
// permission row, just recognized by the middleware as an instant pass.
const ANY_PERMISSION = "<any>";

const PERMISSIONS = {
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
  WORKSPACE_ROLES_MANAGE: "workspace_roles.manage",

  WORKSPACES_CREATE: "workspaces.create",
  WORKSPACES_VIEW_ALL: "workspaces.view_all",
  WORKSPACES_MANAGE_ALL: "workspaces.manage_all",

  DOCUMENTS_MANAGE: "documents.manage",

  CHATS_VIEW_ALL: "chats.view_all",
  CHATS_UNLIMITED: "chats.unlimited",

  AGENTS_MANAGE_SKILLS: "agents.manage_skills",
  AGENTS_FLOWS: "agents.flows",
  AGENTS_MCP_SERVERS: "agents.mcp_servers",

  EMBEDS_MANAGE: "embeds.manage",
  EMBEDS_VIEW_CHATS: "embeds.view_chats",
};

const WORKSPACE_PERMISSIONS = {
  VIEW: "workspace.view",
  CHAT: "workspace.chat",
  THREADS_MANAGE: "workspace.threads.manage",
  CHATS_VIEW_ALL: "workspace.chats.view_all",
  CHATS_DELETE: "workspace.chats.delete",
  DOCUMENTS_VIEW: "workspace.documents.view",
  DOCUMENTS_UPLOAD: "workspace.documents.upload",
  DOCUMENTS_MANAGE: "workspace.documents.manage",
  DATA_CONNECTORS: "workspace.data_connectors",
  SETTINGS_MANAGE: "workspace.settings.manage",
  AGENTS_MANAGE: "workspace.agents.manage",
  MEMBERS_MANAGE: "workspace.members.manage",
  ROLES_MANAGE: "workspace.roles.manage",
  DELETE: "workspace.delete",
};

// scope: "system" | "workspace". order = array index, used as sortOrder.
const PERMISSION_CATALOG = [
  // system
  { key: PERMISSIONS.SUPER_ADMIN, label: "Super administrator", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_SETTINGS, label: "Manage system settings", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_MODEL_ROUTING, label: "Manage model routing", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_PROMPTS, label: "Manage system prompts", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_APPEARANCE, label: "Manage appearance", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_EVENT_LOGS, label: "View event logs", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_API_KEYS, label: "Manage developer API keys", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_BROWSER_EXTENSION, label: "Manage browser extension keys", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_MOBILE, label: "Manage mobile devices", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_COMMUNITY_HUB, label: "Manage community hub", category: "system", scope: "system" },
  { key: PERMISSIONS.SYSTEM_EXPERIMENTAL, label: "Manage experimental features", category: "system", scope: "system" },
  // people
  { key: PERMISSIONS.USERS_VIEW, label: "View users", category: "people", scope: "system" },
  { key: PERMISSIONS.USERS_MANAGE, label: "Manage users", category: "people", scope: "system" },
  { key: PERMISSIONS.USERS_ASSIGN_ROLES, label: "Assign system roles to users", category: "people", scope: "system" },
  { key: PERMISSIONS.INVITES_MANAGE, label: "Manage invitations", category: "people", scope: "system" },
  { key: PERMISSIONS.ROLES_MANAGE, label: "Manage system roles", category: "people", scope: "system" },
  { key: PERMISSIONS.WORKSPACE_ROLES_MANAGE, label: "Manage workspace roles", category: "people", scope: "system" },
  // workspaces
  { key: PERMISSIONS.WORKSPACES_CREATE, label: "Create workspaces", category: "workspaces", scope: "system" },
  { key: PERMISSIONS.WORKSPACES_VIEW_ALL, label: "View all workspaces", category: "workspaces", scope: "system" },
  { key: PERMISSIONS.WORKSPACES_MANAGE_ALL, label: "Full control of every workspace", category: "workspaces", scope: "system" },
  // library
  { key: PERMISSIONS.DOCUMENTS_MANAGE, label: "Manage the document library", category: "library", scope: "system" },
  // chats
  { key: PERMISSIONS.CHATS_VIEW_ALL, label: "View all workspace chats", category: "chats", scope: "system" },
  { key: PERMISSIONS.CHATS_UNLIMITED, label: "Bypass daily message limit", category: "chats", scope: "system" },
  // agents
  { key: PERMISSIONS.AGENTS_MANAGE_SKILLS, label: "Manage agent skills", category: "agents", scope: "system" },
  { key: PERMISSIONS.AGENTS_FLOWS, label: "Manage agent flows", category: "agents", scope: "system" },
  { key: PERMISSIONS.AGENTS_MCP_SERVERS, label: "Manage MCP servers", category: "agents", scope: "system" },
  // embeds
  { key: PERMISSIONS.EMBEDS_MANAGE, label: "Manage embeds", category: "embeds", scope: "system" },
  { key: PERMISSIONS.EMBEDS_VIEW_CHATS, label: "View embed chats", category: "embeds", scope: "system" },

  // workspace_access
  { key: WORKSPACE_PERMISSIONS.VIEW, label: "View workspace", category: "workspace_access", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.CHAT, label: "Send chats", category: "workspace_access", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.THREADS_MANAGE, label: "Manage own threads", category: "workspace_access", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.CHATS_VIEW_ALL, label: "View other members' chats", category: "workspace_access", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.CHATS_DELETE, label: "Delete chat history", category: "workspace_access", scope: "workspace" },
  // workspace_content
  { key: WORKSPACE_PERMISSIONS.DOCUMENTS_VIEW, label: "View documents", category: "workspace_content", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.DOCUMENTS_UPLOAD, label: "Upload documents", category: "workspace_content", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.DOCUMENTS_MANAGE, label: "Manage documents", category: "workspace_content", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.DATA_CONNECTORS, label: "Use data connectors", category: "workspace_content", scope: "workspace" },
  // workspace_admin
  { key: WORKSPACE_PERMISSIONS.SETTINGS_MANAGE, label: "Manage workspace settings", category: "workspace_admin", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.AGENTS_MANAGE, label: "Manage workspace agents", category: "workspace_admin", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.MEMBERS_MANAGE, label: "Manage workspace members", category: "workspace_admin", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.ROLES_MANAGE, label: "Manage workspace roles", category: "workspace_admin", scope: "workspace" },
  { key: WORKSPACE_PERMISSIONS.DELETE, label: "Delete workspace", category: "workspace_admin", scope: "workspace" },
].map((p, i) => ({ ...p, order: i }));

const PERMISSION_CATEGORIES = {
  system: { label: "System", scope: "system", order: 0 },
  people: { label: "People", scope: "system", order: 1 },
  workspaces: { label: "Workspaces", scope: "system", order: 2 },
  library: { label: "Library", scope: "system", order: 3 },
  chats: { label: "Chats", scope: "system", order: 4 },
  agents: { label: "Agents", scope: "system", order: 5 },
  embeds: { label: "Embeds", scope: "system", order: 6 },
  workspace_access: { label: "Access", scope: "workspace", order: 10 },
  workspace_content: { label: "Content", scope: "workspace", order: 11 },
  workspace_admin: { label: "Administration", scope: "workspace", order: 12 },
};

const SYSTEM_PERMISSION_KEYS = PERMISSION_CATALOG.filter((p) => p.scope === "system").map((p) => p.key);
const WORKSPACE_PERMISSION_KEYS = PERMISSION_CATALOG.filter((p) => p.scope === "workspace").map((p) => p.key);
const ALL_PERMISSION_KEYS = [...SYSTEM_PERMISSION_KEYS, ...WORKSPACE_PERMISSION_KEYS];

const FALLBACK_ROLE = "default";
const SUPER_ADMIN_ROLE = "admin";
const FALLBACK_WORKSPACE_ROLE = "member";

// Seed rows for the instance-wide `roles` table. Named to match this app's
// pre-existing fixed 3-tier model (admin/manager/default) 1:1, so every
// existing route guard that compares users.role against those literal
// strings keeps working unchanged - a custom role is just an additional,
// separately-named row an operator can create on top of these.
const SYSTEM_ROLES = [
  {
    name: "admin",
    displayName: "Admin",
    permissions: SYSTEM_PERMISSION_KEYS,
    // Re-applied on every boot even if hand-edited in the DB, so the
    // instance can never end up with zero usable admins.
    protectedPermissions: SYSTEM_PERMISSION_KEYS,
  },
  {
    name: "manager",
    displayName: "Manager",
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.USERS_ASSIGN_ROLES,
      PERMISSIONS.INVITES_MANAGE,
      PERMISSIONS.WORKSPACES_CREATE,
      PERMISSIONS.WORKSPACES_VIEW_ALL,
      PERMISSIONS.WORKSPACES_MANAGE_ALL,
      PERMISSIONS.DOCUMENTS_MANAGE,
      PERMISSIONS.CHATS_VIEW_ALL,
      PERMISSIONS.SYSTEM_API_KEYS,
    ],
    protectedPermissions: [],
  },
  {
    name: "default",
    displayName: "Member",
    permissions: [],
    protectedPermissions: [],
  },
  {
    // V.1.5 Hosted Customer Trial. Isolation itself is enforced at the query
    // layer (customer_id filtering, see models/workspace.js and
    // endpoints/admin.js) - this permission set exists so the role is valid
    // and recognized end-to-end (Role.exists(), the Roles & Permissions admin
    // UI), reusing "manager"'s scope since both manage users/workspaces/
    // documents/chats without touching instance-wide config.
    name: "customer_admin",
    displayName: "Customer Admin",
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.USERS_ASSIGN_ROLES,
      PERMISSIONS.INVITES_MANAGE,
      PERMISSIONS.WORKSPACES_CREATE,
      PERMISSIONS.WORKSPACES_VIEW_ALL,
      PERMISSIONS.WORKSPACES_MANAGE_ALL,
      PERMISSIONS.DOCUMENTS_MANAGE,
      PERMISSIONS.CHATS_VIEW_ALL,
    ],
    protectedPermissions: [],
  },
];

// Seed rows for the shared (workspace_id: null) `workspace_roles` table.
// Named to match this app's pre-existing "admin"/"member" workspace roles
// 1:1 - see the migration that backfills workspace_users.workspace_role_id
// onto these exact two rows.
const WORKSPACE_ROLES = [
  {
    name: "admin",
    displayName: "Admin",
    isDefault: false,
    permissions: WORKSPACE_PERMISSION_KEYS,
  },
  {
    name: "member",
    displayName: "Member",
    isDefault: true,
    permissions: [
      WORKSPACE_PERMISSIONS.VIEW,
      WORKSPACE_PERMISSIONS.CHAT,
      WORKSPACE_PERMISSIONS.DOCUMENTS_VIEW,
    ],
  },
];

module.exports = {
  ANY_PERMISSION,
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  SYSTEM_PERMISSION_KEYS,
  WORKSPACE_PERMISSION_KEYS,
  ALL_PERMISSION_KEYS,
  SYSTEM_ROLES,
  WORKSPACE_ROLES,
  FALLBACK_ROLE,
  SUPER_ADMIN_ROLE,
  FALLBACK_WORKSPACE_ROLE,
};
