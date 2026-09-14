/**
 * Knows which generic-openai models can see images, and removes images from a
 * request for the ones that cannot.
 *
 * A text-only model does not ignore an image - llama.cpp rejects the whole
 * request with a 500 ("image input is not supported") when the model was started
 * without an mmproj. In router mode several models sit behind one URL and only
 * some of them have a vision encoder, so this has to be answered per model, not
 * per provider.
 */

const CACHE_TTL_MS = 60 * 1000;
const LOOKUP_TIMEOUT_MS = 5000;
const IMAGE_OMITTED_NOTE =
  "[An image was attached here but not sent: the selected model cannot view images.]";

/** @type {Map<string, {at: number, entries: Promise<object[]|null>}>} */
const modelListCache = new Map();

/**
 * Mirrors attachmentToContentBlock: audio goes out as input_audio, and
 * everything else goes out as image_url.
 * @param {import("./index").Attachment} attachment
 * @returns {boolean}
 */
function isAudioAttachment(attachment) {
  return (
    !!attachment?.mime?.startsWith("audio/") ||
    !!attachment?.contentString?.startsWith("data:audio/")
  );
}

/**
 * Reads image support off one entry of a `/models` response.
 *
 * An mmproj in the llama.cpp launch args or preset is checked before the
 * reported modalities, so a vision model is never mistaken for a text-only one
 * just because it has not been loaded yet.
 * @param {object} entry - one item of the `/models` `data` array
 * @returns {boolean|null} null when the entry does not say
 */
function visionFromModelEntry(entry) {
  if (!entry || typeof entry !== "object") return null;

  const args = Array.isArray(entry.status?.args) ? entry.status.args : [];
  const preset =
    typeof entry.status?.preset === "string" ? entry.status.preset : "";
  const presetKeys = new Set(
    preset
      .split("\n")
      .map((line) => line.match(/^\s*([\w-]+)\s*=/)?.[1])
      .filter(Boolean)
  );
  const hasOption = (...names) =>
    names.some(
      (name) => args.includes(name) || presetKeys.has(name.replace(/^-+/, ""))
    );

  if (hasOption("--no-mmproj")) return false;
  if (hasOption("--mmproj", "--mmproj-url") || hasOption("-mm", "-mmu"))
    return true;

  const modalities = entry.architecture?.input_modalities;
  if (Array.isArray(modalities)) return modalities.includes("image");
  return null;
}

async function fetchModelEntries(basePath) {
  const { OpenAI } = require("openai");
  const { GenericOpenAiLLM } = require("../AiProviders/genericOpenAi");
  const client = new OpenAI({
    baseURL: basePath,
    apiKey: process.env.GENERIC_OPEN_AI_API_KEY || "unused",
    defaultHeaders: GenericOpenAiLLM.parseCustomHeaders(),
    timeout: LOOKUP_TIMEOUT_MS,
    maxRetries: 0,
  });
  const result = await client.models.list();
  return Array.isArray(result?.data) ? result.data : [];
}

/**
 * The configured service's model list, cached briefly so a chat turn does not
 * cost an extra request. A failed lookup is cached too, as null.
 * @returns {Promise<object[]|null>}
 */
function listModelEntries() {
  const basePath = process.env.GENERIC_OPEN_AI_BASE_PATH;
  if (!basePath) return Promise.resolve(null);

  const cached = modelListCache.get(basePath);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.entries;

  const entries = fetchModelEntries(basePath).catch((error) => {
    console.error(
      `[modelVision] Could not read the model list from ${basePath}: ${error.message}`
    );
    return null;
  });
  modelListCache.set(basePath, { at: Date.now(), entries });
  return entries;
}

/**
 * Whether a model can be sent images. Anything that cannot be determined - an
 * unreachable service, a model missing from the list, a service that reports
 * nothing - counts as yes, which is how every request behaved before this check.
 * @param {string} modelId
 * @param {{listModels?: () => Promise<object[]|null>}} [options]
 * @returns {Promise<boolean>}
 */
async function modelSupportsVision(
  modelId,
  { listModels = listModelEntries } = {}
) {
  if (!modelId) return true;
  const entries = await listModels();
  const entry = entries?.find(
    (model) =>
      model?.id === modelId ||
      (Array.isArray(model?.aliases) && model.aliases.includes(modelId))
  );
  return visionFromModelEntry(entry) !== false;
}

function withNote(text) {
  const base = typeof text === "string" ? text : "";
  return base ? `${base}\n\n${IMAGE_OMITTED_NOTE}` : IMAGE_OMITTED_NOTE;
}

/**
 * For agent messages, which carry images as `attachments`.
 * @param {Array<{attachments?: Array}>} messages
 * @returns {boolean}
 */
function hasImageAttachments(messages = []) {
  return (messages || []).some(
    (message) =>
      Array.isArray(message?.attachments) &&
      message.attachments.some((attachment) => !isAudioAttachment(attachment))
  );
}

/**
 * Removes image attachments from agent messages and leaves a note in each
 * message that lost one. Audio attachments are kept.
 * @param {Array<{content: string, attachments?: Array}>} messages
 * @returns {Array}
 */
function stripImageAttachments(messages = []) {
  return (messages || []).map((message) => {
    if (!Array.isArray(message?.attachments) || !message.attachments.length)
      return message;
    const kept = message.attachments.filter(isAudioAttachment);
    if (kept.length === message.attachments.length) return message;

    const { attachments: _, ...rest } = message;
    return {
      ...rest,
      content: withNote(message.content),
      ...(kept.length > 0 ? { attachments: kept } : {}),
    };
  });
}

/**
 * For chat messages already in OpenAI format, with images as `image_url` parts.
 * @param {Array<{content: string|Array}>} messages
 * @returns {boolean}
 */
function hasImageContent(messages = []) {
  return (messages || []).some(
    (message) =>
      Array.isArray(message?.content) &&
      message.content.some((part) => part?.type === "image_url")
  );
}

/**
 * Removes `image_url` parts from OpenAI-format messages and leaves a note in
 * each message that lost one. A message left with only text goes back to being
 * a plain string.
 * @param {Array<{content: string|Array}>} messages
 * @returns {Array}
 */
function stripImageContent(messages = []) {
  return (messages || []).map((message) => {
    if (!Array.isArray(message?.content)) return message;
    const kept = message.content.filter((part) => part?.type !== "image_url");
    if (kept.length === message.content.length) return message;

    if (kept.every((part) => part?.type === "text"))
      return {
        ...message,
        content: withNote(kept.map((part) => part.text).join("\n")),
      };
    return {
      ...message,
      content: [...kept, { type: "text", text: IMAGE_OMITTED_NOTE }],
    };
  });
}

module.exports = {
  IMAGE_OMITTED_NOTE,
  visionFromModelEntry,
  modelSupportsVision,
  hasImageAttachments,
  stripImageAttachments,
  hasImageContent,
  stripImageContent,
};
