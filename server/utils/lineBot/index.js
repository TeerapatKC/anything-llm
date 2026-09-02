const crypto = require("crypto");
const { EncryptionManager } = require("../EncryptionManager");

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_BOT_INFO_URL = "https://api.line.me/v2/bot/info";
const LINE_PROFILE_URL = "https://api.line.me/v2/bot/profile";
// LINE rejects a text message body over 5000 chars.
const LINE_TEXT_MESSAGE_LIMIT = 5000;
const ENCRYPTED_PREFIX = "enc:";

/**
 * Verify the `X-Line-Signature` header LINE sends with every webhook request.
 * Must be computed over the exact raw request bytes - a JSON.stringify of the
 * parsed body is not guaranteed to match what LINE actually signed.
 * @param {Buffer} rawBody
 * @param {string} signature
 * @param {string} channelSecret
 * @returns {boolean}
 */
function verifySignature(rawBody, signature, channelSecret) {
  if (!rawBody || !signature || !channelSecret) return false;
  const expected = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    // Length mismatch between the two buffers - definitely not equal.
    return false;
  }
}

/**
 * Whether a webhook path segment matches the configured LINE_WEBHOOK_SECRET.
 * If no secret is configured, the plain (secret-less) path is accepted -
 * this is opt-in hardening, not a requirement.
 * @param {string|undefined} providedSecret - the `:secret` route param, if any
 * @returns {boolean}
 */
function matchesWebhookSecret(providedSecret) {
  const requiredSecret = process.env.LINE_WEBHOOK_SECRET;
  if (!requiredSecret) return !providedSecret;
  if (!providedSecret) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(requiredSecret)
    );
  } catch {
    // Length mismatch - definitely not equal.
    return false;
  }
}

/**
 * Encrypt a channel token/secret for safe storage in the database.
 * @param {string} token
 * @returns {string|null}
 */
function encryptToken(token) {
  if (!token) return null;
  const manager = new EncryptionManager();
  const encrypted = manager.encrypt(token);
  return encrypted ? ENCRYPTED_PREFIX + encrypted : null;
}

/**
 * Decrypt an encrypted channel token/secret from the database.
 * @param {string} encryptedToken
 * @returns {string|null}
 */
function decryptToken(encryptedToken) {
  if (!encryptedToken) return null;
  if (!encryptedToken.startsWith(ENCRYPTED_PREFIX)) return encryptedToken;
  const manager = new EncryptionManager();
  return manager.decrypt(encryptedToken.slice(ENCRYPTED_PREFIX.length));
}

/**
 * Verify a channel access token by calling LINE's bot info endpoint - the
 * closest LINE equivalent to Telegram's getMe, used to fail fast on a bad
 * paste rather than only discovering it the first time a message comes in.
 *
 * Also captures the channel's Basic ID (the "@xxxx" handle people search for
 * in the LINE app to add the bot as a friend) - LINE has no API to fetch this
 * separately, but bot/info already returns it, so there's no need for an
 * admin to type it in by hand.
 * @param {string} accessToken
 * @returns {Promise<{valid: boolean, displayName: string|null, basicId: string|null, error: string|null}>}
 */
async function verifyChannelAccessToken(accessToken) {
  try {
    const response = await fetch(LINE_BOT_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        valid: false,
        displayName: null,
        basicId: null,
        error: body?.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      valid: true,
      displayName: data?.displayName || data?.basicId || null,
      basicId: data?.basicId || null,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      displayName: null,
      basicId: null,
      error: error.message,
    };
  }
}

/**
 * Fetch a LINE user's display name for a friendlier admin-facing label than a
 * raw userId - purely cosmetic, never used for identity decisions.
 * @param {string} lineUserId
 * @param {string} accessToken
 * @returns {Promise<string|null>}
 */
async function getUserProfile(lineUserId, accessToken) {
  try {
    const response = await fetch(`${LINE_PROFILE_URL}/${lineUserId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.displayName || null;
  } catch {
    return null;
  }
}

/**
 * Reply to a LINE message event via the Reply API. A replyToken can only be
 * used once and expires shortly after the event is delivered, so this must
 * be called soon after the webhook fires.
 * @param {string} replyToken
 * @param {string} text
 * @param {string} accessToken - the connected channel's decrypted access token
 */
async function replyMessage(replyToken, text, accessToken) {
  if (!accessToken)
    throw new Error("No LINE channel access token available.");

  const body = String(text ?? "").slice(0, LINE_TEXT_MESSAGE_LIMIT);
  const response = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: body }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`LINE reply API failed (${response.status}): ${errText}`);
  }
}

module.exports = {
  verifySignature,
  matchesWebhookSecret,
  encryptToken,
  decryptToken,
  verifyChannelAccessToken,
  getUserProfile,
  replyMessage,
  LINE_TEXT_MESSAGE_LIMIT,
};
