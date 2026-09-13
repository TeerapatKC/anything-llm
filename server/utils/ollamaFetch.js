function applyOllamaFetch() {
  const timeout = Number(process.env.OLLAMA_RESPONSE_TIMEOUT);
  if (!Number.isFinite(timeout) || timeout <= 5 * 60_000) return fetch;

  const { Agent } = require("undici");
  return (input, init = {}) =>
    fetch(input, {
      ...init,
      dispatcher: new Agent({ headersTimeout: timeout }),
    });
}

module.exports = { applyOllamaFetch };
