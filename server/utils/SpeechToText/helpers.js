const fs = require("fs/promises");
const path = require("path");
const { v4 } = require("uuid");
const { CollectorApi } = require("../collectorApi");
const { hotdirPath, isWithin } = require("../files");

/**
 * Convert an audio buffer to a 16kHz mono WAV buffer via the collector's
 * FFMPEG wrapper. Use this when the downstream STT provider (e.g. Lemonade)
 * runs a whisper.cpp backend that rejects webm/opus input.
 * @param {Buffer} audioBuffer - Source audio buffer.
 * @param {string} extension - Source file extension including the leading dot (e.g. ".webm").
 * @returns {Promise<Buffer>} The converted WAV buffer.
 */
async function convertAudioBufferToWav(audioBuffer, extension) {
  let wavPath = null;
  const sourceFilename = `stt-${v4()}${extension}`;
  const sourcePath = path.resolve(hotdirPath, sourceFilename);
  if (!isWithin(hotdirPath, sourcePath))
    throw new Error("Source path is outside the hotdir.");

  try {
    await fs.writeFile(sourcePath, audioBuffer);
    const result = await new CollectorApi().convertAudioToWav(sourceFilename);
    if (!result?.success || !result?.wavFilename)
      throw new Error(result?.reason || "Audio conversion failed.");

    wavPath = path.resolve(hotdirPath, result.wavFilename);
    return await fs.readFile(wavPath);
  } finally {
    await fs.rm(sourcePath, { force: true }).catch(() => {});
    if (wavPath) await fs.rm(wavPath, { force: true }).catch(() => {});
  }
}

/**
 * Best-effort variant of `convertAudioBufferToWav` for providers that only
 * *prefer* WAV input. Conversion needs an `ffmpeg` binary on the collector's
 * PATH, which is not installed everywhere - when it is missing we would rather
 * forward the browser's original recording (most OpenAI-compatible services
 * accept webm/opus) than fail the whole transcription.
 * @param {Buffer} audioBuffer - Source audio buffer.
 * @param {string} extension - Source file extension including the leading dot (e.g. ".webm").
 * @returns {Promise<Buffer|null>} The converted WAV buffer, or null if it could not be converted.
 */
async function tryConvertAudioBufferToWav(audioBuffer, extension) {
  try {
    return await convertAudioBufferToWav(audioBuffer, extension);
  } catch (e) {
    console.log(
      `\x1b[33m[SpeechToText]\x1b[0m Could not convert ${extension} audio to WAV (${e.message}). Sending the original recording to the provider instead - install ffmpeg and make it available on PATH if your provider rejects it.`
    );
    return null;
  }
}

module.exports = { convertAudioBufferToWav, tryConvertAudioBufferToWav };
