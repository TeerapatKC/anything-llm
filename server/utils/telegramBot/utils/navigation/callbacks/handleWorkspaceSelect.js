const { showThreadMenu } = require("../../commands/handlers/showThreadMenu");
const { workspaceForUser } = require("../../access");
const { translatorFor } = require("../../i18n");

/**
 * Handle workspace selection - shows thread menu for selected workspace.
 * @param {object} params
 * @param {import("../../commands/index").BotContext} params.ctx
 * @param {number} params.chatId
 * @param {{id: string}} params.query
 * @param {number} params.messageId
 * @param {string} params.data
 */
async function handleWorkspaceSelect({
  ctx,
  chatId,
  query,
  messageId,
  data,
} = {}) {
  const workspaceId = parseInt(data.slice(3), 10);
  const session = ctx.getState(chatId);

  // Callback data is attacker-controlled - a workspace id typed by hand must not
  // open a workspace this account cannot chat in.
  const workspace = await workspaceForUser(session.user, { id: workspaceId });
  if (!workspace) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: translatorFor(session)("workspaces.not_available"),
    });
    return;
  }

  await showThreadMenu(ctx, chatId, workspace.id, 0, messageId);
  await ctx.bot.answerCallbackQuery(query.id);
}

module.exports = { handleWorkspaceSelect };
