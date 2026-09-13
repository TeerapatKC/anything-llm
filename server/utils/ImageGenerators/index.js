/**
 * Generates an image from a prompt using the system-configured provider and
 * persists it to `storage/generated-images`. This is the single shared entry
 * point used by the `/img` chat command and the image generation endpoints.
 * @param {{prompt: string, size?: string}} params - size defaults to the
 * provider's configured size (IMAGE_GEN_SIZE_PREF) when omitted.
 * @returns {Promise<{storageFilename: string, filename: string, fileSize: number, buffer: Buffer}>}
 */
async function generateImageForWorkspace({ prompt, size, signal }) {
  // Required lazily to avoid a circular dependency during boot (helpers/files
  // are loaded early and transitively reach this module).
  const { getImageGeneratorProvider } = require("../helpers");
  const { saveGeneratedImage } = require("../files");
  const provider = getImageGeneratorProvider();
  const { buffer } = await provider.generateImage({ prompt, size, signal });
  const saved = await saveGeneratedImage({ buffer, prompt });
  return { ...saved, buffer };
}

/**
 * Handles reference images through the configured generator. FLUX.1-schnell
 * generates a new image from the prompt and reports that references were ignored.
 * @param {{prompt: string, images: Buffer[], size?: string, signal?: AbortSignal}} params
 * @returns {Promise<{storageFilename: string, filename: string, fileSize: number, buffer: Buffer}>}
 */
async function editImageForWorkspace({ prompt, images, size, signal }) {
  const { getImageGeneratorProvider } = require("../helpers");
  const { saveGeneratedImage } = require("../files");
  const provider = getImageGeneratorProvider();
  const { buffer, notice } = await provider.editImage({
    prompt,
    images,
    size,
    signal,
  });
  const saved = await saveGeneratedImage({ buffer, prompt });
  return { ...saved, buffer, ...(notice && { notice }) };
}

/** Whether the configured FLUX endpoint can be used by /img and agent skills. */
function isImageGenerationAvailable() {
  try {
    const { getImageGeneratorProvider } = require("../helpers");
    getImageGeneratorProvider();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  generateImageForWorkspace,
  editImageForWorkspace,
  isImageGenerationAvailable,
};
