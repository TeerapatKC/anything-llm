const { tryConvertAudioBufferToWav } = require("../helpers");
const path = require("path");

class GenericOpenAiSTT {
  constructor() {
    if (!process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT)
      throw new Error(
        "No OpenAI compatible endpoint was set. Please set this to use your OpenAI compatible STT service."
      );
    if (!process.env.STT_OPEN_AI_COMPATIBLE_KEY)
      this.#log(
        "No OpenAI compatible API key was set. You might need to set this to use your OpenAI compatible STT service."
      );
    if (!process.env.STT_OPEN_AI_COMPATIBLE_MODEL)
      this.#log(
        "No OpenAI compatible STT model was set. We will use the default model 'whisper-1'. This may not exist or be valid for your selected endpoint."
      );

    const { OpenAI: OpenAIApi } = require("openai");
    this.openai = new OpenAIApi({
      apiKey: process.env.STT_OPEN_AI_COMPATIBLE_KEY || null,
      baseURL: process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT,
    });
    this.model = process.env.STT_OPEN_AI_COMPATIBLE_MODEL ?? "whisper-1";
    this.#log(
      `Service (${process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT}) with model: ${this.model}`
    );
  }

  #log(text, ...args) {
    console.log(`\x1b[32m[OpenAiGenericSTT]\x1b[0m ${text}`, ...args);
  }

  /**
   * Transcribes an audio buffer to text using an OpenAI-compatible STT service.
   * @param {Buffer} audioBuffer - The audio buffer to be transcribed.
   * @param {string} filename - Original filename, used to hint the audio container/codec to the service.
   * @returns {Promise<string>} The transcribed text.
   */
  async transcribe(audioBuffer, filename = "audio.webm") {
    const { toFile } = require("openai");
    const extension = path.extname(filename).toLowerCase() || ".webm";
    let payloadBuffer = audioBuffer;
    let payloadFilename = filename;
    // WAV is the safest input for whisper backends, but it needs ffmpeg on the
    // collector - when that is unavailable we forward the original recording
    // rather than failing outright. See tryConvertAudioBufferToWav.
    if (extension !== ".wav") {
      const wavBuffer = await tryConvertAudioBufferToWav(
        audioBuffer,
        extension
      );
      if (wavBuffer) {
        payloadBuffer = wavBuffer;
        payloadFilename = "audio.wav";
      }
    }
    const file = await toFile(payloadBuffer, payloadFilename);
    try {
      const result = await this.openai.audio.transcriptions.create({
        file,
        model: this.model,
      });
      return result?.text ?? "";
    } catch (e) {
      throw new Error(this.#transcriptionErrorMessage(e, payloadFilename));
    }
  }

  /**
   * Build an error a user can act on. The OpenAI SDK only reads `message` out of
   * an error body, so a service answering in another shape (FastAPI's
   * `{"detail": "..."}`, for one) surfaces as "500 status code (no body)" - and
   * a service that rejected the audio for its format says nothing about ffmpeg.
   * @param {Error & {status?: number, error?: object}} error - The error the SDK threw.
   * @param {string} sentFilename - The filename actually sent to the service.
   * @returns {string}
   */
  #transcriptionErrorMessage(error, sentFilename) {
    const detail =
      error?.error?.detail ||
      error?.error?.message ||
      error?.message ||
      "Unknown error";
    const status = error?.status ? ` (HTTP ${error.status})` : "";
    const conversionHint = sentFilename.endsWith(".wav")
      ? ""
      : ` The recording was sent as ${path.extname(sentFilename) || "webm"} because it could not be converted to WAV - install ffmpeg on the collector's PATH if your service only accepts WAV.`;
    return `Transcription failed${status}: ${detail}${conversionHint}`;
  }
}

module.exports = { GenericOpenAiSTT };
