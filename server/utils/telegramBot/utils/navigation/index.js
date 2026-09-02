const { resolveCallbackHandler } = require("./callbacks");
const { translatorFor } = require("../i18n");

/**
 * Handle inline keyboard callback queries (workspace/thread selection, tool approval, etc).
 * @param {BotContext} ctx
 * @param {object} query - Telegram callback query object
 * @param {object} [options={}] - Optional dependencies that specific handlers may need
 */
async function handleKeyboardQueryCallback(ctx, query, options = {}) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  // Answering a callback query is best-effort: Telegram rejects one that is more
  // than a minute old, and a failure here must not bury the error that caused it.
  const answer = async (text) => {
    try {
      await ctx.bot.answerCallbackQuery(query.id, { text });
    } catch {
      // Query expired or was already answered
    }
  };

  // The session was refreshed before this handler ran, so a keyboard left over
  // from before a link was revoked is dead the moment it is tapped.
  const t = translatorFor(ctx.getState(chatId));
  if (!ctx.getState(chatId)) {
    await answer(t("callback.not_linked"));
    return;
  }

  try {
    const handler = resolveCallbackHandler(data);
    if (!handler) throw new Error(`Callback handler not found: ${data}`);
    await handler({ ctx, chatId, query, messageId, data, ...options });
  } catch (error) {
    ctx.log("Callback error:", error.message);
    await answer(t("common.callback_error"));
  }
}

module.exports = {
  handleKeyboardQueryCallback,
};
