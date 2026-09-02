const { showLanguageMenu } = require("../../commands/handlers/handleLanguage");
const { normalizeLanguage, languageFor } = require("../../language");
const { translator } = require("../../i18n");

/**
 * Handle a tap in the reply-language menu.
 * @param {object} params
 * @param {import("../../commands/index").BotContext} params.ctx
 * @param {number} params.chatId
 * @param {{id: string}} params.query
 * @param {number} params.messageId
 * @param {string} params.data
 */
async function handleLanguageSelect({
  ctx,
  chatId,
  query,
  messageId,
  data,
} = {}) {
  const raw = data.slice(5);
  // Anything unrecognised - including the literal "auto" - normalises to null,
  // which is the auto setting.
  const code = normalizeLanguage(raw);
  const language = languageFor(code);
  const session = ctx.getState(chatId);

  if (session.language === code) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: translator(session.language)("language.already", {
        language: language.label,
      }),
    });
    return;
  }

  ctx.setState(chatId, { language: code });

  // Confirmations are written in the language just chosen, not the one being
  // left behind - it is the first thing that proves the switch took effect.
  const t = translator(code);
  await ctx.bot.answerCallbackQuery(query.id, {
    text: t("language.changed_toast", { language: language.label }),
  });
  await showLanguageMenu(
    ctx,
    chatId,
    "",
    messageId,
    t("language.changed", { language: language.label })
  );
}

module.exports = { handleLanguageSelect };
