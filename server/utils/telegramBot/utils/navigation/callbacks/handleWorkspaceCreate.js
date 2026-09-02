const { Workspace } = require("../../../../../models/workspace");
const { canCreateWorkspace } = require("../../access");
const { translatorFor } = require("../../i18n");

/**
 * Handle the creation of a new workspace.
 * @param {object} params - The parameters for the function
 * @param {import("../../commands/index").BotContext} params.ctx
 * @param {number} params.chatId
 * @param {{id: string}} params.query - Telegram callback query object
 */
async function handleWorkspaceCreate({ ctx, chatId, query } = {}) {
  const session = ctx.getState(chatId);
  const t = translatorFor(session);
  if (!(await canCreateWorkspace(session.user))) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: t("switch.create_denied"),
    });
    return;
  }

  const wsName = `${session.user.username || "New"}'s Workspace`;
  // Created with the user as its owner, exactly as the web app does, so they are
  // a member of what they just made.
  const { workspace, message: error } = await Workspace.new(
    wsName,
    session.user.id,
    { chatMode: "automatic" }
  );
  if (error || !workspace) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: t("switch.create_failed"),
    });
    return;
  }

  ctx.setState(chatId, {
    workspaceSlug: workspace.slug,
    workspaceId: workspace.id,
    threadSlug: null,
    threadId: null,
  });
  await ctx.bot.answerCallbackQuery(query.id, {
    text: t("thread.switched_toast"),
  });
  await ctx.bot.sendMessage(
    chatId,
    t("switch.created", { workspace: workspace.name })
  );
}

module.exports = { handleWorkspaceCreate };
