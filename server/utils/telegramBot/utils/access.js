const { User } = require("../../../models/user");
const { Workspace } = require("../../../models/workspace");
const { WorkspaceThread } = require("../../../models/workspaceThread");
const { TelegramUser } = require("../../../models/telegramUser");
const { WorkspaceRole } = require("../../../models/workspaceRole");
const { Role } = require("../../../models/role");
const {
  PERMISSIONS,
  WORKSPACE_PERMISSIONS: WS_PERMISSIONS,
} = require("../../permissions");
const { normalizeLanguage } = require("./language");

/**
 * Access control for the shared Telegram bot.
 *
 * Every check here is the same one the web app performs - the bot is just another
 * surface onto the same account, so a user reaches exactly the workspaces, threads
 * and settings they would reach in a browser, and nothing else.
 */

/**
 * Resolve the NexusAI account behind a Telegram chat.
 *
 * Re-read from the database on every interaction rather than cached for the life of
 * the process: a suspended or deleted account has to lose access on its very next
 * message, not at the next restart.
 * @param {string|number} chatId
 * @returns {Promise<{user: import("@prisma/client").users, link: object, workspaceSlug: string|null, threadSlug: string|null, language: string|null}|null>}
 */
async function resolveSession(chatId) {
  const link = await TelegramUser.getByChatId(chatId);
  if (!link || !link.user) return null;

  const user = link.user;
  if (user.suspended) return null;

  let workspaceSlug = null;
  let threadSlug = null;

  if (link.active_workspace_id) {
    const workspace = await Workspace.get({ id: link.active_workspace_id });
    // A workspace the user has since lost access to (or that was deactivated) is
    // dropped here rather than left pointing at content they may not read.
    if (workspace && (await canChatInWorkspace(user, workspace)))
      workspaceSlug = workspace.slug;
  }

  if (workspaceSlug && link.active_thread_id) {
    const thread = await WorkspaceThread.get({ id: link.active_thread_id });
    if (thread && thread.user_id === user.id) threadSlug = thread.slug;
  }

  return {
    user,
    link,
    workspaceSlug,
    threadSlug,
    language: normalizeLanguage(link.response_language),
  };
}

/**
 * Whether a user may hold a conversation in a workspace. Mirrors the web chat
 * route: the workspace must be active and the user must hold `workspace.chat`
 * inside it.
 * @param {import("@prisma/client").users} user
 * @param {import("@prisma/client").workspaces|null} workspace
 * @returns {Promise<boolean>}
 */
async function canChatInWorkspace(user, workspace) {
  if (!user || !workspace) return false;
  if (workspace.active === false) return false;
  return await WorkspaceRole.userCanInWorkspace(
    user,
    workspace.id,
    WS_PERMISSIONS.CHAT
  );
}

/**
 * Whether a user may change a workspace's model - `/model` writes workspace
 * settings, so it needs the same permission the settings screen does.
 * @param {import("@prisma/client").users} user
 * @param {import("@prisma/client").workspaces|null} workspace
 * @returns {Promise<boolean>}
 */
async function canManageWorkspaceLLM(user, workspace) {
  if (!user || !workspace) return false;
  return await WorkspaceRole.userCanAnyInWorkspace(user, workspace.id, [
    WS_PERMISSIONS.SETTINGS_LLM,
    WS_PERMISSIONS.SETTINGS_MANAGE,
  ]);
}

/**
 * Whether a user may create a workspace from the bot.
 * @param {import("@prisma/client").users} user
 * @returns {Promise<boolean>}
 */
async function canCreateWorkspace(user) {
  if (!user) return false;
  return await Role.userCan(user, PERMISSIONS.WORKSPACES_CREATE);
}

/**
 * Every workspace a user may chat in, in the order the web app would list them.
 * @param {import("@prisma/client").users} user
 * @returns {Promise<import("@prisma/client").workspaces[]>}
 */
async function chattableWorkspaces(user) {
  if (!user) return [];
  const workspaces = await Workspace.whereWithUser(user, { active: true });
  const allowed = await Promise.all(
    workspaces.map(async (workspace) =>
      (await canChatInWorkspace(user, workspace)) ? workspace : null
    )
  );
  return allowed.filter(Boolean);
}

/**
 * Load a workspace only if the user may chat in it.
 * @param {import("@prisma/client").users} user
 * @param {{id?: number, slug?: string}} clause
 * @returns {Promise<import("@prisma/client").workspaces|null>}
 */
async function workspaceForUser(user, clause) {
  const workspace = await Workspace.get(clause);
  if (!workspace) return null;
  return (await canChatInWorkspace(user, workspace)) ? workspace : null;
}

/**
 * Load a thread only if it belongs to this user inside the given workspace.
 * Threads are per-account on the web (`/workspace/:slug/threads` filters by
 * user_id) and stay per-account here.
 * @param {import("@prisma/client").users} user
 * @param {import("@prisma/client").workspaces} workspace
 * @param {{id?: number, slug?: string}} clause
 * @returns {Promise<import("@prisma/client").workspace_threads|null>}
 */
async function threadForUser(user, workspace, clause) {
  const thread = await WorkspaceThread.get(clause);
  if (!thread) return null;
  if (thread.workspace_id !== workspace.id) return null;
  if (thread.user_id !== user.id) return null;
  return thread;
}

/**
 * Pick the workspace a freshly linked account should land in - the first one they
 * can chat in, or nothing at all when they are a member of none.
 * @param {import("@prisma/client").users} user
 * @returns {Promise<import("@prisma/client").workspaces|null>}
 */
async function defaultWorkspaceForUser(user) {
  const workspaces = await chattableWorkspaces(user);
  return workspaces[0] || null;
}

/**
 * Re-read a user by id for use inside the chat worker, refusing suspended
 * accounts the same way the session resolver does.
 * @param {number|null} userId
 * @returns {Promise<import("@prisma/client").users|null>}
 */
async function activeUserById(userId) {
  if (!userId) return null;
  const user = await User.get({ id: Number(userId) });
  if (!user || user.suspended) return null;
  return user;
}

module.exports = {
  resolveSession,
  canChatInWorkspace,
  canManageWorkspaceLLM,
  canCreateWorkspace,
  chattableWorkspaces,
  workspaceForUser,
  threadForUser,
  defaultWorkspaceForUser,
  activeUserById,
};
