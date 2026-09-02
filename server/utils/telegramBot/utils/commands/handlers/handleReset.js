const { Workspace } = require("../../../../../models/workspace");
const { WorkspaceThread } = require("../../../../../models/workspaceThread");
const { WorkspaceChats } = require("../../../../../models/workspaceChats");
const { translatorFor } = require("../../i18n");

/**
 * /reset - Clears LLM chat history context.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleReset(ctx, chatId) {
  const session = ctx.getState(chatId);
  if (!session) return;

  const workspace = session.workspaceSlug
    ? await Workspace.get({ slug: session.workspaceSlug })
    : null;
  if (!workspace) return;

  const thread = session.threadSlug
    ? await WorkspaceThread.get({ slug: session.threadSlug })
    : null;

  await WorkspaceChats.markThreadHistoryInvalidV2({
    workspaceId: workspace.id,
    user_id: session.user.id,
    thread_id: thread?.id || null,
    api_session_id: null,
  });

  await ctx.bot.sendMessage(chatId, translatorFor(session)("reset.done"));
}

module.exports = { handleReset };
