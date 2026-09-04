const nodemailer = require("nodemailer");

/**
 * Host/port/security presets for the managed providers the settings UI offers a
 * one-click choice for. Selecting one of these locks those three fields in the UI - the
 * operator only has to supply the mailbox's own username and app password.
 *
 * "microsoft" and "outlook" are deliberately separate presets, not one "Microsoft" entry
 * - a work/school Microsoft 365 mailbox and a personal Outlook.com/Hotmail mailbox
 * authenticate against different SMTP hosts.
 */
const SMTP_PROVIDER_PRESETS = {
  google: { host: "smtp.gmail.com", port: 465, secure: true },
  microsoft: { host: "smtp.office365.com", port: 587, secure: false },
  outlook: { host: "smtp-mail.outlook.com", port: 587, secure: false },
};

/**
 * The instance's outbound email configuration, resolved from process.env with the
 * selected provider's preset overriding any stray host/port/secure values.
 * @returns {{enabled: boolean, provider: string, host: string, port: number, secure: boolean, username: string, password: string, fromEmail: string, fromName: string}}
 */
function resolvedConfig() {
  const provider = process.env.SMTP_PROVIDER || "custom";
  const preset = SMTP_PROVIDER_PRESETS[provider];
  return {
    enabled: process.env.SMTP_ENABLED === "true",
    provider,
    host: preset?.host || process.env.SMTP_HOST || "",
    port: Number(preset?.port || process.env.SMTP_PORT || 587),
    secure:
      preset?.secure !== undefined
        ? preset.secure
        : process.env.SMTP_SECURE === "true",
    username: process.env.SMTP_USERNAME ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || "",
    fromName: process.env.SMTP_FROM_NAME || "",
  };
}

/** Whether enough is set to actually attempt sending. */
function isConfigured() {
  const cfg = resolvedConfig();
  return !!(cfg.host && cfg.port && cfg.username && cfg.password);
}

function createTransport() {
  const cfg = resolvedConfig();
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.username, pass: cfg.password },
  });
}

/**
 * @param {{to: string, subject: string, text?: string, html?: string}} message
 */
async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) throw new Error("SMTP is not configured.");
  const cfg = resolvedConfig();
  const transport = createTransport();
  return transport.sendMail({
    from: cfg.fromName
      ? `"${cfg.fromName}" <${cfg.fromEmail}>`
      : cfg.fromEmail,
    to,
    subject,
    text,
    html,
  });
}

async function sendTestEmail(to) {
  return sendMail({
    to,
    subject: "NexusAI SMTP test email",
    text: "This is a test email confirming your SMTP configuration works.",
    html: "<p>This is a test email confirming your SMTP configuration works.</p>",
  });
}

/** Whether automatic system email (welcome, invite) should actually fire right now. */
function isSendingEnabled() {
  return resolvedConfig().enabled && isConfigured();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends a system-triggered email (welcome, invite) only if the owner has both filled in
 * SMTP and flipped the "enable outbound email" switch on. Never throws - callers get a
 * result back instead, since a failed notification email should never fail the request
 * that triggered it (creating the user/invite already succeeded).
 * @param {{to: string, subject: string, text: string, html: string}} message
 * @returns {Promise<{sent: boolean, reason: string|null}>}
 */
async function sendSystemMail(message) {
  if (!isSendingEnabled()) return { sent: false, reason: "disabled" };
  try {
    await sendMail(message);
    return { sent: true, reason: null };
  } catch (error) {
    console.error("[SMTP] Failed to send system email:", error.message);
    return { sent: false, reason: error.message };
  }
}

/**
 * @param {{to: string, username: string, password: string, loginUrl?: string}} params
 * @returns {Promise<{sent: boolean, reason: string|null}>}
 */
async function sendWelcomeEmail({ to, username, password, loginUrl = "" }) {
  return sendSystemMail({
    to,
    subject: "Your NexusAI account",
    text:
      `An account has been created for you on NexusAI.\n\n` +
      `Username: ${username}\nTemporary password: ${password}\n\n` +
      `You will be asked to set a new password the first time you sign in.` +
      (loginUrl ? `\n\nSign in: ${loginUrl}` : ""),
    html:
      `<p>An account has been created for you on NexusAI.</p>` +
      `<p><b>Username:</b> ${escapeHtml(username)}<br/>` +
      `<b>Temporary password:</b> ${escapeHtml(password)}</p>` +
      `<p>You will be asked to set a new password the first time you sign in.</p>` +
      (loginUrl
        ? `<p><a href="${escapeHtml(loginUrl)}">Sign in</a></p>`
        : ""),
  });
}

/**
 * @param {{to: string, inviteUrl: string}} params
 * @returns {Promise<{sent: boolean, reason: string|null}>}
 */
async function sendInviteEmail({ to, inviteUrl }) {
  return sendSystemMail({
    to,
    subject: "You're invited to NexusAI",
    text: `You have been invited to join NexusAI.\n\nAccept your invite: ${inviteUrl}`,
    html:
      `<p>You have been invited to join NexusAI.</p>` +
      `<p><a href="${escapeHtml(inviteUrl)}">Accept your invite</a></p>`,
  });
}

/**
 * Sent when a signed-in web user mints a LINE linking code, so they have the
 * command in their inbox as well as on screen.
 * @param {{to: string, code: string, username: string}} params
 * @returns {Promise<{sent: boolean, reason: string|null}>}
 */
async function sendLinePairingEmail({ to, code, username }) {
  const command = `/link ${username} ${code}`;
  return sendSystemMail({
    to,
    subject: "Your NexusAI LINE linking code",
    text:
      `Someone requested a LINE linking code for the NexusAI account "${username}".\n\n` +
      `Send this command to the bot in LINE to link this account:\n\n` +
      `${command}\n\n` +
      `The command expires after 5 minutes. If you did not request this, you can ignore this email.`,
    html:
      `<p>Someone requested a LINE linking code for the NexusAI account <b>${escapeHtml(username)}</b>.</p>` +
      `<p>Send this command to the bot in LINE to link this account:</p>` +
      `<p style="font-size: 18px; font-weight: bold; letter-spacing: 1px;">${escapeHtml(command)}</p>` +
      `<p>The command expires after 5 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}

/**
 * Sent when a signed-in web user mints a Telegram linking code, so they have the
 * command in their inbox as well as on screen. Mirrors sendLinePairingEmail.
 * @param {{to: string, code: string, username: string}} params
 * @returns {Promise<{sent: boolean, reason: string|null}>}
 */
async function sendTelegramPairingEmail({ to, code, username }) {
  const command = `/link ${username} ${code}`;
  return sendSystemMail({
    to,
    subject: "Your NexusAI Telegram linking code",
    text:
      `Someone requested a Telegram linking code for the NexusAI account "${username}".\n\n` +
      `Send this command to the bot in Telegram to link this account:\n\n` +
      `${command}\n\n` +
      `The command expires after 5 minutes. If you did not request this, you can ignore this email.`,
    html:
      `<p>Someone requested a Telegram linking code for the NexusAI account <b>${escapeHtml(username)}</b>.</p>` +
      `<p>Send this command to the bot in Telegram to link this account:</p>` +
      `<p style="font-size: 18px; font-weight: bold; letter-spacing: 1px;">${escapeHtml(command)}</p>` +
      `<p>The command expires after 5 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}

module.exports = {
  SMTP_PROVIDER_PRESETS,
  resolvedConfig,
  isConfigured,
  isSendingEnabled,
  createTransport,
  sendMail,
  sendTestEmail,
  sendWelcomeEmail,
  sendInviteEmail,
  sendLinePairingEmail,
  sendTelegramPairingEmail,
};
