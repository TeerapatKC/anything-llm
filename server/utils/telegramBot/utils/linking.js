const { User } = require("../../../models/user");
const { EventLogs } = require("../../../models/eventLogs");
const { TelegramUser } = require("../../../models/telegramUser");
const {
  consumePairingCode,
  checkAttemptAllowance,
  recordFailedAttempt,
  clearAttempts,
  revokeCodesForUser,
} = require("./pairing");
const { defaultWorkspaceForUser } = require("./access");
const { escapeHTML } = require("./format");
const { translator } = require("./i18n");

/**
 * Binding a Telegram chat to a NexusAI account.
 *
 * The instance runs one shared bot, so the chat itself proves nothing about who is
 * typing. The linking code does: it is minted inside the web app for a signed-in
 * user and only lives for a few minutes, so redeeming one in Telegram demonstrates
 * control of both the account and the chat.
 */

/**
 * Tell an unlinked chat how to get started. This is the only thing the bot will
 * say to a chat it does not recognise - no workspace names, no user names, nothing
 * that would tell a stranger what this instance holds.
 * @param {import('node-telegram-bot-api')} bot
 * @param {object} msg - Telegram message object
 */
async function sendLinkInstructions(bot, msg) {
  const text = [
    "<b>This bot is not linked to your account yet.</b>",
    "",
    "1. Sign in to NexusAI in your browser",
    "2. Open your account settings and start the Telegram connection",
    "3. Send the code you are shown here:",
    "",
    "<code>/link your-username 123456</code>",
    "",
    "The code expires after 5 minutes. Ask for a new one if it runs out.",
  ].join("\n");

  try {
    await bot.sendMessage(msg.chat.id, text, { parse_mode: "HTML" });
  } catch {
    // User may have blocked the bot
  }
}

/**
 * Redeem a linking code and bind the chat to the account that minted it.
 *
 * Every failure returns the same `invalid` reason on purpose: telling the sender
 * whether the username or the code was the wrong half would turn a wrong guess
 * into a way of confirming that an account exists.
 * @param {{chatId: number|string, username: string, code: string, telegramUsername?: string|null, telegramFirstName?: string|null}} params
 * @returns {Promise<{user: object|null, workspace: object|null, error: string|null, retryInSeconds?: number}>}
 */
async function linkAccount({
  chatId,
  username,
  code,
  telegramUsername = null,
  telegramFirstName = null,
}) {
  const allowance = checkAttemptAllowance(chatId);
  if (!allowance.allowed)
    return {
      user: null,
      workspace: null,
      error: "rate_limited",
      retryInSeconds: allowance.retryInSeconds,
    };

  const { userId, error } = consumePairingCode({ code, username });
  if (error || !userId) {
    recordFailedAttempt(chatId);
    return { user: null, workspace: null, error: "invalid" };
  }

  const user = await User.get({ id: userId });
  if (!user || user.suspended) {
    recordFailedAttempt(chatId);
    return { user: null, workspace: null, error: "invalid" };
  }

  const { error: linkError } = await TelegramUser.link({
    chatId,
    userId: user.id,
    telegramUsername,
    telegramFirstName,
  });
  if (linkError) return { user: null, workspace: null, error: "failed" };

  clearAttempts(chatId);
  revokeCodesForUser(user.id);
  await EventLogs.logEvent(
    "telegram_user_linked",
    { chatId: String(chatId), telegramUsername },
    user.id
  );

  // Land the chat in a workspace it may actually use, so the first message after
  // linking works without a /switch. A user who belongs to none stays unset and is
  // told to ask for access.
  const workspace = await defaultWorkspaceForUser(user);
  if (workspace)
    await TelegramUser.setActiveState(chatId, { workspaceId: workspace.id });

  return { user, workspace, error: null };
}

/**
 * The message shown once a chat is linked.
 * @param {import("@prisma/client").users} user
 * @param {import("@prisma/client").workspaces|null} workspace
 * @param {string|null} lang - The chat's reply language, if it already has one.
 * @returns {string}
 */
function linkSuccessMessage(user, workspace, lang = null) {
  const t = translator(lang);
  const lines = [
    t("link.success", { username: escapeHTML(user.username || "") }),
    "",
    workspace
      ? t("link.success_workspace", { workspace: escapeHTML(workspace.name) })
      : t("link.success_no_workspace"),
  ];

  return lines.join("\n");
}

module.exports = {
  sendLinkInstructions,
  linkAccount,
  linkSuccessMessage,
};
