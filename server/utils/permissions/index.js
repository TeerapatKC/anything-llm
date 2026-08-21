/**
 * The permission catalog.
 *
 * Access control in AnythingLLM is permission-based, not role-name based. A role is
 * simply a named bag of permissions that an operator creates and ticks boxes for, so
 * nothing in the codebase should ever branch on a role name like "admin" or "manager".
 * The one deliberate exception is the `super-admin` role - see SUPER_ADMIN_ROLE below.
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
 * Permissions form a shallow tree: a coarse parent implies every child beneath it. That
 * is what lets an operator hand out `workspace.settings.llm` on its own while a role
 * that still holds the older, coarser `workspace.settings.manage` keeps working exactly
 * as before. Implication is resolved once when a role's permission set is cached, so
 * every `userCan` check downstream sees the fully expanded set.
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

  // The wildcard. Anything holding this passes every system-scope check, including
  // permissions that do not exist yet.
  SYSTEM_ADMIN: "system.admin",

  // System configuration
  SYSTEM_SETTINGS: "system.settings",
  SYSTEM_SETTINGS_LLM: "system.settings.llm",
  SYSTEM_SETTINGS_EMBEDDER: "system.settings.embedder",
  SYSTEM_SETTINGS_VECTOR_DB: "system.settings.vector_db",
  SYSTEM_SETTINGS_TRANSCRIPTION: "system.settings.transcription",
  SYSTEM_SETTINGS_TEXT_SPLITTING: "system.settings.text_splitting",
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

  // People
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

  // Workspaces - only the instance-level facts about workspaces live here.
  // Everything you can do *inside* a workspace is a workspace-scoped permission.
  WORKSPACES_CREATE: "workspaces.create",
  WORKSPACES_VIEW_ALL: "workspaces.view_all",
  WORKSPACES_MANAGE_ALL: "workspaces.manage_all",
  WORKSPACES_DELETE_ANY: "workspaces.delete_any",

  // Instance document library (the shared file store, not a workspace's embeddings)
  DOCUMENTS_MANAGE: "documents.manage",
  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_ORGANIZE: "documents.organize",
  DOCUMENTS_DELETE: "documents.delete",

  // Chats across the whole instance
  CHATS_VIEW_ALL: "chats.view_all",
  CHATS_EXPORT: "chats.export",
  CHATS_DELETE_ANY: "chats.delete_any",
  CHATS_UNLIMITED: "chats.unlimited",

  // Instance-level agent configuration
  AGENTS_MANAGE_SKILLS: "agents.manage_skills",
  AGENTS_FLOWS: "agents.flows",
  AGENTS_FLOWS_VIEW: "agents.flows.view",
  AGENTS_FLOWS_EDIT: "agents.flows.edit",
  AGENTS_FLOWS_DELETE: "agents.flows.delete",
  AGENTS_MCP_SERVERS: "agents.mcp_servers",
  AGENTS_SCHEDULED_JOBS: "agents.scheduled_jobs",

  // Embedded chat widgets
  EMBEDS_MANAGE: "embeds.manage",
  EMBEDS_VIEW_CHATS: "embeds.view_chats",

  // Outbound integrations that act on the instance's behalf
  INTEGRATIONS_TELEGRAM: "integrations.telegram",
  INTEGRATIONS_GOOGLE: "integrations.google",
  INTEGRATIONS_OUTLOOK: "integrations.outlook",
};

/**
 * Per-workspace permissions, granted by the workspace role on a `workspace_users` row.
 * These are checked against a specific workspace, never globally.
 */
const WORKSPACE_PERMISSIONS = {
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
  integrations: { label: "Integrations", scope: SCOPES.SYSTEM, order: 7 },

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
 * @property {string|null} parent - the coarser permission that implies this one
 * @property {number} order
 */

/** @type {PermissionDefinition[]} */
const PERMISSION_CATALOG = [
  // ---------------------------------------------------------------- system scope
  {
    key: PERMISSIONS.SYSTEM_ADMIN,
    label: "Super administrator",
    description:
      "Grants every permission in both scopes, including ones added by future updates. Roles with this can never be locked out.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_SETTINGS,
    label: "Manage system settings",
    description:
      "Everything under instance configuration. Tick the individual settings below instead to hand out only part of it.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_SETTINGS_LLM,
    label: "Configure the LLM provider",
    description:
      "Choose the instance LLM provider, its credentials and the default model.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_SETTINGS,
  },
  {
    key: PERMISSIONS.SYSTEM_SETTINGS_EMBEDDER,
    label: "Configure the embedder",
    description:
      "Choose the embedding provider and model used when documents are embedded.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_SETTINGS,
  },
  {
    key: PERMISSIONS.SYSTEM_SETTINGS_VECTOR_DB,
    label: "Configure the vector database",
    description: "Point the instance at a vector database and set its access.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_SETTINGS,
  },
  {
    key: PERMISSIONS.SYSTEM_SETTINGS_TRANSCRIPTION,
    label: "Configure transcription",
    description:
      "Choose the speech-to-text and text-to-speech providers used for audio.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_SETTINGS,
  },
  {
    key: PERMISSIONS.SYSTEM_SETTINGS_TEXT_SPLITTING,
    label: "Configure text splitting",
    description:
      "Set the chunk size and overlap used when documents are split.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_SETTINGS,
  },
  {
    key: PERMISSIONS.SYSTEM_SETTINGS_SECURITY,
    label: "Configure security",
    description:
      "Password policy, session length, message limits and other account protections.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_SETTINGS,
  },
  {
    key: PERMISSIONS.SYSTEM_SETTINGS_PRIVACY,
    label: "Configure privacy & telemetry",
    description: "Data handling preferences and anonymous telemetry.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_SETTINGS,
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
      "Everything about how the instance looks. Tick the parts below to hand out only some of it.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_APPEARANCE_BRANDING,
    label: "Change branding",
    description: "Logo, application name, browser tab title and favicon.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_APPEARANCE,
  },
  {
    key: PERMISSIONS.SYSTEM_APPEARANCE_FOOTER,
    label: "Change footer & support links",
    description: "Footer links and the support email shown to users.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_APPEARANCE,
  },
  {
    key: PERMISSIONS.SYSTEM_EVENT_LOGS,
    label: "Manage event logs",
    description:
      "Read and clear the instance audit log. Tick the parts below for read-only access.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_EVENT_LOGS_VIEW,
    label: "View event logs",
    description: "Read the instance audit log without being able to clear it.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_EVENT_LOGS,
  },
  {
    key: PERMISSIONS.SYSTEM_EVENT_LOGS_CLEAR,
    label: "Clear event logs",
    description: "Wipe the instance audit log.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_EVENT_LOGS,
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
      "Everything to do with the community hub. Tick the parts below for narrower access.",
    category: "system",
  },
  {
    key: PERMISSIONS.SYSTEM_COMMUNITY_HUB_BROWSE,
    label: "Browse the community hub",
    description:
      "Search the hub and manage the hub connection key, without importing anything.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_COMMUNITY_HUB,
  },
  {
    key: PERMISSIONS.SYSTEM_COMMUNITY_HUB_IMPORT,
    label: "Import from the community hub",
    description: "Pull hub items (skills, prompts, flows) into this instance.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_COMMUNITY_HUB,
  },
  {
    key: PERMISSIONS.SYSTEM_COMMUNITY_HUB_PUBLISH,
    label: "Publish to the community hub",
    description: "Push items from this instance out to the community hub.",
    category: "system",
    parent: PERMISSIONS.SYSTEM_COMMUNITY_HUB,
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
    description:
      "Full control of user accounts. Tick the individual actions below to hand out only part of it.",
    category: "people",
  },
  {
    key: PERMISSIONS.USERS_CREATE,
    label: "Create users",
    description: "Add new user accounts to the instance.",
    category: "people",
    parent: PERMISSIONS.USERS_MANAGE,
  },
  {
    key: PERMISSIONS.USERS_EDIT,
    label: "Edit users",
    description:
      "Change a user's username, email, bio and daily message limit.",
    category: "people",
    parent: PERMISSIONS.USERS_MANAGE,
  },
  {
    key: PERMISSIONS.USERS_SUSPEND,
    label: "Suspend users",
    description: "Lock an account out without deleting it.",
    category: "people",
    parent: PERMISSIONS.USERS_MANAGE,
  },
  {
    key: PERMISSIONS.USERS_DELETE,
    label: "Delete users",
    description: "Permanently remove user accounts.",
    category: "people",
    parent: PERMISSIONS.USERS_MANAGE,
  },
  {
    key: PERMISSIONS.USERS_RESET_PASSWORD,
    label: "Reset user passwords",
    description:
      "Generate a new password for an account and force a change on next login.",
    category: "people",
    parent: PERMISSIONS.USERS_MANAGE,
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
    key: PERMISSIONS.INVITES_CREATE,
    label: "Create invitations",
    description: "Issue new invitation links.",
    category: "people",
    parent: PERMISSIONS.INVITES_MANAGE,
  },
  {
    key: PERMISSIONS.INVITES_DELETE,
    label: "Revoke invitations",
    description: "Cancel invitation links that have not been used yet.",
    category: "people",
    parent: PERMISSIONS.INVITES_MANAGE,
  },
  {
    key: PERMISSIONS.ROLES_MANAGE,
    label: "Manage system roles",
    description:
      "Create instance-wide roles and tick the permissions they grant. This is a privileged permission.",
    category: "people",
  },
  {
    key: PERMISSIONS.ROLES_CREATE,
    label: "Create system roles",
    description: "Define new instance-wide roles.",
    category: "people",
    parent: PERMISSIONS.ROLES_MANAGE,
  },
  {
    key: PERMISSIONS.ROLES_EDIT,
    label: "Edit system roles",
    description: "Change what an existing instance-wide role grants.",
    category: "people",
    parent: PERMISSIONS.ROLES_MANAGE,
  },
  {
    key: PERMISSIONS.ROLES_DELETE,
    label: "Delete system roles",
    description: "Remove operator-defined instance-wide roles.",
    category: "people",
    parent: PERMISSIONS.ROLES_MANAGE,
  },
  {
    key: PERMISSIONS.WORKSPACE_ROLES_MANAGE,
    label: "Manage workspace roles",
    description:
      "Define the reusable workspace roles (Viewer, Contributor, ...) that can be assigned to workspace members.",
    category: "people",
  },
  {
    key: PERMISSIONS.WORKSPACE_ROLES_CREATE,
    label: "Create workspace roles",
    description: "Define new reusable workspace roles.",
    category: "people",
    parent: PERMISSIONS.WORKSPACE_ROLES_MANAGE,
  },
  {
    key: PERMISSIONS.WORKSPACE_ROLES_EDIT,
    label: "Edit workspace roles",
    description: "Change what an existing reusable workspace role grants.",
    category: "people",
    parent: PERMISSIONS.WORKSPACE_ROLES_MANAGE,
  },
  {
    key: PERMISSIONS.WORKSPACE_ROLES_DELETE,
    label: "Delete workspace roles",
    description: "Remove operator-defined reusable workspace roles.",
    category: "people",
    parent: PERMISSIONS.WORKSPACE_ROLES_MANAGE,
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
    key: PERMISSIONS.WORKSPACES_DELETE_ANY,
    label: "Delete any workspace",
    description:
      "Delete workspaces they are not a member of, from the admin console.",
    category: "workspaces",
    parent: PERMISSIONS.WORKSPACES_MANAGE_ALL,
  },

  {
    key: PERMISSIONS.DOCUMENTS_MANAGE,
    label: "Manage the document library",
    description:
      "Full control of the shared instance document store. Tick the actions below to narrow it.",
    category: "library",
  },
  {
    key: PERMISSIONS.DOCUMENTS_VIEW,
    label: "Browse the document library",
    description: "See the files and folders in the shared document store.",
    category: "library",
    parent: PERMISSIONS.DOCUMENTS_MANAGE,
  },
  {
    key: PERMISSIONS.DOCUMENTS_UPLOAD,
    label: "Upload to the document library",
    description: "Add new files and links to the shared document store.",
    category: "library",
    parent: PERMISSIONS.DOCUMENTS_MANAGE,
  },
  {
    key: PERMISSIONS.DOCUMENTS_ORGANIZE,
    label: "Organise the document library",
    description: "Create folders and move files between them.",
    category: "library",
    parent: PERMISSIONS.DOCUMENTS_MANAGE,
  },
  {
    key: PERMISSIONS.DOCUMENTS_DELETE,
    label: "Delete from the document library",
    description: "Permanently remove files from the shared document store.",
    category: "library",
    parent: PERMISSIONS.DOCUMENTS_MANAGE,
  },

  {
    key: PERMISSIONS.CHATS_VIEW_ALL,
    label: "View all workspace chats",
    description:
      "Read chat history across every workspace from the admin console.",
    category: "chats",
  },
  {
    key: PERMISSIONS.CHATS_EXPORT,
    label: "Export chats",
    description:
      "Download instance-wide chat history as JSON/CSV for fine-tuning or audit.",
    category: "chats",
    parent: PERMISSIONS.CHATS_VIEW_ALL,
  },
  {
    key: PERMISSIONS.CHATS_DELETE_ANY,
    label: "Delete any chat",
    description: "Remove chat messages belonging to any user in any workspace.",
    category: "chats",
    parent: PERMISSIONS.CHATS_VIEW_ALL,
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
    description:
      "Full control of agent flows. Tick the actions below to narrow it.",
    category: "agents",
  },
  {
    key: PERMISSIONS.AGENTS_FLOWS_VIEW,
    label: "View agent flows",
    description: "Read the defined agent flows without changing them.",
    category: "agents",
    parent: PERMISSIONS.AGENTS_FLOWS,
  },
  {
    key: PERMISSIONS.AGENTS_FLOWS_EDIT,
    label: "Create & edit agent flows",
    description: "Build new agent flows and change or enable existing ones.",
    category: "agents",
    parent: PERMISSIONS.AGENTS_FLOWS,
  },
  {
    key: PERMISSIONS.AGENTS_FLOWS_DELETE,
    label: "Delete agent flows",
    description: "Permanently remove agent flows.",
    category: "agents",
    parent: PERMISSIONS.AGENTS_FLOWS,
  },
  {
    key: PERMISSIONS.AGENTS_MCP_SERVERS,
    label: "Manage MCP servers",
    description: "Start, stop, delete and configure MCP servers and tools.",
    category: "agents",
  },
  {
    key: PERMISSIONS.AGENTS_SCHEDULED_JOBS,
    label: "Manage scheduled agent jobs",
    description:
      "Create, edit and run the agents that fire on a schedule, and read their run history.",
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

  {
    key: PERMISSIONS.INTEGRATIONS_TELEGRAM,
    label: "Manage the Telegram bot",
    description:
      "Connect, configure and disconnect the Telegram bot that answers on the instance's behalf.",
    category: "integrations",
  },
  {
    key: PERMISSIONS.INTEGRATIONS_GOOGLE,
    label: "Manage Google integration",
    description:
      "Connect and revoke the Google account agents use for Gmail and Drive skills.",
    category: "integrations",
  },
  {
    key: PERMISSIONS.INTEGRATIONS_OUTLOOK,
    label: "Manage Outlook integration",
    description:
      "Connect and revoke the Microsoft account agents use for Outlook skills.",
    category: "integrations",
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
    description:
      "Send messages to the workspace. Tick the parts below to allow plain chat but not agents or attachments.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.CHAT_AGENTS,
    label: "Invoke agents in chat",
    description:
      "Use @agent in this workspace, which lets the model run tools on their behalf.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.CHAT,
  },
  {
    key: WORKSPACE_PERMISSIONS.CHAT_ATTACH_FILES,
    label: "Attach files to a message",
    description:
      "Attach one-off files to a chat message without embedding them into the workspace.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.CHAT,
  },
  {
    key: WORKSPACE_PERMISSIONS.CHAT_SLASH_COMMANDS,
    label: "Use slash commands",
    description: "Run slash commands and saved prompt presets in chat.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.CHAT,
  },
  {
    key: WORKSPACE_PERMISSIONS.THREADS_MANAGE,
    label: "Manage own threads",
    description:
      "Create, rename, fork and delete their own threads. Tick the actions below to narrow it.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.THREADS_CREATE,
    label: "Create threads",
    description: "Start new threads inside this workspace.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.THREADS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.THREADS_RENAME,
    label: "Rename threads",
    description: "Rename their own threads.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.THREADS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.THREADS_DELETE,
    label: "Delete threads",
    description: "Delete their own threads and everything in them.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.THREADS_MANAGE,
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
    key: WORKSPACE_PERMISSIONS.CHATS_EXPORT,
    label: "Export chat history",
    description: "Download this workspace's conversations as a file.",
    category: "workspace_access",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.CHATS_VIEW_ALL,
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
      "Add, remove, pin and re-embed the documents attached to this workspace. Tick the actions below to narrow it.",
    category: "workspace_content",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.DOCUMENTS_REMOVE,
    label: "Remove embedded documents",
    description: "Detach documents from this workspace's vector database.",
    category: "workspace_content",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.DOCUMENTS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.DOCUMENTS_PIN,
    label: "Pin documents",
    description:
      "Pin a document so its full text is always included in the context window.",
    category: "workspace_content",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.DOCUMENTS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.DOCUMENTS_WATCH,
    label: "Watch documents for changes",
    description:
      "Mark a document to be re-fetched and re-embedded when its source changes.",
    category: "workspace_content",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.DOCUMENTS_MANAGE,
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
      "Full control of this workspace's configuration. Tick the sections below to hand out only part of it.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.SETTINGS_GENERAL,
    label: "Edit general settings",
    description:
      "The workspace name, description and other general preferences.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.SETTINGS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.SETTINGS_LLM,
    label: "Choose the workspace LLM",
    description:
      "Override the instance LLM, model and temperature for this workspace.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.SETTINGS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.SETTINGS_PROMPT,
    label: "Edit the workspace prompt",
    description:
      "Change this workspace's system prompt and suggested messages.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.SETTINGS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.SETTINGS_VECTOR,
    label: "Tune vector search",
    description:
      "Change similarity threshold, snippet count and the vector database settings for this workspace.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.SETTINGS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.SETTINGS_APPEARANCE,
    label: "Change workspace appearance",
    description: "The workspace profile image and chat display preferences.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.SETTINGS_MANAGE,
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
      "Add and remove members of this workspace and set the workspace role they hold. Tick the actions below to narrow it.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
  },
  {
    key: WORKSPACE_PERMISSIONS.MEMBERS_ADD,
    label: "Add members",
    description: "Bring existing accounts into this workspace.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.MEMBERS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.MEMBERS_REMOVE,
    label: "Remove members",
    description: "Take accounts out of this workspace.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.MEMBERS_MANAGE,
  },
  {
    key: WORKSPACE_PERMISSIONS.MEMBERS_SET_ROLE,
    label: "Set member roles",
    description: "Change which workspace role each member holds.",
    category: "workspace_admin",
    scope: SCOPES.WORKSPACE,
    parent: WORKSPACE_PERMISSIONS.MEMBERS_MANAGE,
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
  parent: null,
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
 * Direct children of each coarse permission, derived from the `parent` field so the
 * catalog stays the single source of truth.
 * @type {Map<string, string[]>}
 */
const PERMISSION_CHILDREN = PERMISSION_CATALOG.reduce(
  (children, permission) => {
    if (!permission.parent) return children;
    children.set(permission.parent, [
      ...(children.get(permission.parent) ?? []),
      permission.key,
    ]);
    return children;
  },
  new Map()
);

/**
 * Each permission's coarser parent, for walking upwards from a fine-grained key.
 * @type {Map<string, string>}
 */
const PERMISSION_PARENTS = new Map(
  PERMISSION_CATALOG.filter((permission) => permission.parent).map(
    (permission) => [permission.key, permission.parent]
  )
);

/**
 * The chain of coarser permissions that each imply `permissionKey`. Used by route gates
 * that list a fine-grained permission but must also admit anyone holding the parent.
 * @param {string} permissionKey
 * @returns {string[]}
 */
function ancestorsOf(permissionKey) {
  const chain = [];
  let current = PERMISSION_PARENTS.get(permissionKey);
  while (current) {
    chain.push(current);
    current = PERMISSION_PARENTS.get(current);
  }
  return chain;
}

/**
 * Adds every permission implied by the given ones. A role that holds a coarse parent
 * (`workspace.settings.manage`) therefore satisfies a check written against one of its
 * children (`workspace.settings.llm`) without the operator having to re-tick anything
 * after an upgrade splits a permission apart.
 * @param {Iterable<string>} permissionKeys
 * @returns {string[]}
 */
function expandPermissions(permissionKeys = []) {
  const expanded = new Set();
  const queue = [...permissionKeys];
  while (queue.length > 0) {
    const key = queue.pop();
    if (expanded.has(key)) continue;
    expanded.add(key);
    for (const child of PERMISSION_CHILDREN.get(key) ?? []) queue.push(child);
  }
  return [...expanded];
}

/**
 * The instance-wide roles that ship with AnythingLLM. Seeded on boot, cannot be deleted
 * or renamed, and their permission sets reproduce the behavior of the legacy hardcoded
 * admin/manager/default roles so upgrading an existing instance changes nothing.
 *
 * Their ticked permissions are only a starting point - operators can still change what a
 * system role grants, except for `super-admin` (immutable, see below) and the `admin`
 * role which always keeps `system.admin`.
 *
 * @typedef {Object} SystemRoleDefinition
 * @property {string} name
 * @property {string} displayName
 * @property {string} description
 * @property {string[]} protectedPermissions - re-applied on every boot; cannot be unticked
 * @property {string[]} permissions - seeded once, on creation
 * @property {boolean} singleton - at most one account may ever hold this role
 * @property {boolean} immutable - the permission set can never be edited
 * @property {boolean} assignable - whether it may be handed out through the normal user UI
 */
const SYSTEM_ROLES = [
  {
    name: "super-admin",
    displayName: "Super Admin",
    description:
      "The account that owns this instance. Exactly one user holds it, it is assigned during onboarding and can only move through an explicit ownership transfer. It can never be deleted, suspended, demoted or edited by anyone else - including other administrators.",
    protectedPermissions: SYSTEM_PERMISSION_KEYS,
    permissions: SYSTEM_PERMISSION_KEYS,
    singleton: true,
    immutable: true,
    assignable: false,
  },
  {
    name: "admin",
    displayName: "Admin",
    description:
      "Full control over the instance. Always holds every permission, but unlike the super admin it can be created, edited and removed like any other account.",
    // Every system permission is protected, not just the super-admin grant, so a
    // release that adds new permissions tops the admin role up instead of leaving it
    // looking partially ticked in the management UI.
    protectedPermissions: SYSTEM_PERMISSION_KEYS,
    permissions: SYSTEM_PERMISSION_KEYS,
    singleton: false,
    immutable: false,
    assignable: true,
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
    singleton: false,
    immutable: false,
    assignable: true,
  },
  {
    name: "default",
    displayName: "Member",
    description:
      "No instance-wide powers. What they can do comes from the workspace role they hold in each workspace.",
    protectedPermissions: [],
    permissions: [],
    singleton: false,
    immutable: false,
    assignable: true,
  },
].map((role) => ({
  singleton: false,
  immutable: false,
  assignable: true,
  ...role,
}));

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

/** The built-in role that carries the `system.admin` wildcard for ordinary operators. */
const ADMIN_ROLE = "admin";

/**
 * The instance owner.
 *
 * This is the one place the codebase does branch on a role name, and it is deliberate:
 * what makes this role special is not a capability (it holds the same `system.admin`
 * wildcard as `admin`) but an *identity* - it marks the single account that owns the
 * deployment. Its guarantees are therefore enforced by name, in the models:
 *
 *   - at most one account may hold it, ever;
 *   - it is created only during first-run setup and moved only by an explicit
 *     ownership transfer or the break-glass recovery path;
 *   - nobody - including other administrators and the developer API - can delete,
 *     suspend, rename or demote the account holding it;
 *   - its permission set cannot be edited and the role itself cannot be deleted;
 *   - a handful of destructive instance-wide operations (ownership transfer, system
 *     reset) are gated on holding this role rather than on any permission, so they can
 *     never be ticked into an operator-defined role.
 */
const SUPER_ADMIN_ROLE = "super-admin";

/**
 * What the super-admin role can do that no permission grants. Surfaced to the roles UI
 * so operators can see why the role is special without these being tickable boxes.
 */
const SUPER_ADMIN_ONLY_CAPABILITIES = [
  {
    key: "ownership.transfer",
    label: "Transfer instance ownership",
    description:
      "Hand the super admin role to another account. The current owner is demoted to Admin in the same operation.",
  },
  {
    key: "system.reset",
    label: "Reset & clean up the instance",
    description:
      "Irreversibly wipe chosen parts of the deployment - workspaces, chats, the document library, users or settings.",
  },
  {
    key: "account.immunity",
    label: "Cannot be deleted, suspended or demoted",
    description:
      "No other account, and no developer API key, can remove or lock out the owner.",
  },
];

/** The workspace role given to a member when none is specified. */
const FALLBACK_WORKSPACE_ROLE = "member";

/**
 * Maps each system setting label to the permission needed to read or write it.
 * Anything not listed falls back to `system.settings`, which every one of the
 * finer-grained settings permissions below is a child of.
 */
const SETTING_PERMISSIONS = {
  custom_app_name: PERMISSIONS.SYSTEM_APPEARANCE_BRANDING,
  meta_page_title: PERMISSIONS.SYSTEM_APPEARANCE_BRANDING,
  meta_page_favicon: PERMISSIONS.SYSTEM_APPEARANCE_BRANDING,
  logo_filename: PERMISSIONS.SYSTEM_APPEARANCE_BRANDING,
  footer_data: PERMISSIONS.SYSTEM_APPEARANCE_FOOTER,
  support_email: PERMISSIONS.SYSTEM_APPEARANCE_FOOTER,

  limit_user_messages: PERMISSIONS.SYSTEM_SETTINGS_SECURITY,
  message_limit: PERMISSIONS.SYSTEM_SETTINGS_SECURITY,

  text_splitter_chunk_size: PERMISSIONS.SYSTEM_SETTINGS_TEXT_SPLITTING,
  text_splitter_chunk_overlap: PERMISSIONS.SYSTEM_SETTINGS_TEXT_SPLITTING,
  max_embed_chunk_size: PERMISSIONS.SYSTEM_SETTINGS_TEXT_SPLITTING,

  telemetry_id: PERMISSIONS.SYSTEM_SETTINGS_PRIVACY,

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
    ...expandPermissions([PERMISSIONS.SYSTEM_SETTINGS]),
    // Both the fine-grained key a label maps to and the coarser permissions that imply
    // it, so a role holding only `system.appearance` still passes the route gate.
    ...Object.values(SETTING_PERMISSIONS).flatMap((permission) => [
      permission,
      ...ancestorsOf(permission),
    ]),
  ]),
];

module.exports = {
  ANY_PERMISSION,
  SCOPES,
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  PERMISSION_CHILDREN,
  PERMISSION_PARENTS,
  ALL_PERMISSION_KEYS,
  SYSTEM_PERMISSION_KEYS,
  WORKSPACE_PERMISSION_KEYS,
  SYSTEM_ROLES,
  WORKSPACE_ROLES,
  FALLBACK_ROLE,
  ADMIN_ROLE,
  SUPER_ADMIN_ROLE,
  SUPER_ADMIN_ONLY_CAPABILITIES,
  FALLBACK_WORKSPACE_ROLE,
  SETTINGS_ROUTE_PERMISSIONS,
  expandPermissions,
  ancestorsOf,
  permissionForSetting,
};
