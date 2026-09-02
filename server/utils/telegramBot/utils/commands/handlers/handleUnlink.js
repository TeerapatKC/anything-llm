const { TelegramUser } = require("../../../../../models/telegramUser");
const { revokeCodesForUser } = require("../../pairing");
const { removeTabKeyboard } = require("../../keyboard");
const { translatorFor } = require("../../i18n");

/**
 * /unlink - Detach this chat from the NexusAI account it is bound to.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleUnlink(ctx, chatId) {
  const session = ctx.getState(chatId);
  if (!session) return;
  const t = translatorFor(session);

  await TelegramUser.unlinkByChatId(chatId);
  // Any code minted moments ago would otherwise re-link the account they just
  // detached, so it goes with the link.
  revokeCodesForUser(session.user.id);
  ctx.forgetSession(chatId);

  await ctx.bot.sendMessage(chatId, t("unlink.done"), {
    reply_markup: removeTabKeyboard(),
  });
}

module.exports = { handleUnlink };
