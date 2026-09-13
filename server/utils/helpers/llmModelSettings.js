const DEFAULT_CONTEXT_WINDOW = 4096;
const DEFAULT_MAX_TOKENS = 1024;

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function parseModelSettings(
  value = process.env.GENERIC_OPEN_AI_MODEL_SETTINGS
) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return validateModelSettings(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function validateModelSettings(value) {
  if (typeof value === "string") {
    if (Buffer.byteLength(value, "utf8") > 65536)
      return "Model settings are too large";
    try {
      value = JSON.parse(value);
    } catch {
      return "Invalid model settings";
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return "Invalid model settings";
  const models = value.models;
  if (!models || typeof models !== "object" || Array.isArray(models))
    return "Model settings must contain models";
  const entries = Object.entries(models);
  if (!entries.length || entries.length > 256)
    return "Model settings must contain between 1 and 256 models";
  if (
    typeof value.defaultModel !== "string" ||
    !models[value.defaultModel]?.enabled
  )
    return "The default model must be enabled";
  for (const [id, settings] of entries) {
    if (
      !id.trim() ||
      id.length > 512 ||
      !settings ||
      typeof settings !== "object"
    )
      return "Invalid model entry";
    if (typeof settings.enabled !== "boolean")
      return `Invalid enabled state for ${id}`;
    const { contextWindow, maxTokens } = settings;
    if (!Number.isSafeInteger(contextWindow) || contextWindow < 1)
      return `Invalid context window for ${id}`;
    if (
      !Number.isSafeInteger(maxTokens) ||
      maxTokens < 1 ||
      maxTokens > contextWindow
    )
      return `Max tokens must be between 1 and the context window for ${id}`;
  }
  return null;
}

function isModelEnabled(modelId) {
  const config = parseModelSettings();
  return !config || config.models[modelId]?.enabled === true;
}

function resolveModel(modelId) {
  const config = parseModelSettings();
  const preferred = modelId || process.env.GENERIC_OPEN_AI_MODEL_PREF;
  if (!config) return preferred || null;
  if (config.models[preferred]?.enabled) return preferred;
  const environmentDefault = process.env.GENERIC_OPEN_AI_MODEL_PREF;
  if (config.models[environmentDefault]?.enabled) return environmentDefault;
  return config.defaultModel;
}

function settingsForModel(modelId) {
  const config = parseModelSettings();
  const settings = config?.models[modelId];
  return {
    contextWindow:
      settings?.contextWindow ??
      positiveInteger(
        process.env.GENERIC_OPEN_AI_MODEL_TOKEN_LIMIT,
        DEFAULT_CONTEXT_WINDOW
      ),
    maxTokens:
      settings?.maxTokens ??
      positiveInteger(
        process.env.GENERIC_OPEN_AI_MAX_TOKENS,
        DEFAULT_MAX_TOKENS
      ),
  };
}

module.exports = {
  parseModelSettings,
  validateModelSettings,
  isModelEnabled,
  resolveModel,
  settingsForModel,
};
