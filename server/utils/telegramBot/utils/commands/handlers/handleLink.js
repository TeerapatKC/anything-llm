const { linkAccount, linkSuccessMessage } = require("../../linking");
const { tabKeyboard } = require("../../keyboard");
const { translatorFor } = require("../../i18n");

/**
 * /link &lt;username&gt; &lt;code&gt; - Bind this chat to a NexusAI account.
 * The only command an unlinked chat may run.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 * @param {string} [messageText]
 * @param {object} [msg] - The raw Telegram message, used for the sender's handle
 */
async function handleLink(ctx, chatId, messageText = "", msg = null) {
  const session = ctx.getState(chatId);
  if (session) {
    await ctx.bot.sendMessage(
      chatId,
      translatorFor(session)("link.already_linked", {
        username: session.user.username,
      })
    );
    return;
  }

  const match = messageText
    .trim()
    .match(/^\/link(?:@\S+)?\s+(\S+)\s+(\d{6})\s*$/i);
  // An unlinked chat has told us nothing about itself yet, so everything before
  // a successful link is in the fallback language.
  const t = translatorFor(null);
  if (!match) {
    await ctx.bot.sendMessage(chatId, t("link.usage"), { parse_mode: "HTML" });
    return;
  }

  const [, username, code] = match;
  const { user, workspace, error, retryInSeconds } = await linkAccount({
    chatId,
    username,
    code,
    telegramUsername: msg?.from?.username || null,
    telegramFirstName: msg?.from?.first_name || null,
  });

  if (error === "rate_limited") {
    await ctx.bot.sendMessage(
      chatId,
      t("link.rate_limited", { minutes: Math.ceil(retryInSeconds / 60) })
    );
    return;
  }

  if (error) {
    await ctx.bot.sendMessage(chatId, t("link.invalid"));
    return;
  }

  const linked = await ctx.loadSession(chatId);
  await ctx.bot.sendMessage(
    chatId,
    linkSuccessMessage(user, workspace, linked?.language),
    {
      parse_mode: "HTML",
      reply_markup: tabKeyboard(linked?.language),
    }
  );
}

module.exports = { handleLink };
