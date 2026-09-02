/**
 * /abort - Kill any ongoing LLM worker for this chat.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleAbort(ctx, chatId) {
  const { TelegramBotService } = require("../../../index");
  const { translatorFor } = require("../../i18n");
  const t = translatorFor(ctx.getState(chatId));
  const service = new TelegramBotService();
  const aborted = service.abortChat(chatId);

  await ctx.bot.sendMessage(chatId, t(aborted ? "abort.done" : "abort.none"));
}

module.exports = { handleAbort };
