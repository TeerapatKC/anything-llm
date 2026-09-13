const { v4 } = require("uuid");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../utils/files");
const { tokenizeString } = require("../../utils/tokenizer");
const { default: slugify } = require("slugify");
const { LocalWhisper } = require("../../utils/WhisperProviders/localWhisper");
const {
  GenericOpenAiWhisper,
} = require("../../utils/WhisperProviders/GenericOpenAiWhisper");

const WHISPER_PROVIDERS = {
  "generic-openai": GenericOpenAiWhisper,
  local: LocalWhisper,
};

async function asAudio({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  const providerId = options?.whisperProvider || "local";
  const WhisperProvider = Object.prototype.hasOwnProperty.call(
    WHISPER_PROVIDERS,
    providerId
  )
    ? WHISPER_PROVIDERS[providerId]
    : null;
  if (!WhisperProvider) {
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `Unsupported transcription provider: ${providerId}`,
      documents: [],
    };
  }

  console.log(`-- Working ${filename} --`);
  let whisper;
  try {
    whisper = new WhisperProvider({ options });
  } catch (error) {
    if (!options.absolutePath) trashFile(fullFilePath);
    return { success: false, reason: error.message, documents: [] };
  }
  const { content, error } = await whisper.processFile(fullFilePath, filename);

  if (!!error) {
    console.error(`Error encountered for parsing of ${filename}.`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: error,
      documents: [],
    };
  }

  if (!content?.length) {
    console.error(`Resulting text content was empty for ${filename}.`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  const data = {
    id: v4(),
    url: "file://" + fullFilePath,
    title: metadata.title || filename,
    docAuthor: metadata.docAuthor || "no author found",
    description: metadata.description || "No description found.",
    docSource: metadata.docSource || "audio file uploaded by the user.",
    chunkSource: metadata.chunkSource || "",
    published: createdDate(fullFilePath),
    wordCount: content.split(" ").length,
    pageContent: content,
    token_count_estimate: tokenizeString(content),
  };

  const document = writeToServerDocuments({
    data,
    filename: `${slugify(filename)}-${data.id}`,
    options: { parseOnly: options.parseOnly },
  });
  if (!options.absolutePath) trashFile(fullFilePath);
  console.log(
    `[SUCCESS]: ${filename} transcribed, converted & ready for embedding.\n`
  );
  return { success: true, reason: null, documents: [document] };
}

module.exports = asAudio;
