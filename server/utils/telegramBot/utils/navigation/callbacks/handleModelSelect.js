const { Workspace } = require("../../../../../models/workspace");
const { getCustomModels } = require("../../../../helpers/customModels");
const { workspaceForUser, canManageWorkspaceLLM } = require("../../access");
const { translatorFor } = require("../../i18n");
const { resolveWorkspaceProvider } = require("../../index");

/**
 * Handle model selection for a workspace.
 * @param {object} params
 * @param {import("../../commands/index").BotContext} params.ctx
 * @param {number} params.chatId
 * @param {{id: string}} params.query
 * @param {number} params.messageId
 * @param {string} params.data
 */
async function handleModelSelect({ ctx, chatId, query, messageId, data } = {}) {
  const parts = data.slice(4).split(":");
  const workspaceId = parseInt(parts[0], 10);
  const modelIdPrefix = parts.slice(1).join(":");

  const session = ctx.getState(chatId);
  const t = translatorFor(session);
  const workspace = await workspaceForUser(session.user, { id: workspaceId });
  if (!workspace) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: t("workspaces.not_available"),
    });
    return;
  }

  if (!(await canManageWorkspaceLLM(session.user, workspace))) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: t("model.denied_toast"),
    });
    return;
  }

  const { provider } = resolveWorkspaceProvider(workspace);
  const { models } = await getCustomModels(provider);
  const selectedModel = models?.find((m) => {
    const id = m.id || m.name;
    return id === modelIdPrefix || id.startsWith(modelIdPrefix);
  });

  if (!selectedModel) {
    await ctx.bot.answerCallbackQuery(query.id, {
      text: t("model.not_found"),
    });
    return;
  }

  const modelId = selectedModel.id || selectedModel.name;
  await Workspace.update(workspace.id, { chatModel: modelId });

  await ctx.bot.answerCallbackQuery(query.id, {
    text: t("model.updated_toast"),
  });
  await ctx.bot.deleteMessage(chatId, messageId);
  await ctx.bot.sendMessage(
    chatId,
    t("model.updated", {
      model: selectedModel.name || modelId,
      workspace: workspace.name,
    })
  );
}

module.exports = { handleModelSelect };
