/**
 * /help - Show all available commands.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleHelp(ctx, chatId) {
  const { BOT_COMMANDS } = require("../index");
  const { translatorFor } = require("../../i18n");
  const t = translatorFor(ctx.getState(chatId));
  const lines = BOT_COMMANDS.map(
    (c) => `/${c.command} - ${t(`command.${c.command}`)}`
  );
  await ctx.bot.sendMessage(
    chatId,
    `${t("help.header")}\n\n${lines.join("\n")}`
  );
}

module.exports = { handleHelp };
