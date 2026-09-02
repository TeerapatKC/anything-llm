const crypto = require("crypto");

/**
 * Account-linking codes for the shared LINE bot.
 *
 * The code is minted in the web app by a signed-in user, so holding one already
 * proves control of that account; typing it into LINE is what proves control of
 * the chat. Codes live in memory only - they are short-lived, single-use, and a
 * restart losing them costs nothing more than asking for a new one.
 *
 * Deliberately a separate Map from Telegram's equivalent (server/utils/telegramBot/utils/pairing.js)
 * rather than a shared one: sharing would mean requesting a LINE code silently
 * invalidates a pending Telegram code for the same user (createPairingCode only
 * keeps one code per user), which would surprise anyone linking both platforms
 * around the same time.
 *
 * NOTE: this is per-process state. An instance running multiple server processes
 * behind a load balancer would need to move this into the database.
 */

/** How long a freshly minted code stays valid. */
const CODE_TTL_MS = 5 * 60 * 1000;

/** Attempts one LINE chat may make before it is told to wait. */
const MAX_ATTEMPTS = 5;

/** Window the attempt counter is measured over. */
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

/** code -> { userId, username, expiresAt } */
const codes = new Map();

/** lineUserId -> { count, windowStartedAt } */
const attempts = new Map();

/**
 * Generate a random 6-digit code. crypto.randomInt is uniform, unlike Math.random
 * scaled into a range, which matters when the code is the only secret involved.
 * @returns {string}
 */
function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

/**
 * Drop every expired code. Cheap enough to run on each access - the map only ever
 * holds one entry per user who is mid-link.
 */
function sweep() {
  const now = Date.now();
  for (const [code, entry] of codes) {
    if (entry.expiresAt <= now) codes.delete(code);
  }
}

/**
 * Mint a linking code for a signed-in user, replacing any code they already hold
 * so an old code cannot be used after they ask for a fresh one.
 * @param {{id: number, username: string}} user
 * @returns {{code: string, expiresAt: number, ttlMs: number}}
 */
function createPairingCode(user) {
  sweep();
  for (const [code, entry] of codes) {
    if (entry.userId === user.id) codes.delete(code);
  }

  let code = generateCode();
  while (codes.has(code)) code = generateCode();

  const expiresAt = Date.now() + CODE_TTL_MS;
  codes.set(code, {
    userId: user.id,
    username: String(user.username || "").toLowerCase(),
    expiresAt,
  });
  return { code, expiresAt, ttlMs: CODE_TTL_MS };
}

/**
 * Whether this chat may make another attempt right now. The counter is what stops
 * a chat from walking the 6-digit space; it is only advanced on a failure.
 * @param {string} lineUserId
 * @returns {{allowed: boolean, retryInSeconds: number}}
 */
function checkAttemptAllowance(lineUserId) {
  const now = Date.now();
  const entry = attempts.get(String(lineUserId));
  if (!entry) return { allowed: true, retryInSeconds: 0 };

  if (now - entry.windowStartedAt >= ATTEMPT_WINDOW_MS) {
    attempts.delete(String(lineUserId));
    return { allowed: true, retryInSeconds: 0 };
  }

  if (entry.count < MAX_ATTEMPTS) return { allowed: true, retryInSeconds: 0 };
  return {
    allowed: false,
    retryInSeconds: Math.ceil(
      (entry.windowStartedAt + ATTEMPT_WINDOW_MS - now) / 1000
    ),
  };
}

/**
 * Record a failed attempt against a chat.
 * @param {string} lineUserId
 */
function recordFailedAttempt(lineUserId) {
  const key = String(lineUserId);
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.windowStartedAt >= ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  entry.count += 1;
}

/**
 * Clear the attempt counter for a chat after a successful link.
 * @param {string} lineUserId
 */
function clearAttempts(lineUserId) {
  attempts.delete(String(lineUserId));
}

/**
 * Redeem a code. The username must match the account the code was minted for -
 * on its own the code is enough, but the pairing means a code pasted into the
 * wrong chat by mistake cannot silently bind someone else's account.
 *
 * Failures are deliberately indistinguishable to the caller so a wrong guess
 * never reveals whether the code or the username was the part that was wrong.
 * @param {{code: string, username: string}} params
 * @returns {{userId: number|null, error: string|null}}
 */
function consumePairingCode({ code, username }) {
  sweep();
  const entry = codes.get(String(code).trim());
  if (!entry) return { userId: null, error: "invalid" };

  if (entry.username !== String(username).trim().toLowerCase())
    return { userId: null, error: "invalid" };

  codes.delete(String(code).trim());
  return { userId: entry.userId, error: null };
}

/**
 * Discard any code a user is holding. Used when they unlink, so a code minted
 * moments before cannot re-link the account they just detached.
 * @param {number} userId
 */
function revokeCodesForUser(userId) {
  for (const [code, entry] of codes) {
    if (entry.userId === Number(userId)) codes.delete(code);
  }
}

module.exports = {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  ATTEMPT_WINDOW_MS,
  createPairingCode,
  consumePairingCode,
  checkAttemptAllowance,
  recordFailedAttempt,
  clearAttempts,
  revokeCodesForUser,
};
