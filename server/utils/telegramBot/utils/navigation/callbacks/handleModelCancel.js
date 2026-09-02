/**
 * Handle model selection cancellation.
 * @param {object} params
 * @param {import("../../commands/index").BotContext} params.ctx
 * @param {number} params.chatId
 * @param {{id: string}} params.query
 * @param {number} params.messageId
 */
async function handleModelCancel({ ctx, chatId, query, messageId } = {}) {
  const { translatorFor } = require("../../i18n");
  await ctx.bot.deleteMessage(chatId, messageId);
  await ctx.bot.answerCallbackQuery(query.id, {
    text: translatorFor(ctx.getState(chatId))("model.cancelled"),
  });
}

module.exports = { handleModelCancel };
