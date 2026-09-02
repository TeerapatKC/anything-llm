const { t } = require("./i18n");

/**
 * Thumbs up/down on an answer the bot sent.
 *
 * The score lands in the same `workspace_chats.feedbackScore` column the web UI
 * writes, so a rating given in Telegram and one given in a browser are the same
 * record - there is one place to read feedback, not two.
 */

/**
 * The inline keyboard shown under an answer.
 * @param {number} chatRecordId - The workspace_chats row this rates.
 * @param {boolean|null} score - What is already recorded, so the tap that set it reads as set.
 * @param {string|null} lang
 * @returns {object}
 */
function feedbackKeyboard(chatRecordId, score = null, lang = null) {
  const mark = (selected, label) => (selected ? `${label} ✓` : label);
  return {
    inline_keyboard: [
      [
        {
          text: mark(score === true, t(lang, "feedback.up")),
          callback_data: `fb:${chatRecordId}:1`,
        },
        {
          text: mark(score === false, t(lang, "feedback.down")),
          callback_data: `fb:${chatRecordId}:0`,
        },
      ],
    ],
  };
}

/**
 * Attach the keyboard to a message that has already been sent.
 *
 * Only the markup is edited: the answer text was formatted while streaming and
 * re-sending it risks a parse failure on something that already rendered fine.
 * Failure is swallowed - a missing pair of buttons must never look like a failed
 * answer.
 * @param {import('node-telegram-bot-api')} bot
 * @param {number} chatId - The Telegram chat.
 * @param {number|null} messageId - The answer message.
 * @param {number|null} chatRecordId
 * @param {string|null} lang
 */
async function attachFeedbackButtons(
  bot,
  chatId,
  messageId,
  chatRecordId,
  lang = null
) {
  if (!messageId || !chatRecordId) return;
  try {
    await bot.editMessageReplyMarkup(
      feedbackKeyboard(chatRecordId, null, lang),
      {
        chat_id: chatId,
        message_id: messageId,
      }
    );
  } catch {
    // The message may have been deleted, or Telegram may refuse an edit that
    // changes nothing. Neither is worth reporting to the user.
  }
}

module.exports = { feedbackKeyboard, attachFeedbackButtons };
