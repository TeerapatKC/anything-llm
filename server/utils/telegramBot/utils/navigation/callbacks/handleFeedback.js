const { WorkspaceChats } = require("../../../../../models/workspaceChats");
const { feedbackKeyboard } = require("../../feedback");
const { translatorFor } = require("../../i18n");

/**
 * Handle a thumbs up/down tap under an answer.
 * @param {object} params
 * @param {import("../../commands/index").BotContext} params.ctx
 * @param {number} params.chatId
 * @param {{id: string}} params.query
 * @param {number} params.messageId
 * @param {string} params.data
 */
async function handleFeedback({ ctx, chatId, query, messageId, data } = {}) {
  const [, rawId, rawScore] = data.split(":");
  const chatRecordId = parseInt(rawId, 10);
  const session = ctx.getState(chatId);
  const t = translatorFor(session);

  // Callback data is attacker-controlled, so the row has to belong to the
  // account that tapped - the same rule the web endpoint applies.
  const chat = await WorkspaceChats.get({
    id: chatRecordId,
    user_id: session.user.id,
  });
  if (!chat) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: t("feedback.not_available"),
    });
    return;
  }

  // Tapping the score already recorded clears it, as it does on the web.
  const tapped = rawScore === "1";
  const cleared = chat.feedbackScore === tapped;
  const score = cleared ? null : tapped;

  await WorkspaceChats.updateFeedbackScore(
    chatRecordId,
    score === null ? null : score ? 1 : 0
  );

  await ctx.bot.answerCallbackQuery(query.id, {
    text: cleared
      ? t("feedback.cleared")
      : tapped
        ? t("feedback.thanks_up")
        : t("feedback.thanks_down"),
  });

  // A thumbs-down is the one worth asking about; the next thing they type is
  // treated as the reason.
  if (score === false) {
    ctx.awaitFeedbackReason(chatId, chatRecordId);
    await ctx.bot.sendMessage(chatId, t("feedback.ask_reason"));
  } else {
    ctx.cancelFeedbackReason(chatId);
  }

  try {
    await ctx.bot.editMessageReplyMarkup(
      feedbackKeyboard(chatRecordId, score, session.language),
      { chat_id: chatId, message_id: messageId }
    );
  } catch {
    // The toast already told them it registered; a stale keyboard is not worth
    // an error message.
  }
}

module.exports = { handleFeedback };
