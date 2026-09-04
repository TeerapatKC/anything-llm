const {
  ExternalCommunicationConnector,
} = require("../models/externalCommunicationConnector");
const { Telemetry } = require("../models/telemetry");
const { TelegramBotService } = require("../utils/telegramBot");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  userPermissionValid,
} = require("../utils/middleware/authorizedRequest");
const { PERMISSIONS } = require("../utils/permissions");
const { reqBody, userFromSession } = require("../utils/http");
const { EventLogs } = require("../models/eventLogs");
const { TelegramUser } = require("../models/telegramUser");
const { encryptToken } = require("../utils/telegramBot/utils");
const {
  createPairingCode,
  revokeCodesForUser,
} = require("../utils/telegramBot/utils/pairing");
const {
  sendTelegramPairingEmail,
  isSendingEnabled: isSmtpSendingEnabled,
} = require("../utils/smtp");

function telegramEndpoints(app) {
  if (!app) return;

  app.get(
    "/telegram/config",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.INTEGRATIONS_TELEGRAM]),
    ],
    async (_request, response) => {
      try {
        const connector = await ExternalCommunicationConnector.get("telegram");
        if (!connector) {
          return response.status(200).json({ config: null });
        }

        const service = new TelegramBotService();

        // Deliberately bot-level only. Which workspace and thread a chat is
        // pointed at belongs to the person using it, not to this page.
        return response.status(200).json({
          config: {
            active: connector.active,
            connected: service.isRunning,
            bot_username: connector.config.bot_username || null,
            linked_user_count: await TelegramUser.count(),
            voice_response_mode:
              connector.config.voice_response_mode || "text_only",
            // The /link flow emails the code as a convenience copy, so the admin
            // needs to see this before wondering why that half isn't arriving.
            smtp_configured: isSmtpSendingEnabled(),
          },
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Verify token, save config, and start the Telegram bot.
   */
  app.post(
    "/telegram/connect",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.INTEGRATIONS_TELEGRAM]),
    ],
    async (request, response) => {
      try {
        const { bot_token } = reqBody(request);
        if (!bot_token) {
          return response.status(400).json({
            success: false,
            error: "Bot token is required.",
          });
        }

        // Verify the token with Telegram API
        const verification = await TelegramBotService.verifyToken(
          String(bot_token)
        );
        if (!verification.valid) {
          return response.status(400).json({
            success: false,
            error: `Invalid bot token: ${verification.error}`,
          });
        }

        const existing = await ExternalCommunicationConnector.get("telegram");
        const storedConfig = {
          bot_username: verification.username,
          voice_response_mode:
            existing?.config?.voice_response_mode || "text_only",
        };

        // Save config with encrypted token
        const { error } = await ExternalCommunicationConnector.upsert(
          "telegram",
          {
            ...storedConfig,
            bot_token: encryptToken(String(bot_token)),
            active: true,
          }
        );
        if (error) return response.status(500).json({ success: false, error });

        // Start the bot with the plaintext token
        const service = new TelegramBotService();
        await service.start({ ...storedConfig, bot_token: String(bot_token) });

        await EventLogs.logEvent("telegram_bot_connected", {
          bot_username: verification.username,
        });
        await Telemetry.sendTelemetry("telegram_bot_connected");
        return response.status(200).json({
          success: true,
          bot_username: verification.username,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  app.post(
    "/telegram/disconnect",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.INTEGRATIONS_TELEGRAM]),
    ],
    async (_request, response) => {
      try {
        const service = new TelegramBotService();
        await service.stop();
        await ExternalCommunicationConnector.delete("telegram");
        // Links are bound to a bot that no longer exists. Leaving them behind
        // would silently re-admit every chat the moment a new bot is connected.
        await TelegramUser.deleteAll();
        await EventLogs.logEvent("telegram_bot_disconnected");
        return response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  app.get(
    "/telegram/status",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.INTEGRATIONS_TELEGRAM]),
    ],
    async (_request, response) => {
      try {
        const connector = await ExternalCommunicationConnector.get("telegram");
        const service = new TelegramBotService();
        return response.status(200).json({
          active: connector?.active && service.isRunning,
          bot_username: connector?.config?.bot_username || null,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Every Telegram chat bound to an account on this instance.
   */
  app.get(
    "/telegram/linked-users",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.INTEGRATIONS_TELEGRAM]),
    ],
    async (_request, response) => {
      try {
        const links = await TelegramUser.all();
        return response.status(200).json({
          users: links.map((link) => ({
            chatId: link.chat_id,
            username: link.user?.username || null,
            userId: link.user_id,
            telegramUsername: link.telegram_username,
            telegramFirstName: link.telegram_first_name,
            workspace: link.active_workspace?.name || null,
            linkedAt: link.createdAt,
            lastActiveAt: link.lastActiveAt,
          })),
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Admin-side revocation of someone else's link.
   */
  app.post(
    "/telegram/unlink-user",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.INTEGRATIONS_TELEGRAM]),
    ],
    async (request, response) => {
      try {
        const { chatId } = reqBody(request);
        if (!chatId)
          return response
            .status(400)
            .json({ success: false, error: "chatId is required." });

        const link = await TelegramUser.getByChatId(chatId);
        if (!link)
          return response
            .status(404)
            .json({ success: false, error: "No such linked chat." });

        await TelegramUser.unlinkByChatId(chatId);
        revokeCodesForUser(link.user_id);

        const service = new TelegramBotService();
        await service.unlinkChat(chatId, {
          username: link.user?.username || null,
          key: "unlink.by_admin",
        });

        await EventLogs.logEvent("telegram_user_unlinked", {
          chatId: String(chatId),
          username: link.user?.username || null,
        });
        return response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  app.post(
    "/telegram/update-config",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.INTEGRATIONS_TELEGRAM]),
    ],
    async (request, response) => {
      try {
        const { voice_response_mode } = reqBody(request);
        const updates = {};

        if (
          voice_response_mode &&
          ["text_only", "mirror", "always_voice"].includes(voice_response_mode)
        ) {
          updates.voice_response_mode = voice_response_mode;
        }

        if (Object.keys(updates).length === 0) {
          return response
            .status(400)
            .json({ success: false, error: "No valid updates provided." });
        }

        const { error } = await ExternalCommunicationConnector.updateConfig(
          "telegram",
          updates
        );
        if (error) {
          return response.status(500).json({ success: false, error });
        }

        // Update the running bot's config so changes take effect immediately
        const service = new TelegramBotService();
        if (service.isRunning) service.updateConfig(updates);

        return response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  // ---------------------------------------------------------------- self-service
  // Anyone with an account may bind their own Telegram chat. These routes only
  // ever act on the caller's own link, so they need no elevated permission.

  /**
   * Whether the caller's account is bound to a Telegram chat, and to which one.
   */
  app.get(
    "/telegram/my-connection",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const connector = await ExternalCommunicationConnector.get("telegram");
        const service = new TelegramBotService();
        const link = await TelegramUser.getByUserId(user.id);

        return response.status(200).json({
          available: Boolean(connector?.active && service.isRunning),
          bot_username: connector?.config?.bot_username || null,
          link: link
            ? {
                chatId: link.chat_id,
                telegramUsername: link.telegram_username,
                telegramFirstName: link.telegram_first_name,
                linkedAt: link.createdAt,
              }
            : null,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Mint a short-lived linking code for the signed-in user. Being able to read
   * this response is the proof of account ownership that /link relies on. Also
   * emailed as a convenience copy, since the user asked for that alongside the
   * on-screen command (matches the LINE flow).
   */
  app.post(
    "/telegram/pairing-code",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const connector = await ExternalCommunicationConnector.get("telegram");
        const service = new TelegramBotService();

        if (!connector?.active || !service.isRunning) {
          return response.status(400).json({
            success: false,
            error: "The Telegram bot is not connected on this instance.",
          });
        }

        const { code, expiresAt, ttlMs } = createPairingCode(user);

        if (user.email) {
          const { sent, reason } = await sendTelegramPairingEmail({
            to: user.email,
            code,
            username: user.username,
          });
          if (!sent)
            console.error(`[Telegram] Failed to send pairing email: ${reason}`);
        }

        return response.status(200).json({
          success: true,
          code,
          username: user.username,
          expiresAt,
          ttlMs,
          bot_username: connector.config.bot_username || null,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Detach the caller's own Telegram chat.
   */
  app.post(
    "/telegram/unlink",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const link = await TelegramUser.getByUserId(user.id);
        if (!link) return response.status(200).json({ success: true });

        await TelegramUser.unlinkByUserId(user.id);
        revokeCodesForUser(user.id);

        const service = new TelegramBotService();
        await service.unlinkChat(link.chat_id, { key: "unlink.self" });

        await EventLogs.logEvent(
          "telegram_user_unlinked",
          { chatId: link.chat_id, username: user.username },
          user.id
        );
        return response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );
}

module.exports = { telegramEndpoints };
