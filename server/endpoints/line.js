const { Workspace } = require("../models/workspace");
const { User } = require("../models/user");
const { LineUser } = require("../models/lineUser");
const {
  ExternalCommunicationConnector,
} = require("../models/externalCommunicationConnector");
const { EventLogs } = require("../models/eventLogs");
const { ApiChatHandler } = require("../utils/chats/apiChatHandler");
const { stripThinkingFromText } = require("../utils/helpers");
const {
  sendLinePairingEmail,
  isSendingEnabled: isSmtpSendingEnabled,
} = require("../utils/smtp");
const {
  verifySignature,
  matchesWebhookSecret,
  encryptToken,
  decryptToken,
  verifyChannelAccessToken,
  getUserProfile,
  replyMessage,
} = require("../utils/lineBot");
const {
  createPairingCode,
  revokeCodesForUser,
} = require("../utils/lineBot/pairing");
const {
  LINK_INSTRUCTIONS,
  linkAccount,
  linkSuccessMessage,
} = require("../utils/lineBot/linking");
const { translator } = require("../utils/lineBot/i18n");
const {
  RESPONSE_LANGUAGES,
  languageFor,
  withLanguageNote,
} = require("../utils/telegramBot/utils/language");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  userPermissionValid,
} = require("../utils/middleware/authorizedRequest");
const { PERMISSIONS } = require("../utils/permissions");
const { reqBody, userFromSession } = require("../utils/http");

/**
 * The bot's own add-friend link for its LINE Basic ID, used both as the QR
 * code value and the plain "search for this ID" text shown to a web user.
 * @param {string|null} basicId
 * @returns {string|null}
 */
function addFriendUrl(basicId) {
  return basicId ? `https://line.me/R/ti/p/${encodeURIComponent(basicId)}` : null;
}

const META_COMMANDS = ["help", "workspace", "language", "unlink"];

/**
 * Parse a message as one of the linked-user meta commands, if it is one.
 * @param {string} text
 * @returns {{command: string, arg: string}|null}
 */
function matchMetaCommand(text) {
  const match = text.trim().match(/^\/(\w+)\s*(.*)$/s);
  if (!match) return null;
  const command = match[1].toLowerCase();
  if (!META_COMMANDS.includes(command)) return null;
  return { command, arg: match[2].trim() };
}

/** Match the one command an unlinked chat may send: /link <username> <code>. */
function matchLinkCommand(text) {
  return text.trim().match(/^\/link\s+(\S+)\s+(\d{6})\s*$/i);
}

function formatWorkspaceList(accessible, activeId) {
  return accessible
    .map(
      (w, i) =>
        `${i + 1}. ${w.id === activeId ? "-> " : ""}${w.name} (${w.slug})`
    )
    .join("\n");
}

/**
 * Resolve a /workspace <arg> argument to one of the user's accessible
 * workspaces - by its list number (as shown by a bare /workspace), or as a
 * fallback, its slug or name.
 * @param {string} arg
 * @param {object[]} accessible
 * @returns {object|null}
 */
function findWorkspaceByArg(arg, accessible) {
  if (/^\d+$/.test(arg)) {
    return accessible[Number(arg) - 1] || null;
  }
  return (
    accessible.find(
      (w) =>
        w.slug.toLowerCase() === arg.toLowerCase() ||
        w.name.toLowerCase() === arg.toLowerCase()
    ) || null
  );
}

function formatLanguageList(currentCode) {
  return RESPONSE_LANGUAGES.map(
    (l, i) => `${i + 1}. ${l.code === currentCode ? "-> " : ""}${l.label}`
  ).join("\n");
}

/**
 * Resolve a /language <arg> argument to one of the supported languages - by
 * its list number (as shown by a bare /language), or as a fallback, its code.
 * @param {string} arg
 * @returns {{code: string|null, label: string}|null}
 */
function findLanguageByArg(arg) {
  if (/^\d+$/.test(arg)) {
    return RESPONSE_LANGUAGES[Number(arg) - 1] || null;
  }
  return (
    RESPONSE_LANGUAGES.find(
      (l) => (l.code || "auto").toLowerCase() === arg.toLowerCase()
    ) || null
  );
}

/**
 * Reply text for a linked user's /help, /workspace, /language or /unlink
 * command.
 * @returns {Promise<{text: string, unlinked?: boolean}>}
 */
async function handleMetaCommand(
  { command, arg },
  activeWorkspace,
  accessible,
  lineUser
) {
  const t = translator(lineUser.response_language);

  if (command === "help") return { text: t("help.text") };

  if (command === "unlink") {
    await LineUser.unlinkByLineUserId(lineUser.line_user_id);
    revokeCodesForUser(lineUser.user_id);
    await EventLogs.logEvent(
      "line_user_unlinked",
      { lineUserId: lineUser.line_user_id, key: "unlink.self" },
      lineUser.user_id
    );
    return { text: t("unlink.done"), unlinked: true };
  }

  if (command === "language") {
    const current = languageFor(lineUser.response_language);
    if (!arg) {
      return {
        text: t("language.status", {
          language: current.label,
          list: formatLanguageList(current.code),
        }),
      };
    }

    const target = findLanguageByArg(arg);
    if (!target) return { text: t("language.not_found", { arg }) };
    if (target.code === current.code)
      return { text: t("language.already", { language: target.label }) };

    await LineUser.setResponseLanguage(lineUser.line_user_id, target.code);
    return { text: t("language.changed", { language: target.label }) };
  }

  // command === "workspace"
  if (!arg) {
    return {
      text: t("workspace.status", {
        workspace: activeWorkspace.name,
        slug: activeWorkspace.slug,
        list: formatWorkspaceList(accessible, activeWorkspace.id),
      }),
    };
  }

  const target = findWorkspaceByArg(arg, accessible);
  if (!target) return { text: t("workspace.not_found", { arg }) };
  if (target.id === activeWorkspace.id)
    return { text: t("workspace.already", { workspace: target.name }) };

  await LineUser.setActiveWorkspace(lineUser.line_user_id, target.id);
  return { text: t("workspace.switched", { workspace: target.name }) };
}

/**
 * Handle a message from a LINE chat that has not been linked to a NexusAI
 * account yet. The only thing it can do is redeem a /link command; anything
 * else gets the same instructions back.
 * @returns {Promise<string>}
 */
async function handleUnlinkedMessage(lineUserId, text, accessToken) {
  const match = matchLinkCommand(text);
  if (!match) return LINK_INSTRUCTIONS;

  // No pending session yet, so this - like LINK_INSTRUCTIONS - is always in
  // the fallback language.
  const t = translator(null);
  const [, username, code] = match;
  const lineDisplayName = await getUserProfile(lineUserId, accessToken);
  const { user, workspace, error, retryInSeconds } = await linkAccount({
    lineUserId,
    username,
    code,
    lineDisplayName,
  });

  if (error === "rate_limited") {
    return t("link.rate_limited", { minutes: Math.ceil(retryInSeconds / 60) });
  }
  if (error) return t("link.invalid");

  return linkSuccessMessage(user, workspace);
}

/**
 * Handle a single LINE "message" webhook event whose message type is "text".
 * Unlinked chats can only redeem a /link command; linked chats only ever
 * chat inside workspaces their NexusAI account actually has access to.
 * @param {object} event
 * @param {object} connectorConfig - the LINE connector's decrypted-on-demand config
 */
async function handleTextEvent(event, connectorConfig) {
  const userMessage = event.message?.text;
  if (!userMessage) return;

  // Identity only makes sense 1:1 - skip group/room chats entirely rather than
  // treating a random group member's message as a link attempt.
  if (event.source?.type !== "user") return;
  const lineUserId = event.source.userId;
  const accessToken = decryptToken(connectorConfig.channel_access_token);

  const lineUser = await LineUser.getByLineUserId(lineUserId);
  if (!lineUser) {
    const replyText = await handleUnlinkedMessage(
      lineUserId,
      userMessage,
      accessToken
    );
    await replyMessage(event.replyToken, replyText, accessToken);
    return;
  }

  const t = translator(lineUser.response_language);

  const nexusUser = await User.get({ id: lineUser.user_id });
  if (!nexusUser || nexusUser.suspended) {
    // Their NexusAI account was deleted/suspended since linking - drop the link too.
    await LineUser.unlinkByLineUserId(lineUserId);
    await replyMessage(event.replyToken, t("account.gone"), accessToken);
    return;
  }

  const accessible = await Workspace.whereWithUser(nexusUser);
  const workspace =
    accessible.find((w) => w.id === lineUser.active_workspace_id) ||
    accessible[0] ||
    null;

  if (!workspace) {
    await replyMessage(
      event.replyToken,
      t("workspace.no_access", { username: nexusUser.username }),
      accessToken
    );
    return;
  }

  if (lineUser.active_workspace_id !== workspace.id) {
    await LineUser.setActiveWorkspace(lineUserId, workspace.id);
  }

  // Workspace selection is explicit commands only (not "say the workspace's
  // name to switch to it") so a normal chat message can never be misread as a
  // switch request.
  const metaCommand = matchMetaCommand(userMessage);
  if (metaCommand) {
    const { text } = await handleMetaCommand(
      metaCommand,
      workspace,
      accessible,
      lineUser
    );
    await replyMessage(event.replyToken, text, accessToken);
    return;
  }

  // chatSync builds its own system prompt with no hook for us to extend, so
  // (like Telegram's agent path) the reply-language instruction rides along
  // on the user's own turn instead.
  const { textResponse, error } = await ApiChatHandler.chatSync({
    workspace,
    message: withLanguageNote(userMessage, lineUser.response_language),
    user: nexusUser,
    sessionId: `line-${lineUserId}`,
  });

  // Reasoning models wrap their chain-of-thought in <think>/<thinking> tags before
  // the real answer - the main chat UI renders that separately, but LINE only gets
  // plain text, so the raw tags would otherwise leak straight into the reply.
  const replyText = error
    ? error
    : stripThinkingFromText(textResponse || "") || t("chat.no_response");

  await replyMessage(event.replyToken, replyText, accessToken);
}

function lineEndpoints(app) {
  if (!app) return;

  /**
   * Status for the Settings > Channels > LINE page.
   */
  app.get(
    "/line/config",
    [validatedRequest, userPermissionValid([PERMISSIONS.INTEGRATIONS_LINE])],
    async (_request, response) => {
      try {
        const connector = await ExternalCommunicationConnector.get("line");
        return response.status(200).json({
          active: !!connector?.active,
          configured: !!(
            connector?.config?.channel_secret &&
            connector?.config?.channel_access_token
          ),
          botDisplayName: connector?.config?.bot_display_name || null,
          basicId: connector?.config?.basic_id || null,
          verifiedUserCount: await LineUser.count(),
          // The /link flow emails the code as a convenience copy, so the admin
          // needs to see this before wondering why that half isn't arriving.
          smtpConfigured: isSmtpSendingEnabled(),
          // Not a stored secret in itself, and this endpoint already requires the
          // same permission an admin would need to read it out of the server env.
          webhookSecret: process.env.LINE_WEBHOOK_SECRET || null,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * LINE users linked to a NexusAI account. Includes each one's own accessible
   * workspace list so the admin can only ever pick a default that user can
   * actually use.
   */
  app.get(
    "/line/approved-users",
    [validatedRequest, userPermissionValid([PERMISSIONS.INTEGRATIONS_LINE])],
    async (_request, response) => {
      try {
        const links = await LineUser.all();
        const users = await Promise.all(
          links.map(async (link) => {
            const accessible = link.user
              ? await Workspace.whereWithUser(link.user)
              : [];
            return {
              lineUserId: link.line_user_id,
              username: link.user?.username || link.line_display_name,
              activeWorkspace: link.active_workspace?.slug || null,
              verifiedAt: link.createdAt,
              accessibleWorkspaces: accessible.map((w) => ({
                slug: w.slug,
                name: w.name,
              })),
            };
          })
        );

        return response.status(200).json({ users });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Admin-set default workspace for one linked LINE user. Must be one of that
   * user's own accessible workspaces - an admin can narrow their choice, not
   * grant access they don't already have.
   */
  app.post(
    "/line/set-user-workspace",
    [validatedRequest, userPermissionValid([PERMISSIONS.INTEGRATIONS_LINE])],
    async (request, response) => {
      try {
        const { lineUserId, workspaceSlug } = reqBody(request);
        if (!lineUserId || !workspaceSlug) {
          return response.status(400).json({
            success: false,
            error: "lineUserId and workspaceSlug are both required.",
          });
        }

        const link = await LineUser.getByLineUserId(lineUserId);
        if (!link) {
          return response
            .status(404)
            .json({ success: false, error: "That LINE user is not linked." });
        }

        const accessible = await Workspace.whereWithUser(link.user);
        const workspace = accessible.find((w) => w.slug === workspaceSlug);
        if (!workspace) {
          return response.status(400).json({
            success: false,
            error: "That user does not have access to that workspace.",
          });
        }

        await LineUser.setActiveWorkspace(lineUserId, workspace.id);
        return response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Un-pair a LINE user - they'll have to redeem a fresh /link command before
   * they can chat again.
   */
  app.post(
    "/line/revoke-user",
    [validatedRequest, userPermissionValid([PERMISSIONS.INTEGRATIONS_LINE])],
    async (request, response) => {
      try {
        const { lineUserId } = reqBody(request);
        if (!lineUserId)
          return response
            .status(400)
            .json({ success: false, error: "lineUserId is required." });

        const link = await LineUser.getByLineUserId(lineUserId);
        if (!link)
          return response
            .status(404)
            .json({ success: false, error: "That LINE user is not linked." });

        await LineUser.unlinkByLineUserId(lineUserId);
        revokeCodesForUser(link.user_id);
        await EventLogs.logEvent(
          "line_user_revoked",
          { lineUserId, key: "unlink.by_admin" },
          link.user_id
        );
        return response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Verify the channel access token, save the connector config (encrypted at
   * rest), and mark it active. Replaces any previously connected channel.
   */
  app.post(
    "/line/connect",
    [validatedRequest, userPermissionValid([PERMISSIONS.INTEGRATIONS_LINE])],
    async (request, response) => {
      try {
        const { channel_access_token, channel_secret } = reqBody(request);

        if (!channel_access_token || !channel_secret) {
          return response.status(400).json({
            success: false,
            error: "Channel access token and channel secret are both required.",
          });
        }

        const verification = await verifyChannelAccessToken(
          String(channel_access_token)
        );
        if (!verification.valid) {
          return response.status(400).json({
            success: false,
            error: `Invalid channel access token: ${verification.error}`,
          });
        }

        const { error } = await ExternalCommunicationConnector.upsert(
          "line",
          {
            channel_access_token: encryptToken(String(channel_access_token)),
            channel_secret: encryptToken(String(channel_secret)),
            bot_display_name: verification.displayName,
            basic_id: verification.basicId,
            active: true,
          }
        );
        if (error)
          return response.status(500).json({ success: false, error });

        await EventLogs.logEvent("line_bot_connected", {
          bot_display_name: verification.displayName,
        });
        return response.status(200).json({
          success: true,
          botDisplayName: verification.displayName,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  app.post(
    "/line/disconnect",
    [validatedRequest, userPermissionValid([PERMISSIONS.INTEGRATIONS_LINE])],
    async (_request, response) => {
      try {
        await ExternalCommunicationConnector.delete("line");
        // The links are meaningless without a bot, and a new bot should start clean.
        await LineUser.deleteAll();
        await EventLogs.logEvent("line_bot_disconnected");
        return response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * The signed-in user's own LINE connection, if they have one.
   */
  app.get(
    "/line/my-connection",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const connector = await ExternalCommunicationConnector.get("line");
        const link = await LineUser.getByUserId(user.id);

        return response.status(200).json({
          available: !!connector?.active,
          basicId: connector?.config?.basic_id || null,
          addFriendUrl: addFriendUrl(connector?.config?.basic_id || null),
          link: link
            ? {
                lineUserId: link.line_user_id,
                lineDisplayName: link.line_display_name,
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
   * Mint a short-lived linking code for the signed-in user. Being able to
   * read this response is the proof of account ownership that /link relies
   * on. Also emailed as a convenience copy, since the user asked for that
   * alongside the on-screen command.
   */
  app.post(
    "/line/pairing-code",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const connector = await ExternalCommunicationConnector.get("line");
        if (!connector?.active) {
          return response.status(400).json({
            success: false,
            error: "The LINE bot is not connected on this instance.",
          });
        }

        const { code, expiresAt, ttlMs } = createPairingCode(user);

        if (user.email) {
          const { sent, reason } = await sendLinePairingEmail({
            to: user.email,
            code,
            username: user.username,
          });
          if (!sent)
            console.error(`[Line] Failed to send pairing email: ${reason}`);
        }

        return response.status(200).json({
          success: true,
          code,
          username: user.username,
          expiresAt,
          ttlMs,
          basicId: connector.config.basic_id || null,
          addFriendUrl: addFriendUrl(connector.config.basic_id || null),
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Detach the caller's own LINE chat.
   */
  app.post(
    "/line/unlink",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const link = await LineUser.getByUserId(user.id);
        if (!link) return response.status(200).json({ success: true });

        await LineUser.unlinkByUserId(user.id);
        revokeCodesForUser(user.id);
        await EventLogs.logEvent(
          "line_user_unlinked",
          { lineUserId: link.line_user_id, key: "unlink.self" },
          user.id
        );
        return response.status(200).json({ success: true });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    }
  );

  /**
   * Public webhook LINE calls with every message sent to the bot. Configure
   * this URL in the LINE Developers Console under Messaging API > Webhook URL -
   * see GET /line/config (or the Settings > Channels > LINE page) for the exact
   * value to use on this instance.
   *
   * The trailing `:secret` is optional hardening: set LINE_WEBHOOK_SECRET and
   * only the matching path responds - every other path (including the plain
   * `/webhooks/line`) 404s as if it never existed.
   *
   * LINE expects a fast 200 ack and retries on anything else, so we ack
   * immediately and do the (potentially slow, LLM-backed) reply afterwards -
   * the reply is a separate outbound call to LINE's Reply API, not the
   * webhook response itself.
   */
  app.post("/webhooks/line/:secret?", async (request, response) => {
    if (!matchesWebhookSecret(request.params.secret)) {
      return response.sendStatus(404);
    }
    response.sendStatus(200);

    try {
      const connector = await ExternalCommunicationConnector.get("line");
      if (!connector?.active || !connector?.config?.channel_secret) {
        console.error("[LineWebhook] No active LINE connector configured.");
        return;
      }

      const channelSecret = decryptToken(connector.config.channel_secret);
      const signature = request.headers["x-line-signature"];
      if (!verifySignature(request.rawBody, signature, channelSecret)) {
        console.error(
          "[LineWebhook] Rejected event with missing/invalid signature."
        );
        return;
      }

      const events = Array.isArray(request.body?.events)
        ? request.body.events
        : [];

      for (const event of events) {
        if (event.type !== "message" || event.message?.type !== "text")
          continue;
        await handleTextEvent(event, connector.config).catch((e) =>
          console.error("[LineWebhook] Failed to handle event:", e.message)
        );
      }
    } catch (e) {
      console.error("[LineWebhook]", e.message, e);
    }
  });
}

module.exports = { lineEndpoints };
