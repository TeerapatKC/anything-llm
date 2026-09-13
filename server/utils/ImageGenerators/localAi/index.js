const { BaseImageGenerator } = require("../base");

class LocalAiImageGenerator extends BaseImageGenerator {
  constructor() {
    if (!process.env.IMAGE_GEN_LOCALAI_BASE_PATH)
      throw new Error("No image generation endpoint was configured.");
    const { OpenAI: OpenAIApi } = require("openai");
    super({
      client: new OpenAIApi({
        baseURL: process.env.IMAGE_GEN_LOCALAI_BASE_PATH,
        apiKey: process.env.IMAGE_GEN_LOCALAI_API_KEY || "unused",
      }),
      // sd-server advertises this OpenAI-compatible model ID for the single
      // diffusion model loaded through --diffusion-model.
      model: "sd-cpp-local",
      className: "LocalAiImageGenerator",
    });
  }

  async editImage({ prompt, images, signal }) {
    this.log(
      `FLUX.1-schnell does not support image editing. Dropping ${images.length} reference image(s) and generating from prompt only.`
    );
    const result = await this.generateImage({ prompt, signal });
    result.notice =
      "FLUX.1-schnell does not support image editing — your reference images were ignored and a new image was generated from the prompt only.";
    return result;
  }
}

module.exports = { LocalAiImageGenerator };
