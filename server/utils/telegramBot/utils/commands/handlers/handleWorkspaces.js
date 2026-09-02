const { chattableWorkspaces } = require("../../access");
const { asMessageId } = require("../../index");
const { escapeHTML } = require("../../format");
const { translatorFor } = require("../../i18n");

const WORKSPACES_PER_PAGE = 8;

/**
 * Show the workspaces this account may chat in, one tappable button each.
 *
 * Unlike /switch, which walks you into the thread menu, a tap here switches
 * straight to the workspace's default thread - the common case is "put me in
 * that workspace", not "pick a thread inside it".
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 * @param {number} page - Current page (0-indexed)
 * @param {number|null} messageId - If provided, edits that message in place
 * @param {string|null} notice - Line to put above the list, e.g. after a switch
 */
async function showWorkspaceList(
  ctx,
  chatId,
  page = 0,
  messageId = null,
  notice = null
) {
  const pageNum = typeof page === "number" && !isNaN(page) ? page : 0;
  const editId = asMessageId(messageId);
  const session = ctx.getState(chatId);
  if (!session) return;
  const t = translatorFor(session);

  const workspaces = await chattableWorkspaces(session.user);
  if (!workspaces.length) {
    await ctx.bot.sendMessage(chatId, t("workspaces.none"));
    return;
  }

  const totalPages = Math.ceil(workspaces.length / WORKSPACES_PER_PAGE);
  const safePage = Math.max(0, Math.min(pageNum, totalPages - 1));
  const startIdx = safePage * WORKSPACES_PER_PAGE;
  const pageWorkspaces = workspaces.slice(
    startIdx,
    startIdx + WORKSPACES_PER_PAGE
  );

  const lines = pageWorkspaces.map((workspace) => {
    const name = escapeHTML(workspace.name);
    return workspace.slug === session.workspaceSlug
      ? `🟢 <b>${name}</b> (${t("common.active")})`
      : `• ${name}`;
  });

  const buttons = pageWorkspaces.map((workspace) => [
    {
      text:
        workspace.slug === session.workspaceSlug
          ? `🟢 ${workspace.name} (${t("common.active")})`
          : workspace.name,
      callback_data: `wsq:${workspace.id}`,
    },
  ]);

  const navRow = [];
  if (safePage > 0)
    navRow.push({
      text: t("common.prev"),
      callback_data: `wsqpg:${safePage - 1}`,
    });
  if (safePage < totalPages - 1)
    navRow.push({
      text: t("common.next"),
      callback_data: `wsqpg:${safePage + 1}`,
    });
  if (navRow.length) buttons.push(navRow);

  const header =
    totalPages > 1
      ? t("workspaces.header_paged", {
          page: safePage + 1,
          pages: totalPages,
          count: workspaces.length,
        })
      : t("workspaces.header", { count: workspaces.length });

  const text = [
    ...(notice ? [notice, ""] : []),
    header,
    "",
    lines.join("\n"),
    "",
    t("workspaces.footer"),
  ].join("\n");

  const opts = {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons },
  };

  if (editId) {
    await ctx.bot.editMessageText(text, {
      chat_id: chatId,
      message_id: editId,
      ...opts,
    });
  } else {
    await ctx.bot.sendMessage(chatId, text, opts);
  }
}

/**
 * /workspaces - List the workspaces this account may chat in.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleWorkspaces(ctx, chatId) {
  await showWorkspaceList(ctx, chatId, 0, null);
}

module.exports = { handleWorkspaces, showWorkspaceList, WORKSPACES_PER_PAGE };
