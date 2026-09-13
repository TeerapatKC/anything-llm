/**
 * @typedef {Object} GeneratedImage
 * @property {Buffer} buffer - the raw PNG image bytes
 */

// FLUX.1-schnell uses 1024x1024 by default. The server can override it with
// IMAGE_GEN_SIZE_PREF for deployments with different resource limits.
const DEFAULT_IMAGE_SIZE = "1024x1024";

/**
 * Shared request and response handling for the OpenAI-compatible image API
 * exposed by stable-diffusion.cpp.
 */
class BaseImageGenerator {
  /**
   * @param {{client: import("openai").OpenAI, model: string, className: string}} config
   */
  constructor({ client, model, className }) {
    this.client = client;
    this.model = model;
    this.className = className;
  }

  log(text, ...args) {
    console.log(`\x1b[36m[${this.className}]\x1b[0m ${text}`, ...args);
  }

  /**
   * Generate a single image from a text prompt at the requested size, falling
   * back to the configured IMAGE_GEN_SIZE_PREF and then the default size. The
   * size is passed straight to the provider - if the model rejects it, the error
   * surfaces to the caller so the user can adjust IMAGE_GEN_SIZE_PREF.
   * @param {{prompt: string, size?: string, signal?: AbortSignal}} params
   * @returns {Promise<GeneratedImage>}
   */
  async generateImage({ prompt, size, signal }) {
    const imageSize =
      size || process.env.IMAGE_GEN_SIZE_PREF || DEFAULT_IMAGE_SIZE;
    const result = await this.requestImage(prompt, imageSize, signal);
    return result;
  }

  /**
   * Performs the image request and normalizes the response to a buffer.
   * @param {string} prompt
   * @param {string} size
   * @param {AbortSignal} [signal]
   * @returns {Promise<GeneratedImage>}
   */
  async requestImage(prompt, size, signal) {
    this.log(`Generating ${size} image with ${this.model}.`);
    const result = await this.client.images.generate(
      {
        model: this.model,
        prompt,
        size,
        n: 1,
      },
      { signal: signal ?? undefined }
    );

    const image = result?.data?.[0];
    if (image?.b64_json)
      return { buffer: Buffer.from(image.b64_json, "base64") };
    if (image?.url) {
      const res = await fetch(image.url, { signal: signal ?? null });
      if (!res.ok)
        throw new Error(`Failed to fetch generated image: ${res.status}`);
      return { buffer: Buffer.from(await res.arrayBuffer()) };
    }
    throw new Error("Image provider returned no image data.");
  }
}

module.exports = { BaseImageGenerator };
