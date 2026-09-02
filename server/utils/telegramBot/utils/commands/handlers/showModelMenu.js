const { Workspace } = require("../../../../../models/workspace");
const { canManageWorkspaceLLM } = require("../../access");
const { translatorFor } = require("../../i18n");
const { asMessageId } = require("../../index");
const { resolveWorkspaceProvider } = require("../../index");
const {
  getCustomModels,
  SUPPORT_CUSTOM_MODELS,
} = require("../../../../helpers/customModels");
const MODELS_PER_PAGE = 8;

/**
 * Show the model selection inline keyboard with pagination.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 * @param {number} page - Current page (0-indexed)
 * @param {number|null} messageId - If provided, edits existing message instead of sending new one
 */
async function showModelMenu(ctx, chatId, page = 0, messageId = null) {
  const pageNum = typeof page === "number" && !isNaN(page) ? page : 0;
  const editId = asMessageId(messageId);
  const session = ctx.getState(chatId);
  if (!session) return;
  const t = translatorFor(session);

  const workspace = session.workspaceSlug
    ? await Workspace.get({ slug: session.workspaceSlug })
    : null;
  if (!workspace) {
    await ctx.bot.sendMessage(chatId, t("model.no_workspace"));
    return;
  }

  // Changing the model rewrites workspace settings, so it takes the same
  // permission the settings screen does.
  if (!(await canManageWorkspaceLLM(session.user, workspace))) {
    await ctx.bot.sendMessage(
      chatId,
      t("model.denied", { workspace: workspace.name })
    );
    return;
  }

  const { provider, model: currentModel } = resolveWorkspaceProvider(workspace);
  if (!SUPPORT_CUSTOM_MODELS.includes(provider)) {
    await ctx.bot.sendMessage(
      chatId,
      t("model.provider_unsupported", { provider })
    );
    return;
  }

  const { models, error } = await getCustomModels(provider);
  if (error || !models?.length) {
    await ctx.bot.sendMessage(
      chatId,
      error || t("model.none_available", { provider })
    );
    return;
  }

  const sortedModels = [...models].sort((a, b) => {
    const aId = a.id || a.name;
    const bId = b.id || b.name;
    const aIsActive = aId === currentModel;
    const bIsActive = bId === currentModel;
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    return 0;
  });

  const totalPages = Math.ceil(sortedModels.length / MODELS_PER_PAGE);
  const safePage = Math.max(0, Math.min(pageNum, totalPages - 1));
  const startIdx = safePage * MODELS_PER_PAGE;
  const pageModels = sortedModels.slice(startIdx, startIdx + MODELS_PER_PAGE);

  const buttons = pageModels.map((m) => {
    const modelId = m.id || m.name;
    const displayName = m.name || m.id;
    const isActive = modelId === currentModel;
    return [
      {
        text: isActive
          ? `🟢 ${displayName} (${t("common.active")})`
          : displayName,
        callback_data: `mdl:${workspace.id}:${modelId.slice(0, 40)}`,
      },
    ];
  });

  const navRow = [];
  if (safePage > 0) {
    navRow.push({
      text: t("common.prev"),
      callback_data: `mdlpg:${safePage - 1}`,
    });
  }
  if (safePage < totalPages - 1) {
    navRow.push({
      text: t("common.next"),
      callback_data: `mdlpg:${safePage + 1}`,
    });
  }
  if (navRow.length) buttons.push(navRow);

  buttons.push([
    { text: `✕ ${t("model.cancel")}`, callback_data: "mdl:cancel" },
  ]);

  const text = t("model.select_paged", {
    workspace: workspace.name,
    page: safePage + 1,
    pages: totalPages,
    count: sortedModels.length,
  });
  const opts = { reply_markup: { inline_keyboard: buttons } };

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

module.exports = { showModelMenu };
