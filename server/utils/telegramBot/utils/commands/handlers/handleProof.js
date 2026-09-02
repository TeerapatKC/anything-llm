const { Workspace } = require("../../../../../models/workspace");
const { WorkspaceThread } = require("../../../../../models/workspaceThread");
const { WorkspaceChats } = require("../../../../../models/workspaceChats");
const { asMessageId } = require("../../index");
const { translatorFor } = require("../../i18n");

const SOURCES_PER_PAGE = 6;

/**
 * Check if a source is a web source (identified by link:// prefix in chunkSource).
 * @param {object} source
 * @returns {boolean}
 */
function isWebSource(source) {
  return source?.chunkSource?.startsWith("link://");
}

/**
 * Get a display title for a source.
 * @param {object} source
 * @param {number} index
 * @returns {string}
 */
function getSourceTitle(source, index) {
  if (source.title) return source.title;
  if (source.id) return source.id;
  return `Source ${index + 1}`;
}

/**
 * Truncate text to a maximum length.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncateText(text, maxLength = 30) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Get the last assistant message for the current user's workspace/thread.
 * @param {number} workspaceId
 * @param {number|null} threadId
 * @param {number} userId
 * @returns {Promise<{sources: object[], text: string}|null>}
 */
async function getLastAssistantMessage(workspaceId, threadId, userId) {
  const chat = await WorkspaceChats.get(
    {
      workspaceId,
      user_id: userId,
      thread_id: threadId || null,
      api_session_id: null,
      include: true,
    },
    1,
    { id: "desc" }
  );

  if (!chat) return null;

  try {
    const response = JSON.parse(chat.response);
    return {
      sources: response.sources || [],
      text: response.text || "",
    };
  } catch {
    return null;
  }
}

/**
 * Build the sources menu with pagination.
 * @param {object[]} sources
 * @param {number} page
 * @returns {{text: string, buttons: object[][]}}
 */
function buildSourcesMenu(sources, page = 0, t) {
  const totalPages = Math.ceil(sources.length / SOURCES_PER_PAGE);
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const startIdx = safePage * SOURCES_PER_PAGE;
  const pageSources = sources.slice(startIdx, startIdx + SOURCES_PER_PAGE);

  const buttons = pageSources.map((source, idx) => {
    const globalIdx = startIdx + idx;
    const isWeb = isWebSource(source);
    const emoji = isWeb ? "🌐" : "📄";
    const title = truncateText(getSourceTitle(source, globalIdx), 28);
    return [
      {
        text: `${emoji} ${title}`,
        callback_data: `src:${globalIdx}`,
      },
    ];
  });

  const navRow = [];
  if (safePage > 0) {
    navRow.push({
      text: t("common.prev"),
      callback_data: `srcpg:${safePage - 1}`,
    });
  }
  if (safePage < totalPages - 1) {
    navRow.push({
      text: t("common.next"),
      callback_data: `srcpg:${safePage + 1}`,
    });
  }
  if (navRow.length) buttons.push(navRow);

  buttons.push([{ text: t("proof.close"), callback_data: "src:close" }]);

  const text =
    totalPages > 1
      ? t("proof.header_paged", {
          page: safePage + 1,
          pages: totalPages,
          count: sources.length,
        })
      : t("proof.header", { count: sources.length });

  return { text, buttons };
}

/**
 * Show the sources menu for the /proof command.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 * @param {number} page
 * @param {number|null} messageId - If provided, edits existing message
 */
async function showSourcesMenu(ctx, chatId, page = 0, messageId = null) {
  const editId = asMessageId(messageId);
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

  const thread = session.threadSlug
    ? await WorkspaceThread.get({ slug: session.threadSlug })
    : null;

  const lastMessage = await getLastAssistantMessage(
    workspace.id,
    thread?.id || null,
    session.user.id
  );

  if (!lastMessage) {
    const text = t("proof.no_citations");
    if (editId) {
      await ctx.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: editId,
      });
    } else {
      await ctx.bot.sendMessage(chatId, text);
    }
    return;
  }

  const { sources } = lastMessage;
  if (!sources || sources.length === 0) {
    const text = t("proof.no_sources");
    if (editId) {
      await ctx.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: editId,
      });
    } else {
      await ctx.bot.sendMessage(chatId, text);
    }
    return;
  }

  // Store sources in state for callback handlers to access
  ctx.setState(chatId, { _proofSources: sources });

  const { text, buttons } = buildSourcesMenu(sources, page, t);
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
 * /proof - Show citations from the previous assistant message.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleProof(ctx, chatId) {
  await showSourcesMenu(ctx, chatId, 0, null);
}

module.exports = {
  handleProof,
  showSourcesMenu,
  isWebSource,
  getSourceTitle,
  SOURCES_PER_PAGE,
};
