// Suppress deprecated content-type warning when sending files via the Telegram bot API.
// https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#file-options-metadata
process.env.NTBA_FIX_350 = 1;
const TelegramBot = require("node-telegram-bot-api");
const { log, conclude } = require("./helpers/index.js");
const { User } = require("../models/user");
const { WorkspaceThread } = require("../models/workspaceThread");
const { streamResponse } = require("../utils/telegramBot/chat/stream");
const {
  activeUserById,
  workspaceForUser,
} = require("../utils/telegramBot/utils/access");
const { translator } = require("../utils/telegramBot/utils/i18n");

process.on("message", async (payload) => {
  // Ignore tool approval responses - these are handled by http-socket plugin
  if (payload?.type === "toolApprovalResponse") return;

  const {
    botToken,
    chatId,
    userId,
    workspaceSlug,
    threadSlug,
    language = null,
    message,
    attachments = [],
    voiceResponse = false,
  } = payload;

  const t = translator(language);

  try {
    const bot = new TelegramBot(botToken, { polling: false });
    const ctx = {
      bot,
      log: (text, ...args) =>
        log(args.length ? `${text} ${args.join(" ")}` : text),
    };

    // The worker re-checks everything the bot process checked. It runs with the
    // raw bot token and a chat id, so it cannot assume the caller was honest
    // about who the message belongs to.
    const user = await activeUserById(userId);
    if (!user) {
      await bot.sendMessage(chatId, t("chat.account_gone"));
      conclude();
      return;
    }

    const workspace = await workspaceForUser(user, { slug: workspaceSlug });
    if (!workspace) {
      await bot.sendMessage(chatId, t("chat.lost_access"));
      conclude();
      return;
    }

    if (!(await User.canSendChat(user))) {
      await bot.sendMessage(chatId, t("chat.daily_limit"));
      conclude();
      return;
    }

    const thread = threadSlug
      ? await WorkspaceThread.get({ slug: threadSlug })
      : null;

    await streamResponse({
      ctx,
      chatId,
      user,
      workspace,
      thread: thread?.user_id === user.id ? thread : null,
      message,
      language,
      attachments,
      voiceResponse,
    });
  } catch (error) {
    log(`Telegram chat error: ${error.message}`);
    try {
      const bot = new TelegramBot(botToken, { polling: false });
      await bot.sendMessage(chatId, t("common.error"));
    } catch {}
  } finally {
    conclude();
  }
});
