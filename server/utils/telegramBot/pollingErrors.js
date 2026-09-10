/**
 * Telegram permits only one long-polling getUpdates consumer per bot token.
 * A 409 is therefore a deployment/configuration conflict, not a transient
 * network failure that exponential backoff can repair.
 * @param {object} error
 * @returns {boolean}
 */
function isTelegramPollingConflict(error = {}) {
  const status =
    error?.response?.statusCode ??
    error?.response?.status ??
    error?.response?.body?.error_code;
  if (Number(status) === 409) return true;

  const message = String(error?.message || "");
  return (
    /\b409\b/.test(message) &&
    /conflict|getupdates|other request/i.test(message)
  );
}

module.exports = { isTelegramPollingConflict };
