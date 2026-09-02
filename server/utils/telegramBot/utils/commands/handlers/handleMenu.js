const { tabKeyboard, removeTabKeyboard } = require("../../keyboard");
const { translatorFor } = require("../../i18n");

/**
 * /menu - Show the button bar under the message box, or hide it with /menu off.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 * @param {string} [messageText]
 */
async function handleMenu(ctx, chatId, messageText = "") {
  const session = ctx.getState(chatId);
  if (!session) return;
  const t = translatorFor(session);

  const wantsHidden = /^\/menu(?:@\S+)?\s+(off|hide)\s*$/i.test(
    messageText.trim()
  );

  if (wantsHidden) {
    await ctx.bot.sendMessage(chatId, t("menu.hidden"), {
      reply_markup: removeTabKeyboard(),
    });
    return;
  }

  await ctx.bot.sendMessage(chatId, t("menu.shown"), {
    reply_markup: tabKeyboard(session.language),
  });
}

module.exports = { handleMenu };
