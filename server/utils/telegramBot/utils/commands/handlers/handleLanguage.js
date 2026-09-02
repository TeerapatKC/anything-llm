const { RESPONSE_LANGUAGES, languageFor } = require("../../language");
const { asMessageId } = require("../../index");
const { translatorFor } = require("../../i18n");

/**
 * Show the reply-language menu.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 * @param {string} [_messageText]
 * @param {number|null} [messageId] - If provided, edits that message in place
 * @param {string|null} [notice] - Line to put above the menu, e.g. after a change
 */
async function showLanguageMenu(
  ctx,
  chatId,
  _messageText = "",
  messageId = null,
  notice = null
) {
  const session = ctx.getState(chatId);
  if (!session) return;

  const editId = asMessageId(messageId);
  const t = translatorFor(session);
  const current = languageFor(session.language);

  const buttons = RESPONSE_LANGUAGES.map((language) => [
    {
      text:
        language.code === current.code
          ? `🟢 ${language.label} (${t("language.current_suffix")})`
          : language.label,
      // "auto" rather than an empty segment so the callback data stays readable.
      callback_data: `lang:${language.code || "auto"}`,
    },
  ]);

  const text = [
    ...(notice ? [notice, ""] : []),
    t("language.title"),
    "",
    t("language.current", { language: current.label }),
    "",
    t("language.note"),
  ].join("\n");

  const opts = {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons },
  };

  if (editId) {
    await ctx.bot.editMessageText(text, {
      chat_id: chatId,
      message_id: editId,
      ...opts,
    });
  } else {
    await ctx.bot.sendMessage(chatId, text, opts);
  }
}

module.exports = { showLanguageMenu };
