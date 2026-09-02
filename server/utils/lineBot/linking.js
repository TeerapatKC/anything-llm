const { User } = require("../../models/user");
const { EventLogs } = require("../../models/eventLogs");
const { LineUser } = require("../../models/lineUser");
const { Workspace } = require("../../models/workspace");
const {
  consumePairingCode,
  checkAttemptAllowance,
  recordFailedAttempt,
  clearAttempts,
  revokeCodesForUser,
} = require("./pairing");
const { translator } = require("./i18n");

/**
 * Binding a LINE chat to a NexusAI account.
 *
 * The instance runs one shared bot, so the chat itself proves nothing about who is
 * typing. The linking code does: it is minted inside the web app for a signed-in
 * user and only lives for a few minutes, so redeeming one in LINE demonstrates
 * control of both the account and the chat. Mirrors telegramBot/utils/linking.js.
 */

/**
 * Text shown to a chat that has not linked yet, whatever it just said. An
 * unlinked chat has told us nothing about itself yet, so this is always in
 * the fallback language.
 */
const LINK_INSTRUCTIONS = translator(null)("link.instructions");

/**
 * Redeem a linking code and bind the chat to the account that minted it.
 *
 * Every failure returns the same `invalid` reason on purpose: telling the sender
 * whether the username or the code was the wrong half would turn a wrong guess
 * into a way of confirming that an account exists.
 * @param {{lineUserId: string, username: string, code: string, lineDisplayName?: string|null}} params
 * @returns {Promise<{user: object|null, workspace: object|null, error: string|null, retryInSeconds?: number}>}
 */
async function linkAccount({
  lineUserId,
  username,
  code,
  lineDisplayName = null,
}) {
  const allowance = checkAttemptAllowance(lineUserId);
  if (!allowance.allowed)
    return {
      user: null,
      workspace: null,
      error: "rate_limited",
      retryInSeconds: allowance.retryInSeconds,
    };

  const { userId, error } = consumePairingCode({ code, username });
  if (error || !userId) {
    recordFailedAttempt(lineUserId);
    return { user: null, workspace: null, error: "invalid" };
  }

  const user = await User.get({ id: userId });
  if (!user || user.suspended) {
    recordFailedAttempt(lineUserId);
    return { user: null, workspace: null, error: "invalid" };
  }

  const { error: linkError } = await LineUser.link({
    lineUserId,
    userId: user.id,
    lineDisplayName,
  });
  if (linkError) return { user: null, workspace: null, error: "failed" };

  clearAttempts(lineUserId);
  revokeCodesForUser(user.id);
  await EventLogs.logEvent(
    "line_user_linked",
    { lineUserId, lineDisplayName },
    user.id
  );

  // Land the chat in a workspace it may actually use, so the first message after
  // linking works without a /workspace switch. A user who belongs to none stays
  // unset and is told to ask for access.
  const accessible = await Workspace.whereWithUser(user);
  const workspace = accessible[0] || null;
  if (workspace)
    await LineUser.setActiveWorkspace(lineUserId, workspace.id);

  return { user, workspace, error: null };
}

/**
 * The message shown once a chat is linked. Also in the fallback language - a
 * chat only gets an explicit reply-language choice after it has linked, and
 * this fires at the moment linking completes.
 * @param {import("@prisma/client").users} user
 * @param {import("@prisma/client").workspaces|null} workspace
 * @returns {string}
 */
function linkSuccessMessage(user, workspace) {
  const t = translator(null);
  const lines = [
    t("link.success", { username: user.username }),
    workspace
      ? t("link.success_workspace", { workspace: workspace.name })
      : t("link.success_no_workspace"),
  ];
  return lines.join("\n");
}

module.exports = {
  LINK_INSTRUCTIONS,
  linkAccount,
  linkSuccessMessage,
};
