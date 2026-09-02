const {
  showWorkspaceList,
} = require("../../commands/handlers/handleWorkspaces");

/**
 * Handle paging through the /workspaces list.
 * @param {object} params
 * @param {import("../../commands/index").BotContext} params.ctx
 * @param {number} params.chatId
 * @param {{id: string}} params.query
 * @param {number} params.messageId
 * @param {string} params.data
 */
async function handleWorkspaceListPagination({
  ctx,
  chatId,
  query,
  messageId,
  data,
} = {}) {
  const page = parseInt(data.slice(6), 10);
  await showWorkspaceList(ctx, chatId, page, messageId);
  await ctx.bot.answerCallbackQuery(query.id);
}

module.exports = { handleWorkspaceListPagination };
