const { workspaceForUser, threadForUser } = require("../../access");
const { translatorFor } = require("../../i18n");

/**
 * Handle thread selection - sets active workspace and thread.
 * @param {object} params
 * @param {import("../../commands/index").BotContext} params.ctx
 * @param {number} params.chatId
 * @param {{id: string}} params.query
 * @param {string} params.data
 */
async function handleThreadSelect({ ctx, chatId, query, data } = {}) {
  const parts = data.slice(3).split(":");
  const workspaceId = parseInt(parts[0], 10);
  const threadId = parseInt(parts[1], 10);
  const session = ctx.getState(chatId);
  const t = translatorFor(session);

  const workspace = await workspaceForUser(session.user, { id: workspaceId });
  if (!workspace) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: t("workspaces.not_available"),
    });
    return;
  }

  let threadSlug = null;
  let threadName = t("common.default_thread");
  if (threadId !== 0) {
    const thread = await threadForUser(session.user, workspace, {
      id: threadId,
    });
    if (!thread) {
      await ctx.bot.answerCallbackQuery(query.id, {
        text: t("thread.not_available"),
      });
      return;
    }
    threadSlug = thread.slug;
    threadName = thread.name;
  }

  ctx.setState(chatId, {
    workspaceSlug: workspace.slug,
    workspaceId: workspace.id,
    threadSlug,
    threadId: threadId === 0 ? null : threadId,
  });
  await ctx.bot.answerCallbackQuery(query.id, {
    text: t("thread.switched_toast"),
  });
  await ctx.bot.sendMessage(
    chatId,
    t("thread.switched", { workspace: workspace.name, thread: threadName })
  );
}

module.exports = { handleThreadSelect };
