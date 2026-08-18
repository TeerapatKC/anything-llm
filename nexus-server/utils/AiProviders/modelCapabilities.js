// Best-effort static table of which (provider, model) combinations are known
// to support vision/image input. Used only to short-circuit an obviously
// unsupported attachment with a friendly UNSUPPORTED_ATTACHMENT chat state
// instead of letting the request fail with an opaque provider-level error.
//
// IMPORTANT: absence of a match does NOT necessarily mean "unsupported" - new
// vision-capable models ship constantly and this table will lag behind.
// `supportsVision` only returns `false` when we have some positive knowledge
// of the provider's model lineup and the given model doesn't match any known
// vision pattern; otherwise it returns `"unknown"`. Callers must treat
// `"unknown"` as "allow" so a real request is never blocked by an incomplete
// table - the worst case for an unlisted-but-capable model is a normal
// provider response, not a false rejection.
const VISION_MODEL_PATTERNS = {
  openai: [
    /^gpt-4o/i,
    /^gpt-4\.1/i,
    /^gpt-5/i,
    /^chatgpt-4o/i,
    /^o1(?!-mini$)/i,
    /^o3/i,
    /^o4/i,
  ],
  azure: [/^gpt-4o/i, /^gpt-4\.1/i, /^gpt-5/i],
  anthropic: [/^claude-3/i, /^claude-4/i, /^claude-opus/i, /^claude-sonnet/i, /^claude-haiku/i],
  bedrock: [/claude-3/i, /claude-4/i, /nova/i],
  gemini: [/^gemini-1\.5/i, /^gemini-2/i, /^gemini-pro-vision/i],
  ollama: [/llava/i, /bakllava/i, /vision/i, /moondream/i],
  lmstudio: [/llava/i, /vision/i],
  localai: [/llava/i, /vision/i],
  openrouter: [/vision/i, /gpt-4o/i, /claude-3/i, /claude-4/i, /gemini/i],
  novita: [/vision/i],
  xai: [/^grok-2-vision/i, /^grok-4/i],
  fireworksai: [/vision/i, /llava/i],
  togetherai: [/vision/i, /llava/i],
};

// Providers whose actual model is resolved dynamically at chat time (e.g. a
// model router) - we can't know the target model ahead of this check.
const UNKNOWN_PROVIDERS = new Set(["anythingllm-router"]);

/**
 * Best-effort check for whether a given provider+model combination supports
 * image/vision input.
 * @param {string|null} provider
 * @param {string|null} model
 * @returns {true|false|"unknown"}
 */
function supportsVision(provider, model) {
  if (!provider || !model || UNKNOWN_PROVIDERS.has(provider)) return "unknown";

  const patterns = VISION_MODEL_PATTERNS[provider];
  if (!patterns) return "unknown"; // No knowledge of this provider's vision models at all.

  return patterns.some((pattern) => pattern.test(model));
}

module.exports = { supportsVision };
