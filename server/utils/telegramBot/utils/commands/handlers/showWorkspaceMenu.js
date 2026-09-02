const { chattableWorkspaces, canCreateWorkspace } = require("../../access");
const { asMessageId } = require("../../index");
const { translatorFor } = require("../../i18n");
const WORKSPACES_PER_PAGE = 8;

/**
 * Show the workspace selection inline keyboard with pagination.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 * @param {number} page - Current page (0-indexed)
 * @param {number|null} messageId - If provided, edits existing message instead of sending new one
 */
async function showWorkspaceMenu(ctx, chatId, page = 0, messageId = null) {
  const pageNum = typeof page === "number" && !isNaN(page) ? page : 0;
  // This slot means "edit the message with this id" - anything that is not an
  // id (a command invocation passing its own arguments through) sends instead.
  const editId = asMessageId(messageId);
  const session = ctx.getState(chatId);
  if (!session) return;
  const t = translatorFor(session);

  // Only the workspaces this account may chat in - the same list the web app
  // would show them, never every workspace on the instance.
  const workspaces = await chattableWorkspaces(session.user);
  if (!workspaces.length) {
    const mayCreate = await canCreateWorkspace(session.user);
    await ctx.bot.sendMessage(
      chatId,
      mayCreate ? t("switch.none_can_create") : t("workspaces.none"),
      mayCreate
        ? {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: t("switch.create_button"),
                    callback_data: "ws-create",
                  },
                ],
              ],
            },
          }
        : {}
    );
    return;
  }

  const state = session;
  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    const aIsActive = a.slug === state.workspaceSlug;
    const bIsActive = b.slug === state.workspaceSlug;
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    return 0;
  });

  const totalPages = Math.ceil(sortedWorkspaces.length / WORKSPACES_PER_PAGE);
  const safePage = Math.max(0, Math.min(pageNum, totalPages - 1));
  const startIdx = safePage * WORKSPACES_PER_PAGE;
  const pageWorkspaces = sortedWorkspaces.slice(
    startIdx,
    startIdx + WORKSPACES_PER_PAGE
  );

  const buttons = pageWorkspaces.map((ws) => {
    const isCurrent = ws.slug === state.workspaceSlug;
    return [
      {
        text: isCurrent ? `🟢 ${ws.name} (${t("common.active")})` : ws.name,
        callback_data: `ws:${ws.id}`,
      },
    ];
  });

  const navRow = [];
  if (safePage > 0) {
    navRow.push({
      text: t("common.prev"),
      callback_data: `wspg:${safePage - 1}`,
    });
  }
  if (safePage < totalPages - 1) {
    navRow.push({
      text: t("common.next"),
      callback_data: `wspg:${safePage + 1}`,
    });
  }
  if (navRow.length) buttons.push(navRow);

  const text =
    totalPages > 1
      ? t("switch.select_paged", {
          page: safePage + 1,
          pages: totalPages,
          count: sortedWorkspaces.length,
        })
      : t("switch.select");
  const opts = {
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

module.exports = { showWorkspaceMenu };
