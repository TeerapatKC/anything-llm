const { updateENV } = require("../../../utils/helpers/updateENV");
const { getImageGeneratorProvider } = require("../../../utils/helpers");

describe("FLUX image generation configuration", () => {
  it.each([
    ["ImageGenerationProvider", "openai"],
    ["ImageGenerationModelPref", "another-model"],
    ["ImageGenerationDimensions", "512x512"],
    ["ImageGenerationLocalAiBasePath", "http://localhost:8080/v1"],
    ["ImageGenerationLocalAiApiKey", "secret"],
  ])("rejects %s through the settings API", async (key, value) => {
    const result = await updateENV({ [key]: value }, true);
    expect(result.error).toMatch(/Image generation settings.*environment variables/);
    expect(result.newValues).toEqual({});
  });

  it("only instantiates the LocalAI-compatible FLUX provider", () => {
    const previousProvider = process.env.IMAGE_GEN_PROVIDER;
    const previousBasePath = process.env.IMAGE_GEN_LOCALAI_BASE_PATH;
    try {
      process.env.IMAGE_GEN_PROVIDER = "openai";
      expect(() => getImageGeneratorProvider()).toThrow(/Use localai/);

      process.env.IMAGE_GEN_PROVIDER = "localai";
      process.env.IMAGE_GEN_LOCALAI_BASE_PATH = "http://localhost:8080/v1";
      expect(getImageGeneratorProvider().model).toBe("sd-cpp-local");
    } finally {
      if (previousProvider === undefined) delete process.env.IMAGE_GEN_PROVIDER;
      else process.env.IMAGE_GEN_PROVIDER = previousProvider;
      if (previousBasePath === undefined)
        delete process.env.IMAGE_GEN_LOCALAI_BASE_PATH;
      else process.env.IMAGE_GEN_LOCALAI_BASE_PATH = previousBasePath;
    }
  });

  it("sends the model ID advertised by sd-server", async () => {
    const previousProvider = process.env.IMAGE_GEN_PROVIDER;
    const previousBasePath = process.env.IMAGE_GEN_LOCALAI_BASE_PATH;
    const previousSize = process.env.IMAGE_GEN_SIZE_PREF;
    try {
      process.env.IMAGE_GEN_PROVIDER = "localai";
      process.env.IMAGE_GEN_LOCALAI_BASE_PATH = "http://localhost:8080/v1";
      delete process.env.IMAGE_GEN_SIZE_PREF;
      const generator = getImageGeneratorProvider();
      const generate = jest.fn().mockResolvedValue({
        data: [{ b64_json: Buffer.from("image").toString("base64") }],
      });
      generator.client.images.generate = generate;

      const image = await generator.generateImage({ prompt: "a tree" });
      expect(image.buffer.toString()).toBe("image");
      expect(generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "sd-cpp-local",
          prompt: "a tree",
          size: "1024x1024",
        }),
        expect.any(Object)
      );
    } finally {
      if (previousProvider === undefined) delete process.env.IMAGE_GEN_PROVIDER;
      else process.env.IMAGE_GEN_PROVIDER = previousProvider;
      if (previousBasePath === undefined)
        delete process.env.IMAGE_GEN_LOCALAI_BASE_PATH;
      else process.env.IMAGE_GEN_LOCALAI_BASE_PATH = previousBasePath;
      if (previousSize === undefined) delete process.env.IMAGE_GEN_SIZE_PREF;
      else process.env.IMAGE_GEN_SIZE_PREF = previousSize;
    }
  });
});
