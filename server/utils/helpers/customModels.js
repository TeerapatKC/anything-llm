const {
  fetchOpenRouterEmbeddingModels,
} = require("../EmbeddingEngines/openRouter");
const { ElevenLabsTTS } = require("../TextToSpeech/elevenLabs");
const { getAllLemonadeModels } = require("../lemonadeModels");
const { isModelEnabled } = require("./llmModelSettings");

const SUPPORT_CUSTOM_MODELS = [
  "generic-openai",
  "elevenlabs-tts",
  "openai-imggen",
  "openrouter-imggen",
  "ollama-imggen",
  "lemonade-imggen",
  "localai-imggen",
  "native-embedder",
  "cohere-embedder",
  "openrouter-embedder",
  "lemonade-embedder",
  "openai-stt",
  "deepgram-stt",
  "lemonade-stt",
  "groq-stt",
  "generic-openai-stt",
  "kokoro-tts",
  "generic-openai-tts",
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
    case "openai-stt":
      return openAiSttModels(apiKey);
    case "groq-stt":
      return getGroqSTTModels(apiKey);
    case "elevenlabs-tts":
      return getElevenLabsModels(apiKey);
    case "openai-imggen":
      return getOpenAiImageModels(apiKey);
    case "openrouter-imggen":
      return getOpenRouterImageModels();
    case "ollama-imggen":
      return getOllamaImageModels(basePath, apiKey);
    case "lemonade-imggen":
      return getLemonadeModels(
        basePath,
        "image",
        unmaskedSecret(apiKey) || process.env.IMAGE_GEN_LEMONADE_API_KEY || null
      );
    case "localai-imggen":
      return getLocalAiImageModels(basePath, apiKey);
    case "native-embedder":
      return getNativeEmbedderModels();
    case "cohere-embedder":
      return getCohereModels(apiKey, "embed");
    case "openrouter-embedder":
      return getOpenRouterEmbeddingModels();
    case "lemonade-embedder":
      return getLemonadeModels(basePath, "embedding");
    case "lemonade-stt":
      return getLemonadeSTTModels(basePath);
    case "deepgram-stt":
      return getDeepgramSTTModels(apiKey);
    case "kokoro-tts":
      return kokoroTtsVoices(basePath, apiKey);
    case "generic-openai-stt":
      return getOpenAiCompatibleAudioModels("stt", basePath, apiKey);
    case "generic-openai-tts":
      return getOpenAiCompatibleAudioModels("tts", basePath, apiKey);
    default:
      return { models: [], error: "Invalid provider for custom models" };
  }
}

async function openAiSttModels(apiKey = null) {
  const fallback = [
    { id: "whisper-1", name: "whisper-1", organization: "OpenAi" },
    {
      id: "gpt-4o-transcribe",
      name: "gpt-4o-transcribe",
      organization: "OpenAi",
    },
    {
      id: "gpt-4o-mini-transcribe",
      name: "gpt-4o-mini-transcribe",
      organization: "OpenAi",
    },
  ];

  const { OpenAI: OpenAIApi } = require("openai");
  const openai = new OpenAIApi({
    apiKey: apiKey || process.env.OPEN_AI_KEY,
  });

  const allModels = await openai.models
    .list()
    .then((results) => results.data)
    .catch((e) => {
      console.error(`OpenAI:listModels (stt)`, e.message);
      return null;
    });

  if (!allModels) return { models: fallback, error: null };

  // The /v1/models response has no category/type field, so we filter by id.
  // Realtime variants use a separate WebSocket API and are not compatible
  // with the audio.transcriptions.create endpoint we use server-side.
  const models = allModels
    .filter(
      (m) =>
        (m.id.includes("whisper") || m.id.includes("transcribe")) &&
        !m.id.includes("realtime")
    )
    .map((m) => ({ ...m, name: m.id, organization: "OpenAi" }));

  return { models: models.length ? models : fallback, error: null };
}

async function getGroqSTTModels(_apiKey = null) {
  const { OpenAI: OpenAIApi } = require("openai");
  const apiKey =
    _apiKey === true
      ? process.env.STT_GROQ_API_KEY
      : _apiKey || process.env.STT_GROQ_API_KEY || null;

  const openai = new OpenAIApi({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });
  const models = (
    await openai.models
      .list()
      .then((results) => results.data)
      .catch((e) => {
        console.error(`GroqSTT:listModels`, e.message);
        return [];
      })
  ).filter((model) => model.id.includes("whisper"));

  // Api Key was successful so lets save it for future uses
  if (models.length > 0 && !!apiKey) process.env.GROQ_STT_API_KEY = apiKey;
  return { models, error: null };
}

async function getElevenLabsModels(apiKey = null) {
  const models = (await ElevenLabsTTS.voices(apiKey)).map((model) => {
    return {
      id: model.voice_id,
      organization: model.category,
      name: model.name,
    };
  });

  if (models.length === 0) {
    return {
      models: [
        {
          id: "21m00Tcm4TlvDq8ikWAM",
          organization: "premade",
          name: "Rachel (default)",
        },
      ],
      error: null,
    };
  }

  if (models.length > 0 && !!apiKey) process.env.TTS_ELEVEN_LABS_KEY = apiKey;
  return { models, error: null };
}

function getNativeEmbedderModels() {
  const { NativeEmbedder } = require("../EmbeddingEngines/native");
  return { models: NativeEmbedder.availableModels(), error: null };
}

async function getCohereModels(_apiKey = null, type = "chat") {
  const apiKey =
    _apiKey === true
      ? process.env.COHERE_API_KEY
      : _apiKey || process.env.COHERE_API_KEY || null;

  // Cohere's models endpoint is queried directly so we can keep filtering by
  // endpoint (chat/embed) which the OpenAI-compatible /models route does not support.
  const models = await fetch(
    `https://api.cohere.com/v1/models?page_size=1000&endpoint=${type}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  )
    .then((res) => res.json())
    .then((data) => data?.models || [])
    .then((models) =>
      models.map((model) => ({
        id: model.name,
        name: model.name,
      }))
    )
    .catch((e) => {
      console.error(`Cohere:listModels`, e.message);
      return [];
    });

  return { models, error: null };
}

async function getOpenRouterEmbeddingModels() {
  const knownModels = await fetchOpenRouterEmbeddingModels();
  if (!Object.keys(knownModels).length === 0)
    return { models: [], error: null };

  const models = Object.values(knownModels).map((model) => {
    return {
      id: model.id,
      organization: model.organization,
      name: model.name,
    };
  });
  return { models, error: null };
}

async function getLemonadeModels(
  basePath = null,
  task = "chat",
  apiKey = null
) {
  try {
    const models = await getAllLemonadeModels(basePath, task, apiKey);
    return { models, error: null };
  } catch (e) {
    console.error(`Lemonade:getLemonadeModels`, e.message);
    return { models: [], error: "Could not fetch Lemonade Models" };
  }
}

async function getLemonadeSTTModels(basePath = null) {
  try {
    const models = await getAllLemonadeModels(basePath, "transcription");
    return { models, error: null };
  } catch (e) {
    console.error(`Lemonade:getLemonadeSTTModels`, e.message);
    return { models: [], error: "Could not fetch Lemonade STT Models" };
  }
}

async function getDeepgramSTTModels(_apiKey = null) {
  const apiKey =
    _apiKey === true
      ? process.env.STT_DEEPGRAM_API_KEY
      : _apiKey || process.env.STT_DEEPGRAM_API_KEY || null;
  if (!apiKey)
    return { models: [], error: "No Deepgram API key was provided." };

  try {
    const response = await fetch("https://api.deepgram.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!response.ok) throw new Error(`Deepgram returned ${response.status}`);

    let models = new Map();
    const data = await response.json();
    (data?.stt ?? [])
      .filter((m) => m.batch !== false)
      .forEach((m) => {
        if (models.has(m.canonical_name)) return;
        models.set(m.canonical_name, {
          id: m.canonical_name,
          name: m.canonical_name,
          organization: "Deepgram",
        });
      });

    models = Array.from(models.values());
    // Api Key was successful so lets save it for future uses
    if (models.length > 0 && _apiKey) process.env.STT_DEEPGRAM_API_KEY = apiKey;
    return { models, error: null };
  } catch (e) {
    console.error(`Deepgram:getDeepgramSTTModels`, e.message);
    return { models: [], error: "Could not fetch Deepgram STT models" };
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
 * Pulls the live voice list from a self-hosted kokoro-fastapi server's
 * /audio/voices endpoint. basePath is the OpenAI-compatible base URL the
 * user pointed at their kokoro instance (e.g. http://localhost:8880/v1).
 * @param {string} basePath - The base path to the Kokoro instance.
 * @param {string} apiKey - The API key to use.
 * @returns {Promise<{models: Array<{id: string, organization: string, name: string}>, error: string | null}>}
 */
async function kokoroTtsVoices(basePath = null, apiKey = null) {
  let endpoint = basePath || process.env.TTS_KOKORO_ENDPOINT;
  if (!endpoint)
    return { models: [], error: "No Kokoro endpoint was provided." };

  endpoint = new URL(endpoint);
  endpoint.pathname = "/v1/audio/voices";
  const headers = { "Content-Type": "application/json" };
  const key = typeof apiKey === "boolean" ? null : apiKey;
  if (key) headers.Authorization = `Bearer ${key}`;

  const voices = await fetch(endpoint.toString(), { method: "GET", headers })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText || "Failed to load voices");
      return res.json();
    })
    .then((data) => (Array.isArray(data?.voices) ? data.voices : []))
    .catch((e) => {
      console.error(`Kokoro:listVoices`, e.message);
      return null;
    });

  if (!voices || !Array.isArray(voices))
    return { models: [], error: "Could not fetch Kokoro voices." };

  // kokoro-fastapi < 0.3.x returns voices as plain id strings while >= 0.3.x
  // returns { id, name } objects. Normalize both shapes to { id, name } so the
  // voice list renders regardless of the kokoro-fastapi version being used.
  const models = voices
    .map((voice) => {
      if (typeof voice === "string")
        return { id: voice, name: voice, organization: "Kokoro" };
      if (voice && typeof voice === "object" && voice.id)
        return {
          id: voice.id,
          name: voice.name || voice.id,
          organization: "Kokoro",
        };
      return null;
    })
    .filter(Boolean);
  return { models, error: null };
}

/**
 * Get AWS Bedrock models
 * @param {string} _apiKey - The API key to use
 * @param {Object} options - The options to use
 * @param {string} [options.region] - The region to use
 * @returns {Promise<{models: Array<{id: string, organization: string, name: string}>, error: string | null}>}
 */
const OPENAI_IMAGE_MODEL_FAMILIES = /dall-e|gpt-image/i;

/**
 * Lists the OpenAI image-capable models the account can access by filtering its
 * live model list to the known image model families. Returns nothing when the
 * endpoint cannot be reached so the UI falls back to its manual-entry input.
 * @param {string|null} apiKey - OpenAI API key; defaults to IMAGE_GEN_OPENAI_KEY when null
 * @returns {Promise<{models: {id: string, name: string}[], error: string|null}>}
 */
async function getOpenAiImageModels(apiKey = null) {
  const { OpenAI: OpenAIApi } = require("openai");
  const openai = new OpenAIApi({
    apiKey: unmaskedSecret(apiKey) || process.env.IMAGE_GEN_OPENAI_KEY,
  });
  const models = await openai.models
    .list()
    .then((results) => results.data)
    .then((all) =>
      all
        .filter((model) => OPENAI_IMAGE_MODEL_FAMILIES.test(model.id))
        .map((model) => ({ id: model.id, name: model.id }))
    )
    .catch((e) => {
      console.error(`OpenAI:listImageModels`, e.message);
      return [];
    });
  return { models, error: null };
}

/**
 * The UI sends back a masked placeholder (eg: "********") for secrets that are
 * already saved, so those must never be forwarded to a provider - the stored
 * env value is used instead.
 * @param {string|boolean|null} value
 * @returns {string|null}
 */
function unmaskedSecret(value = null) {
  if (typeof value !== "string" || value.includes("****")) return null;
  return value || null;
}

/**
 * Lists the image-capable models installed on an Ollama server. Ollama reports
 * per-model capabilities in `/api/tags`, so we filter on the `image` capability
 * - chat and vision models cannot be used for image generation.
 * @param {string|null} basePath - Ollama base path; defaults to IMAGE_GEN_OLLAMA_BASE_PATH when null
 * @param {string|boolean|null} authToken - Ollama bearer token; defaults to IMAGE_GEN_OLLAMA_AUTH_TOKEN when null
 * @returns {Promise<{models: {id: string, name: string}[], error: string|null}>}
 */
async function getOllamaImageModels(basePath = null, authToken = null) {
  let url;
  try {
    const urlPath = basePath ?? process.env.IMAGE_GEN_OLLAMA_BASE_PATH;
    new URL(urlPath);
    url = urlPath.replace(/\/+$/, "");
  } catch {
    return { models: [], error: "Not a valid URL." };
  }

  const _authToken =
    unmaskedSecret(authToken) ||
    process.env.IMAGE_GEN_OLLAMA_AUTH_TOKEN ||
    null;
  const models = await fetch(`${url}/api/tags`, {
    headers: _authToken ? { Authorization: `Bearer ${_authToken}` } : {},
  })
    .then((res) => {
      if (!res.ok)
        throw new Error(`Could not reach Ollama server! ${res.status}`);
      return res.json();
    })
    .then((data) => data?.models || [])
    .then((models) =>
      models
        .filter((model) => model?.capabilities?.includes("image"))
        .map((model) => ({ id: model.name, name: model.name }))
    )
    .catch((e) => {
      console.error(`Ollama:listImageModels`, e.message);
      return [];
    });
  return { models, error: null };
}

/**
 * Lists the image-capable models installed on a LocalAI server. LocalAI reports
 * per-model capabilities on `/v1/models/capabilities`, so we filter on the
 * `image` capability - chat and vision models cannot be used for image
 * generation.
 * @param {string|null} basePath - LocalAI base path (`/v1` suffixed); defaults to IMAGE_GEN_LOCALAI_BASE_PATH when null
 * @param {string|boolean|null} apiKey - LocalAI API key; defaults to IMAGE_GEN_LOCALAI_API_KEY when null
 * @returns {Promise<{models: {id: string, name: string}[], error: string|null}>}
 */
async function getLocalAiImageModels(basePath = null, apiKey = null) {
  let url;
  try {
    const urlPath = basePath ?? process.env.IMAGE_GEN_LOCALAI_BASE_PATH;
    new URL(urlPath);
    url = urlPath.replace(/\/+$/, "");
  } catch {
    return { models: [], error: "Not a valid URL." };
  }

  const _apiKey =
    unmaskedSecret(apiKey) || process.env.IMAGE_GEN_LOCALAI_API_KEY || null;
  const models = await fetch(`${url}/models/capabilities`, {
    headers: _apiKey ? { Authorization: `Bearer ${_apiKey}` } : {},
  })
    .then((res) => {
      if (!res.ok)
        throw new Error(`Could not reach LocalAI server! ${res.status}`);
      return res.json();
    })
    .then((data) => data?.data || [])
    .then((models) =>
      models
        .filter((model) => model?.capabilities?.includes("image"))
        .map((model) => ({ id: model.id, name: model.id }))
    )
    .catch((e) => {
      console.error(`LocalAI:listImageModels`, e.message);
      return [];
    });
  return { models, error: null };
}

/**
 * Lists OpenRouter models that can output images (image output modality).
 * @returns {Promise<{models: {id: string, name: string, organization: string}[], error: string|null}>}
 */
async function getOpenRouterImageModels() {
  const models = await fetch("https://openrouter.ai/api/v1/models")
    .then((res) => res.json())
    .then(({ data = [] }) =>
      data
        .filter((model) =>
          model?.architecture?.output_modalities?.includes("image")
        )
        .map((model) => ({
          id: model.id,
          name: model.name,
          organization: model.id.split("/")[0],
        }))
    )
    .catch((e) => {
      console.error(`OpenRouter:listImageModels`, e.message);
      return [];
    });
  return { models, error: null };
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

module.exports = {
  getCustomModels,
  availableLlmModels,
  SUPPORT_CUSTOM_MODELS,
};
