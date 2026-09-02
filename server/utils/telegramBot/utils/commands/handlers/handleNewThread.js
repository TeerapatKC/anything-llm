const { WorkspaceThread } = require("../../../../../models/workspaceThread");
const { WorkspaceRole } = require("../../../../../models/workspaceRole");
const {
  WORKSPACE_PERMISSIONS: WS_PERMISSIONS,
} = require("../../../../permissions");
const { Workspace } = require("../../../../../models/workspace");
const { translatorFor } = require("../../i18n");

/**
 * /new - Creates a new thread in the current workspace, owned by the account this
 * chat is linked to.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleNewThread(ctx, chatId) {
  const session = ctx.getState(chatId);
  if (!session) return;
  const t = translatorFor(session);

  const workspace = session.workspaceSlug
    ? await Workspace.get({ slug: session.workspaceSlug })
    : null;
  if (!workspace) {
    await ctx.bot.sendMessage(chatId, t("thread.no_workspace"));
    return;
  }

  const canCreate = await WorkspaceRole.userCanAnyInWorkspace(
    session.user,
    workspace.id,
    [WS_PERMISSIONS.THREADS_CREATE, WS_PERMISSIONS.THREADS_MANAGE]
  );
  if (!canCreate) {
    await ctx.bot.sendMessage(
      chatId,
      t("thread.denied", { workspace: workspace.name })
    );
    return;
  }

  const { thread, message: error } = await WorkspaceThread.new(
    workspace,
    session.user.id,
    { name: "Telegram Thread" }
  );

  if (error || !thread) {
    await ctx.bot.sendMessage(chatId, t("thread.create_failed"));
    return;
  }

  ctx.setState(chatId, { threadSlug: thread.slug, threadId: thread.id });
  await ctx.bot.sendMessage(
    chatId,
    t("thread.created", { workspace: workspace.name })
  );
}

module.exports = { handleNewThread };
