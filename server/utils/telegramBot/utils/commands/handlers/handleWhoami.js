const { Workspace } = require("../../../../../models/workspace");
const { WorkspaceThread } = require("../../../../../models/workspaceThread");
const { escapeHTML } = require("../../format");
const { translatorFor } = require("../../i18n");
const { languageLabel } = require("../../language");

/**
 * /whoami - Show which NexusAI account this chat is acting as.
 * @param {import("../index").BotContext} ctx
 * @param {number} chatId
 */
async function handleWhoami(ctx, chatId) {
  const session = ctx.getState(chatId);
  if (!session) return;

  const workspace = session.workspaceSlug
    ? await Workspace.get({ slug: session.workspaceSlug })
    : null;
  const thread = session.threadSlug
    ? await WorkspaceThread.get({ slug: session.threadSlug })
    : null;

  const t = translatorFor(session);
  const lines = [
    `<b>${t("whoami.signed_in_as")}</b> ${escapeHTML(session.user.username || t("common.unknown"))}`,
    `<b>${t("whoami.workspace")}</b> ${escapeHTML(workspace?.name || t("whoami.none_selected"))}`,
    `<b>${t("whoami.thread")}</b> ${escapeHTML(thread?.name || t("common.default_thread"))}`,
    `<b>${t("whoami.language")}</b> ${escapeHTML(languageLabel(session.language))}`,
    "",
    t("whoami.note"),
  ];

  await ctx.bot.sendMessage(chatId, lines.join("\n"), { parse_mode: "HTML" });
}

module.exports = { handleWhoami };
