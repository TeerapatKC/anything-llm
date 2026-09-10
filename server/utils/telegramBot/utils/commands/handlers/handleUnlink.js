const { TelegramUser } = require("../../../../../models/telegramUser");
const { revokeCodesForUser } = require("../../pairing");
const { linkKeyboard } = require("../../keyboard");
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

  // Back to the link button rather than no bar at all: the chat can still do
  // one thing, and this is it.
  await ctx.bot.sendMessage(chatId, t("unlink.done"), {
    reply_markup: linkKeyboard(session.language),
  });
}

module.exports = { handleUnlink };
