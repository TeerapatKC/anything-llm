/**
 * The permission catalog.
 *
 * Access control in AnythingLLM is permission-based, not role-name based. A role is
 * simply a named bag of permissions that an operator creates and ticks boxes for, so
 * nothing in the codebase should ever branch on a role name like "admin" or "manager".
 *
 * Permissions come in two scopes that never overlap:
 *
 *   - `system`    - instance-wide capabilities. Granted by the single role on
 *                   `users.role`, and they apply everywhere.
 *   - `workspace` - capabilities inside one workspace. Granted by the workspace role on
 *                   the user's `workspace_users` row, so the same account can be a
 *                   manager of one workspace and a read-only member of another.
 *
 * A capability lives in exactly one scope. Anything that can differ per workspace
 * (chatting, uploading, workspace settings, membership) is workspace-scoped; anything
 * that configures the instance or crosses every workspace is system-scoped.
 *
 * Permission keys are declared here (in code) because endpoints reference them directly,
 * and the catalog is mirrored into the `permissions` table on boot so the management UI
 * can render them and so the role join tables can foreign-key against them.
 */

/**
 * Sentinel used by route middleware for endpoints any authenticated user may call.
 * It is not a real permission and is never stored in the database.
 */
const ANY_PERMISSION = "<any>";

const SCOPES = { SYSTEM: "system", WORKSPACE: "workspace" };

/** Instance-wide permissions, granted by the role on `users.role`. */
const PERMISSIONS = {
  ANY: ANY_PERMISSION,

  // System configuration
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

  // People
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  USERS_ASSIGN_ROLES: "users.assign_roles",
  INVITES_MANAGE: "invites.manage",
  ROLES_MANAGE: "roles.manage",
  WORKSPACE_ROLES_MANAGE: "workspace_roles.manage",

  // Workspaces - only the instance-level facts about workspaces live here.
  // Everything you can do *inside* a workspace is a workspace-scoped permission.
  WORKSPACES_CREATE: "workspaces.create",
  WORKSPACES_VIEW_ALL: "workspaces.view_all",
  WORKSPACES_MANAGE_ALL: "workspaces.manage_all",

  // Instance document library (the shared file store, not a workspace's embeddings)
  DOCUMENTS_MANAGE: "documents.manage",

  // Chats across the whole instance
  CHATS_VIEW_ALL: "chats.view_all",
  CHATS_UNLIMITED: "chats.unlimited",

  // Instance-level agent configuration
  AGENTS_MANAGE_SKILLS: "agents.manage_skills",
  AGENTS_FLOWS: "agents.flows",
  AGENTS_MCP_SERVERS: "agents.mcp_servers",

  // Embedded chat widgets
  EMBEDS_MANAGE: "embeds.manage",
  EMBEDS_VIEW_CHATS: "embeds.view_chats",
};

/**
 * Per-workspace permissions, granted by the workspace role on a `workspace_users` row.
 * These are checked against a specific workspace, never globally.
 */
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

const PERMISSION_CATEGORIES = {
  system: { label: "System", scope: SCOPES.SYSTEM, order: 0 },
  people: { label: "Users & Roles", scope: SCOPES.SYSTEM, order: 1 },
  workspaces: {
    label: "Workspaces (instance-wide)",
    scope: SCOPES.SYSTEM,
    order: 2,
  },
  library: { label: "Document Library", scope: SCOPES.SYSTEM, order: 3 },
  chats: { label: "Chats (instance-wide)", scope: SCOPES.SYSTEM, order: 4 },
  agents: { label: "Agents", scope: SCOPES.SYSTEM, order: 5 },
  embeds: { label: "Embedded Chat", scope: SCOPES.SYSTEM, order: 6 },

  workspace_access: { label: "Access", scope: SCOPES.WORKSPACE, order: 10 },
  workspace_content: { label: "Documents", scope: SCOPES.WORKSPACE, order: 11 },
  workspace_admin: {
    label: "Administration",
    scope: SCOPES.WORKSPACE,
    order: 12,
  },
};

/**
 * @typedef {Object} PermissionDefinition
 * @property {string} key
 * @property {string} label
 * @property {string} description
 * @property {string} category
 * @property {string} scope
 * @property {number} order
 */

/** @type {PermissionDefinition[]} */
const PERMISSION_CATALOG = [
  // ---------------------------------------------------------------- system scope
  {
    key: PERMISSIONS.SUPER_ADMIN,
    label: "Super administrator",
    description:
      "Grants every permission in both scopes, including ones added by future updates. Roles with this can never be locked out.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_SETTINGS,
    label: "Manage system settings",
    description:
      "Configure LLM, embedder, vector database, transcription, security and other instance-wide settings.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_MODEL_ROUTING,
    label: "Manage model routing",
    description: "Create and edit model routers and their routing rules.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_PROMPTS,
    label: "Manage system prompts",
    description:
      "Edit the default system prompt and the system prompt variables available to all workspaces.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_APPEARANCE,
    label: "Manage appearance",
    description:
      "Change branding, logo, app name, footer links, support email and browser tab metadata.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_EVENT_LOGS,
    label: "View event logs",
    description: "Read and clear the instance audit/event log.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_API_KEYS,
    label: "Manage developer API keys",
    description: "Issue and revoke instance-wide developer API keys.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_BROWSER_EXTENSION,
    label: "Manage browser extension keys",
    description: "Issue and revoke browser extension connection keys.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_MOBILE,
    label: "Manage mobile devices",
    description: "Approve, rename and revoke paired mobile/desktop devices.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_COMMUNITY_HUB,
    label: "Manage community hub",
    description:
      "Browse, import and publish community hub items and manage the hub connection key.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_EXPERIMENTAL,
    label: "Manage experimental features",
    description:
      "Toggle experimental features such as live document sync and imported agent plugins.",
    category: "system",
  },

  {
    key: PERMISSIONS.USERS_VIEW,
    label: "View users",
    description: "See the list of users on the instance.",
    category: "people",
  },
  {
    key: PERMISSIONS.USERS_MANAGE,
    label: "Manage users",
    description: "Create, edit, suspend and delete user accounts.",
    category: "people",
  },
  {
    key: PERMISSIONS.USERS_ASSIGN_ROLES,
    label: "Assign system roles to users",
    description:
      "Change which instance-wide role a user has. A role can only ever grant permissions the assigner already holds.",
    category: "people",
  },
  {
    key: PERMISSIONS.INVITES_MANAGE,
    label: "Manage invitations",
    description: "Create and revoke instance invitation links.",
    category: "people",
  },
  {
    key: PERMISSIONS.ROLES_MANAGE,
    label: "Manage system roles",
    description:
      "Create instance-wide roles and tick the permissions they grant. This is a privileged permission.",
    category: "people",
  },
  {
    key: PERMISSIONS.WORKSPACE_ROLES_MANAGE,
    label: "Manage workspace roles",
    description:
      "Define the reusable workspace roles (Viewer, Contributor, ...) that can be assigned to workspace members.",
    category: "people",
  },

  {
    key: PERMISSIONS.WORKSPACES_CREATE,
    label: "Create workspaces",
    description: "Create new workspaces on the instance.",
    category: "workspaces",
  },
  {
    key: PERMISSIONS.WORKSPACES_VIEW_ALL,
    label: "View all workspaces",
    description:
      "See every workspace on the instance, not only the ones they are a member of. Does not by itself grant any ability inside those workspaces.",
    category: "workspaces",
  },
  {
    key: PERMISSIONS.WORKSPACES_MANAGE_ALL,
    label: "Full control of every workspace",
    description:
      "Acts as if holding every workspace permission in every workspace, without needing to be a member. Use for instance operators who look after all workspaces.",
    category: "workspaces",
  },

  {
    key: PERMISSIONS.DOCUMENTS_MANAGE,
    label: "Manage the document library",
    description:
      "Browse, move, organise into folders and delete files in the shared instance document store.",
    category: "library",
  },

  {
    key: PERMISSIONS.CHATS_VIEW_ALL,
    label: "View all workspace chats",
    description:
      "Read, export and delete chat history across every workspace from the admin console.",
    category: "chats",
  },
  {
    key: PERMISSIONS.CHATS_UNLIMITED,
    label: "Bypass daily message limit",
    description: "Ignore the per-user daily message limit.",
    category: "chats",
  },

  {
    key: PERMISSIONS.AGENTS_MANAGE_SKILLS,
    label: "Manage agent skills",
    description:
      "Enable or disable the default agent skills, search provider and SQL connections for the instance.",
    category: "agents",
  },
  {
    key: PERMISSIONS.AGENTS_FLOWS,
    label: "Manage agent flows",
    description: "Create, edit, enable and delete agent flows.",
    category: "agents",
  },
  {
    key: PERMISSIONS.AGENTS_MCP_SERVERS,
    label: "Manage MCP servers",
    description: "Start, stop, delete and configure MCP servers and tools.",
    category: "agents",
  },

  {
    key: PERMISSIONS.EMBEDS_MANAGE,
    label: "Manage embedded chat widgets",
    description: "Create, edit and delete embedded chat widget configurations.",
    category: "embeds",
  },
  {
    key: PERMISSIONS.EMBEDS_VIEW_CHATS,
    label: "View embedded chat history",
    description: "Read and delete conversations captured by embed widgets.",
    category: "embeds",
  },

  // ------------------------------------------------------------- workspace scope
  {
    key: WORKSPACE_PERMISSIONS.VIEW,
    label: "View workspace",
    description:
      "Open the workspace and read its chat history. Without this the workspace is hidden entirely.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.CHAT,
    label: "Send chats",
    description: "Send messages to the workspace and invoke agents in it.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.THREADS_MANAGE,
    label: "Manage own threads",
    description: "Create, rename, fork and delete their own threads.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.CHATS_VIEW_ALL,
    label: "View other members' chats",
    description:
      "Read chat history belonging to other members of this workspace, not only their own.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.CHATS_DELETE,
    label: "Delete chat history",
    description:
      "Clear this workspace's chat history and remove individual messages.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
  },

  {
    key: WORKSPACE_PERMISSIONS.DOCUMENTS_VIEW,
    label: "View attached documents",
    description: "See which documents are embedded in this workspace.",
    category: "workspace_content",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.DOCUMENTS_UPLOAD,
    label: "Upload documents",
    description: "Upload files and links into this workspace.",
    category: "workspace_content",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.DOCUMENTS_MANAGE,
    label: "Manage embeddings",
    description:
      "Add, remove, pin and re-embed the documents attached to this workspace.",
    category: "workspace_content",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.DATA_CONNECTORS,
    label: "Use data connectors",
    description:
      "Import content into this workspace through connectors such as GitHub, Confluence, YouTube and website scraping.",
    category: "workspace_content",
    scope: SCOPES.WORKSPACE,
  },

  {
    key: WORKSPACE_PERMISSIONS.SETTINGS_MANAGE,
    label: "Manage workspace settings",
    description:
      "Edit this workspace's name, LLM, prompt, suggested messages and other settings.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.AGENTS_MANAGE,
    label: "Manage workspace agent skills",
    description: "Choose which agent skills are enabled inside this workspace.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.MEMBERS_MANAGE,
    label: "Manage members",
    description:
      "Add and remove members of this workspace and set the workspace role they hold.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.ROLES_MANAGE,
    label: "Define this workspace's roles",
    description:
      "Create roles that exist only inside this workspace and choose what they grant. The shared roles defined instance-wide stay read-only here.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.DELETE,
    label: "Delete workspace",
    description: "Delete this workspace or reset its vector database.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
  },
].map((permission, index) => ({
  scope: SCOPES.SYSTEM,
  ...permission,
  order: index,
}));

const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map(
  (permission) => permission.key
);
const SYSTEM_PERMISSION_KEYS = PERMISSION_CATALOG.filter(
  (permission) => permission.scope === SCOPES.SYSTEM
).map((permission) => permission.key);
const WORKSPACE_PERMISSION_KEYS = PERMISSION_CATALOG.filter(
  (permission) => permission.scope === SCOPES.WORKSPACE
).map((permission) => permission.key);

/**
 * The instance-wide roles that ship with AnythingLLM. Seeded on boot, cannot be deleted
 * or renamed, and their permission sets reproduce the behavior of the legacy hardcoded
 * admin/manager/default roles so upgrading an existing instance changes nothing.
 *
 * Their ticked permissions are only a starting point - operators can still change what a
 * system role grants, except for the super-admin role which always keeps `system.admin`.
 */
const SYSTEM_ROLES = [
  {
    name: "admin",
    displayName: "Admin",
    description:
      "Full control over the instance. Always holds every permission.",
    // Every system permission is protected, not just the super-admin grant, so a
    // release that adds new permissions tops the admin role up instead of leaving it
    // looking partially ticked in the management UI.
    protectedPermissions: SYSTEM_PERMISSION_KEYS,
    permissions: SYSTEM_PERMISSION_KEYS,
  },
  {
    name: "manager",
    displayName: "Manager",
    description:
      "Runs every workspace and looks after people, without access to instance configuration.",
    protectedPermissions: [],
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
      PERMISSIONS.SYSTEM_APPEARANCE,
      PERMISSIONS.SYSTEM_BROWSER_EXTENSION,
      PERMISSIONS.SYSTEM_EXPERIMENTAL,
    ],
  },
  {
    name: "default",
    displayName: "Member",
    description:
      "No instance-wide powers. What they can do comes from the workspace role they hold in each workspace.",
    protectedPermissions: [],
    permissions: [],
  },
];

/**
 * The reusable workspace roles that ship with AnythingLLM. One of these is assigned to
 * each `workspace_users` row, so the same account can hold different powers in
 * different workspaces.
 */
const WORKSPACE_ROLES = [
  {
    name: "viewer",
    displayName: "Viewer",
    description:
      "Reads the workspace but cannot chat in it or change anything.",
    isDefault: false,
    permissions: [
      WORKSPACE_PERMISSIONS.VIEW,
      WORKSPACE_PERMISSIONS.DOCUMENTS_VIEW,
    ],
  },
  {
    name: "member",
    displayName: "Member",
    description:
      "Chats in the workspace and manages their own threads. The role given to new members by default.",
    isDefault: true,
    permissions: [
      WORKSPACE_PERMISSIONS.VIEW,
      WORKSPACE_PERMISSIONS.CHAT,
      WORKSPACE_PERMISSIONS.THREADS_MANAGE,
      WORKSPACE_PERMISSIONS.DOCUMENTS_VIEW,
    ],
  },
  {
    name: "contributor",
    displayName: "Contributor",
    description:
      "Everything a member can do, plus adding and removing the workspace's documents.",
    isDefault: false,
    permissions: [
      WORKSPACE_PERMISSIONS.VIEW,
      WORKSPACE_PERMISSIONS.CHAT,
      WORKSPACE_PERMISSIONS.THREADS_MANAGE,
      WORKSPACE_PERMISSIONS.DOCUMENTS_VIEW,
      WORKSPACE_PERMISSIONS.DOCUMENTS_UPLOAD,
      WORKSPACE_PERMISSIONS.DOCUMENTS_MANAGE,
      WORKSPACE_PERMISSIONS.DATA_CONNECTORS,
    ],
  },
  {
    name: "workspace-manager",
    displayName: "Workspace Manager",
    description:
      "Full control of this workspace, including members and settings.",
    isDefault: false,
    permissions: WORKSPACE_PERMISSION_KEYS,
  },
];

/** The system role assigned when none is specified, and the fallback when one is deleted. */
const FALLBACK_ROLE = "default";

/** The system role that must always have at least one member holding it. */
const SUPER_ADMIN_ROLE = "admin";

/** The workspace role given to a member when none is specified. */
const FALLBACK_WORKSPACE_ROLE = "member";

/**
 * Maps each system setting label to the permission needed to read or write it.
 * Anything not listed falls back to `system.settings`.
 */
const SETTING_PERMISSIONS = {
  custom_app_name: PERMISSIONS.SYSTEM_APPEARANCE,
  footer_data: PERMISSIONS.SYSTEM_APPEARANCE,
  support_email: PERMISSIONS.SYSTEM_APPEARANCE,
  meta_page_title: PERMISSIONS.SYSTEM_APPEARANCE,
  meta_page_favicon: PERMISSIONS.SYSTEM_APPEARANCE,

  default_agent_skills: PERMISSIONS.AGENTS_MANAGE_SKILLS,
  disabled_agent_skills: PERMISSIONS.AGENTS_MANAGE_SKILLS,
  disabled_filesystem_skills: PERMISSIONS.AGENTS_MANAGE_SKILLS,
  disabled_create_files_skills: PERMISSIONS.AGENTS_MANAGE_SKILLS,
  disabled_gmail_skills: PERMISSIONS.AGENTS_MANAGE_SKILLS,
  disabled_outlook_skills: PERMISSIONS.AGENTS_MANAGE_SKILLS,
  imported_agent_skills: PERMISSIONS.AGENTS_MANAGE_SKILLS,
  agent_search_provider: PERMISSIONS.AGENTS_MANAGE_SKILLS,
  agent_sql_connections: PERMISSIONS.AGENTS_MANAGE_SKILLS,
};

/**
 * The permission required to read/write a given system setting label.
 * @param {string} label
 * @returns {string}
 */
function permissionForSetting(label) {
  return SETTING_PERMISSIONS[label] ?? PERMISSIONS.SYSTEM_SETTINGS;
}

/**
 * Every permission that can gate at least one system setting label - used as the
 * route-level gate for the system preference endpoints, which then filter per label.
 * @type {string[]}
 */
const SETTINGS_ROUTE_PERMISSIONS = [
  ...new Set([
    PERMISSIONS.SYSTEM_SETTINGS,
    ...Object.values(SETTING_PERMISSIONS),
  ]),
];

module.exports = {
  ANY_PERMISSION,
  SCOPES,
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  ALL_PERMISSION_KEYS,
  SYSTEM_PERMISSION_KEYS,
  WORKSPACE_PERMISSION_KEYS,
  SYSTEM_ROLES,
  WORKSPACE_ROLES,
  FALLBACK_ROLE,
  SUPER_ADMIN_ROLE,
  FALLBACK_WORKSPACE_ROLE,
  SETTINGS_ROUTE_PERMISSIONS,
  permissionForSetting,
};
