const { Workspace } = require("../../../../../models/workspace");
const { WorkspaceThread } = require("../../../../../models/workspaceThread");
const {
  resolveWorkspaceProvider,
  sendFormattedMessage,
} = require("../../../utils");
const { languageLabel } = require("../../language");
const { translatorFor } = require("../../i18n");

/**
 * /status - Show current workspace, thread, and model info.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleStatus(ctx, chatId) {
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

  let threadName = t("common.default_thread");
  if (session.threadSlug) {
    const thread = await WorkspaceThread.get({ slug: session.threadSlug });
    if (thread) threadName = thread.name;
  }

  const markdown = [];

  markdown.push(`# ${t("status.workspace")}
${workspace.name}

# ${t("status.thread")}
_${threadName}_

# ${t("status.language")}
${languageLabel(session.language)}
--------------------------------`);

  const AIbitat = require("../../../../agents/aibitat");
  const { provider, model } = resolveWorkspaceProvider(workspace);
  const agentConfig = { provider, model };
  const agentProvider = new AIbitat(agentConfig).getProviderForConfig(
    agentConfig
  );
  const nativeToolCalling = await agentProvider.supportsNativeToolCalling?.();

  markdown.push(`# ${t("status.provider")}
${provider}

# ${t("status.model")}
${model}

# ${t("status.native_tools")}
${nativeToolCalling ? t("status.enabled") : t("status.disabled")}

# ${t("status.chat_mode")}
${workspace.chatMode ?? "chat"}`);

  if (workspace.chatMode === "automatic" && !nativeToolCalling) {
    markdown.unshift(
      `<blockquote>${t("status.note_no_native_tools")}</blockquote>`
    );
  }

  if (workspace.chatMode === "chat") {
    markdown.unshift(
      `<blockquote>${
        nativeToolCalling
          ? t("status.tip_automatic_mode")
          : t("status.note_no_native_tools")
      }</blockquote>`
    );
  }

  await sendFormattedMessage(ctx.bot, chatId, markdown.join("\n"), {
    format: true,
    escapeHtml: false,
  });
}

module.exports = { handleStatus };
