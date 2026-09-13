const { isModelEnabled } = require("./llmModelSettings");

const SUPPORT_CUSTOM_MODELS = [
  "generic-openai",
  "native-embedder",
  "generic-openai-embedder",
  "generic-openai-stt",
  "generic-openai-tts",
  "generic-openai-tts-voices",
];

function availableLlmModels(
  models,
  allowed = process.env.GENERIC_OPEN_AI_ALLOWED_MODELS,
  includeDisabled = false
) {
  const selectedIds = allowed?.trim()
    ? new Set(
        allowed
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      )
    : null;
  return models
    .filter((model) => typeof model.id === "string" && model.id.trim())
    .filter((model) => !selectedIds || selectedIds.has(model.id))
    .filter((model) => includeDisabled || isModelEnabled(model.id))
    .map(({ id, name }) => ({ id, name: name || id }));
}

/**
 * Whether a value handed to us as an API key is actually one.
 *
 * The settings UI shows a row of asterisks in the key field when a key is already saved,
 * and `SystemSettings` reports saved keys as booleans (`!!process.env.KEY`) so the real
 * secret never leaves the server. Either can end up posted back as the "key", and the
 * model-listing helpers below cache whatever they are given into `process.env` - which
 * `dumpENV` then writes to the env file, destroying the real credential.
 *
 * `updateENV` already refuses masked values on the settings-save path; this is the same
 * rule for the model-listing path, which does not go through it.
 *
 * @param {any} value
 * @returns {boolean}
 */
function usableCredential(value) {
  if (typeof value !== "string") return false; // booleans from `!!key` settings payloads
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\*+$/.test(trimmed)) return false; // the field's own placeholder
  if (trimmed.includes("******")) return false; // matches updateENV's rule
  return true;
}

async function getCustomModels(
  provider = "",
  apiKey = null,
  basePath = null,
  _options = {}
) {
  if (!SUPPORT_CUSTOM_MODELS.includes(provider))
    return { models: [], error: "Invalid provider for custom models" };

  // Normalised once, here, rather than in each of the ~19 helpers below: they all treat
  // a truthy `apiKey` as "the user supplied a new key", both for the outbound request and
  // for caching it back into `process.env`. Anything that is not a real secret becomes
  // null so they fall back to the stored key and cache nothing.
  if (!usableCredential(apiKey)) apiKey = null;

  switch (provider) {
    case "generic-openai":
      return getGenericOpenAiModels(basePath, apiKey);
    case "native-embedder":
      return getNativeEmbedderModels();
    case "generic-openai-embedder":
      return getGenericOpenAiEmbeddingModels();
    case "generic-openai-stt":
      return getOpenAiCompatibleAudioModels("stt", basePath, apiKey);
    case "generic-openai-tts":
      return getOpenAiCompatibleAudioModels("tts", basePath, apiKey);
    case "generic-openai-tts-voices":
      return getOpenAiCompatibleTtsVoices();
    default:
      return { models: [], error: "Invalid provider for custom models" };
  }
}

function getNativeEmbedderModels() {
  const { NativeEmbedder } = require("../EmbeddingEngines/native");
  return { models: NativeEmbedder.availableModels(), error: null };
}

async function getGenericOpenAiEmbeddingModels() {
  const endpoint = process.env.EMBEDDING_BASE_PATH;
  if (!endpoint)
    return { models: [], error: "Embedding model service is not configured" };

  try {
    const { OpenAI } = require("openai");
    const client = new OpenAI({
      baseURL: endpoint,
      apiKey: process.env.GENERIC_OPEN_AI_EMBEDDING_API_KEY || "unused",
      timeout: 10000,
    });
    const result = await client.models.list();
    return {
      models: result.data
        .filter((model) => typeof model.id === "string" && model.id.trim())
        .map((model) => ({ id: model.id, name: model.id })),
      error: null,
    };
  } catch (error) {
    console.error("GenericOpenAI:getEmbeddingModels", error.message);
    return {
      models: [],
      error: "Could not reach the configured embedding model service",
    };
  }
}

/**
 * List models from the configured OpenAI-compatible LLM endpoint.
 * @param {string|null} basePath - Optional URL override for settings validation.
 * @param {string|null} apiKey - Optional credential override for settings validation.
 * @returns {Promise<{models: Array<{id: string, organization: string, name: string}>, error: string | null}>}
 */
async function getGenericOpenAiModels(basePath = null, apiKey = null) {
  try {
    const endpoint = basePath || process.env.GENERIC_OPEN_AI_BASE_PATH;
    if (!endpoint)
      return { models: [], error: "LLM model service is not configured" };
    const { OpenAI: OpenAIApi } = require("openai");
    const openai = new OpenAIApi({
      baseURL: endpoint,
      apiKey: apiKey || process.env.GENERIC_OPEN_AI_API_KEY || "unused",
      timeout: 10000,
    });
    const results = await openai.models.list();
    const models = results.data.map((model) => ({
      id: model.id,
      name: model.id,
      organization: model.owned_by ?? "generic-openai",
    }));

    if (models.length > 0 && !!apiKey)
      process.env.GENERIC_OPEN_AI_API_KEY = apiKey;
    return { models, error: null };
  } catch (e) {
    console.error(`GenericOpenAI:getGenericOpenAiModels`, e.message);
    return {
      models: [],
      error: "Could not reach the configured LLM model service",
    };
  }
}

/**
 * Lists the models advertised by a user-provided OpenAI-compatible STT or TTS
 * service via its `/models` endpoint. Nothing is cached back into `process.env`
 * here - these endpoints are configured on the audio preferences page and share
 * no credential with the generic-openai LLM provider.
 * @param {"stt"|"tts"} type - Which audio provider's endpoint/key to read.
 * @param {string} basePath - The OpenAI-compatible base URL (eg: http://localhost:8000/v1).
 * @param {string} apiKey - The API key to use, if any.
 * @returns {Promise<{models: Array<{id: string, organization: string, name: string}>, error: string | null}>}
 */
async function getOpenAiCompatibleAudioModels(
  type = "stt",
  basePath = null,
  apiKey = null
) {
  const endpoint =
    basePath ||
    (type === "stt"
      ? process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT
      : process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT);
  if (!endpoint) return { models: [], error: "No base URL was provided." };

  const key =
    apiKey ||
    (type === "stt"
      ? process.env.STT_OPEN_AI_COMPATIBLE_KEY
      : process.env.TTS_OPEN_AI_COMPATIBLE_KEY) ||
    null;

  try {
    const { OpenAI: OpenAIApi } = require("openai");
    const openai = new OpenAIApi({ baseURL: endpoint, apiKey: key });
    const models = await openai.models
      .list()
      .then((results) => results.data)
      .then((models) =>
        models.map((model) => ({
          id: model.id,
          name: model.id,
          organization: model.owned_by ?? "generic-openai",
        }))
      );
    return { models, error: null };
  } catch (e) {
    // Plenty of self-hosted STT/TTS servers do not implement `/models` at all -
    // the UI falls back to a free-text model field when nothing comes back.
    console.error(
      `OpenAiCompatible${type.toUpperCase()}:listModels`,
      e.message
    );
    return {
      models: [],
      error: `Could not fetch models from ${endpoint}`,
    };
  }
}

/**
 * Read available voices from the configured TTS service. VoxCPM2 exposes
 * /v1/voices; other OpenAI-compatible services may use /v1/audio/voices.
 * This uses only the server's configured endpoint and credential.
 */
async function getOpenAiCompatibleTtsVoices() {
  const basePath = process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT;
  if (!basePath) return { models: [], error: "No TTS endpoint is configured." };

  try {
    const base = new URL(basePath);
    const path = base.pathname.replace(/\/+$/, "");
    const headers = {};
    if (process.env.TTS_OPEN_AI_COMPATIBLE_KEY)
      headers.Authorization = `Bearer ${process.env.TTS_OPEN_AI_COMPATIBLE_KEY}`;

    for (const suffix of ["/voices", "/audio/voices"]) {
      const endpoint = new URL(base);
      endpoint.pathname = `${path}${suffix}`;
      try {
        const response = await fetch(endpoint, {
          headers,
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) continue;
        const data = await response.json();
        const voices = Array.isArray(data?.voices)
          ? data.voices
          : data?.voices && typeof data.voices === "object"
            ? Object.keys(data.voices)
            : [];
        const models = voices
          .map((voice) => {
            const id = typeof voice === "string" ? voice : voice?.id;
            return id ? { id, name: voice?.name || id } : null;
          })
          .filter(Boolean);
        return { models, error: null };
      } catch {
        // Try the other common voice-list route before reporting failure.
      }
    }
  } catch (error) {
    return { models: [], error: `Invalid TTS endpoint: ${error.message}` };
  }
  return { models: [], error: "Could not load voices from the TTS service." };
}

module.exports = {
  getCustomModels,
  availableLlmModels,
  SUPPORT_CUSTOM_MODELS,
};
