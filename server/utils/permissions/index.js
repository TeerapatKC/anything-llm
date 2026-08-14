/**
 * The permission catalog.
 *
 * Access control in AnythingLLM is permission-based, not role-name based. A role is
 * simply a named bag of permissions that an operator creates and ticks boxes for, so
 * nothing in the codebase should ever branch on a role name like "admin" or "manager".
 *
 * Permission keys are declared here (in code) because endpoints reference them directly,
 * and the catalog is mirrored into the `permissions` table on boot so the management UI
 * can render them and so `role_permissions` can foreign-key against them.
 */

/**
 * Sentinel used by route middleware for endpoints any authenticated user may call.
 * It is not a real permission and is never stored in the database.
 */
const ANY_PERMISSION = "<any>";

const PERMISSIONS = {
  ANY: ANY_PERMISSION,

  // System
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

  // Workspaces
  WORKSPACES_VIEW_ALL: "workspaces.view_all",
  WORKSPACES_CREATE: "workspaces.create",
  WORKSPACES_MANAGE: "workspaces.manage",
  WORKSPACES_DELETE: "workspaces.delete",
  WORKSPACES_MANAGE_MEMBERS: "workspaces.manage_members",

  // Documents
  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_MANAGE: "documents.manage",
  DOCUMENTS_DATA_CONNECTORS: "documents.data_connectors",

  // Chats
  CHATS_SEND: "chats.send",
  CHATS_VIEW_ALL: "chats.view_all",
  CHATS_UNLIMITED: "chats.unlimited",

  // Agents
  AGENTS_MANAGE_SKILLS: "agents.manage_skills",
  AGENTS_FLOWS: "agents.flows",
  AGENTS_MCP_SERVERS: "agents.mcp_servers",

  // Embeds
  EMBEDS_MANAGE: "embeds.manage",
  EMBEDS_VIEW_CHATS: "embeds.view_chats",
};

const PERMISSION_CATEGORIES = {
  system: { label: "System", order: 0 },
  people: { label: "Users & Roles", order: 1 },
  workspaces: { label: "Workspaces", order: 2 },
  documents: { label: "Documents", order: 3 },
  chats: { label: "Chats", order: 4 },
  agents: { label: "Agents", order: 5 },
  embeds: { label: "Embedded Chat", order: 6 },
};

/**
 * @typedef {Object} PermissionDefinition
 * @property {string} key
 * @property {string} label
 * @property {string} description
 * @property {string} category
 * @property {number} order
 */

/** @type {PermissionDefinition[]} */
const PERMISSION_CATALOG = [
  {
    key: PERMISSIONS.SUPER_ADMIN,
    label: "Super administrator",
    description:
      "Grants every permission, including ones added by future updates. Roles with this can never be locked out.",
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
    label: "Assign roles to users",
    description:
      "Change which role a user has. A role can only ever grant permissions the assigner already holds.",
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
    label: "Manage roles & permissions",
    description:
      "Create roles and tick the permissions they grant. This is a privileged permission.",
    category: "people",
  },

  {
    key: PERMISSIONS.WORKSPACES_VIEW_ALL,
    label: "View all workspaces",
    description:
      "See every workspace on the instance, not only the ones the user is a member of.",
    category: "workspaces",
  },
  {
    key: PERMISSIONS.WORKSPACES_CREATE,
    label: "Create workspaces",
    description: "Create new workspaces.",
    category: "workspaces",
  },
  {
    key: PERMISSIONS.WORKSPACES_MANAGE,
    label: "Manage workspace settings",
    description:
      "Edit workspace settings, prompts, agent skills, pinned documents and prompt history.",
    category: "workspaces",
  },
  {
    key: PERMISSIONS.WORKSPACES_DELETE,
    label: "Delete workspaces",
    description: "Delete workspaces and reset their vector database.",
    category: "workspaces",
  },
  {
    key: PERMISSIONS.WORKSPACES_MANAGE_MEMBERS,
    label: "Manage workspace members",
    description: "Add and remove users from workspaces.",
    category: "workspaces",
  },

  {
    key: PERMISSIONS.DOCUMENTS_UPLOAD,
    label: "Upload documents",
    description: "Upload files and links into workspaces.",
    category: "documents",
  },
  {
    key: PERMISSIONS.DOCUMENTS_MANAGE,
    label: "Manage document library",
    description:
      "Browse, move, embed, unembed and delete documents and folders in the instance library.",
    category: "documents",
  },
  {
    key: PERMISSIONS.DOCUMENTS_DATA_CONNECTORS,
    label: "Use data connectors",
    description:
      "Import content through data connectors such as GitHub, Confluence, YouTube and website scraping.",
    category: "documents",
  },

  {
    key: PERMISSIONS.CHATS_SEND,
    label: "Send chats",
    description:
      "Send messages to workspaces. Without this a user can read a workspace but not talk to it.",
    category: "chats",
  },
  {
    key: PERMISSIONS.CHATS_VIEW_ALL,
    label: "View all workspace chats",
    description:
      "Read, export and delete chat history belonging to other users.",
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
      "Enable or disable the default agent skills, search provider and SQL connections.",
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
].map((permission, index) => ({ ...permission, order: index }));

const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map(
  (permission) => permission.key
);

/**
 * The roles that ship with the instance. They are seeded on boot, cannot be deleted or
 * renamed, and their permission sets reproduce the behavior of the legacy hardcoded
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
    protectedPermissions: [PERMISSIONS.SUPER_ADMIN],
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    name: "manager",
    displayName: "Manager",
    description:
      "Runs workspaces, documents and people without access to instance configuration.",
    protectedPermissions: [],
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.USERS_ASSIGN_ROLES,
      PERMISSIONS.INVITES_MANAGE,
      PERMISSIONS.WORKSPACES_VIEW_ALL,
      PERMISSIONS.WORKSPACES_CREATE,
      PERMISSIONS.WORKSPACES_MANAGE,
      PERMISSIONS.WORKSPACES_DELETE,
      PERMISSIONS.WORKSPACES_MANAGE_MEMBERS,
      PERMISSIONS.DOCUMENTS_UPLOAD,
      PERMISSIONS.DOCUMENTS_MANAGE,
      PERMISSIONS.DOCUMENTS_DATA_CONNECTORS,
      PERMISSIONS.CHATS_SEND,
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
      "Chats in the workspaces they have been added to. The fallback role for new users.",
    protectedPermissions: [],
    permissions: [PERMISSIONS.CHATS_SEND],
  },
];

/** The role assigned when none is specified, and the fallback when a role is deleted. */
const FALLBACK_ROLE = "default";

/** The role that must always have at least one non-suspended member holding it. */
const SUPER_ADMIN_ROLE = "admin";

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
  PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  ALL_PERMISSION_KEYS,
  SYSTEM_ROLES,
  FALLBACK_ROLE,
  SUPER_ADMIN_ROLE,
  SETTINGS_ROUTE_PERMISSIONS,
  permissionForSetting,
};
