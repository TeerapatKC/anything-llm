const {
  showWorkspaceList,
} = require("../../commands/handlers/handleWorkspaces");
const { workspaceForUser } = require("../../access");
const { translatorFor } = require("../../i18n");

/**
 * Handle a tap on a workspace in the /workspaces list - switches straight to it
 * and re-renders the list in place so the active marker moves.
 * @param {object} params
 * @param {import("../../commands/index").BotContext} params.ctx
 * @param {number} params.chatId
 * @param {{id: string}} params.query
 * @param {number} params.messageId
 * @param {string} params.data
 */
async function handleWorkspaceQuickSwitch({
  ctx,
  chatId,
  query,
  messageId,
  data,
} = {}) {
  const workspaceId = parseInt(data.slice(4), 10);
  const session = ctx.getState(chatId);
  const t = translatorFor(session);

  // Callback data is attacker-controlled - a hand-typed id must not open a
  // workspace this account cannot chat in.
  const workspace = await workspaceForUser(session.user, { id: workspaceId });
  if (!workspace) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: t("workspaces.not_available"),
    });
    return;
  }

  if (workspace.slug === session.workspaceSlug) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: t("workspaces.already_in", { workspace: workspace.name }),
    });
    return;
  }

  // Lands in the workspace's default thread; /switch is the way to pick one.
  ctx.setState(chatId, {
    workspaceSlug: workspace.slug,
    workspaceId: workspace.id,
    threadSlug: null,
    threadId: null,
  });

  await ctx.bot.answerCallbackQuery(query.id, {
    text: t("workspaces.switched_toast", { workspace: workspace.name }),
  });
  await showWorkspaceList(
    ctx,
    chatId,
    0,
    messageId,
    t("workspaces.switched", { workspace: workspace.name })
  );
}

module.exports = { handleWorkspaceQuickSwitch };
