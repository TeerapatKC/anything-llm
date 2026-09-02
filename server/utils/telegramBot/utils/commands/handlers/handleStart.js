const { Workspace } = require("../../../../../models/workspace");
const { tabKeyboard } = require("../../keyboard");
const { translatorFor } = require("../../i18n");

/**
 * /start - Welcome message with current workspace info.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleStart(ctx, chatId) {
  const session = ctx.getState(chatId);
  if (!session) return;
  const t = translatorFor(session);

  const workspace = session.workspaceSlug
    ? await Workspace.get({ slug: session.workspaceSlug })
    : null;

  if (!workspace) {
    await ctx.bot.sendMessage(
      chatId,
      t("start.welcome_no_workspace", { username: session.user.username }),
      { reply_markup: tabKeyboard(session.language) }
    );
    return;
  }

  await ctx.bot.sendMessage(
    chatId,
    t("start.welcome", {
      username: session.user.username,
      workspace: workspace.name,
    }),
    { reply_markup: tabKeyboard(session.language) }
  );
}

module.exports = { handleStart };
