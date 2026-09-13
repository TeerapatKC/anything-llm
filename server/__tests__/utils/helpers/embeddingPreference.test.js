const fs = require("fs");
const { updateENV } = require("../../../utils/helpers/updateENV");
const { NativeEmbedder } = require("../../../utils/EmbeddingEngines/native");
const { getCustomModels } = require("../../../utils/helpers/customModels");
const { getEmbeddingEngineSelection } = require("../../../utils/helpers");

const mockListModels = jest.fn();
jest.mock("openai", () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    models: { list: mockListModels },
  })),
}));

describe("embedding preference", () => {
  const original = {
    provider: process.env.EMBEDDING_ENGINE,
    model: process.env.EMBEDDING_MODEL_PREF,
    basePath: process.env.EMBEDDING_BASE_PATH,
    apiKey: process.env.GENERIC_OPEN_AI_EMBEDDING_API_KEY,
    delay: process.env.GENERIC_OPEN_AI_EMBEDDING_API_DELAY_MS,
  };

  afterAll(() => {
    for (const [key, value] of [
      ["EMBEDDING_ENGINE", original.provider],
      ["EMBEDDING_MODEL_PREF", original.model],
      ["EMBEDDING_BASE_PATH", original.basePath],
      ["GENERIC_OPEN_AI_EMBEDDING_API_KEY", original.apiKey],
      ["GENERIC_OPEN_AI_EMBEDDING_API_DELAY_MS", original.delay],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("uses only multilingual-e5-small for the built-in embedder", () => {
    process.env.EMBEDDING_MODEL_PREF = "Xenova/all-MiniLM-L6-v2";
    expect(NativeEmbedder._getEmbeddingModel()).toBe(
      "MintplexLabs/multilingual-e5-small"
    );
    expect(NativeEmbedder.availableModels().map((model) => model.id)).toEqual([
      "MintplexLabs/multilingual-e5-small",
    ]);
  });

  it("rejects removed embedding engines instead of silently using another one", () => {
    process.env.EMBEDDING_ENGINE = "openai";
    expect(() => getEmbeddingEngineSelection()).toThrow(
      /Unsupported EMBEDDING_ENGINE/
    );
  });

  it("does not allow changing the provider, endpoint or key through the API", async () => {
    process.env.EMBEDDING_ENGINE = "generic-openai";
    process.env.EMBEDDING_BASE_PATH = "http://embedder:8000/v1";
    process.env.GENERIC_OPEN_AI_EMBEDDING_API_KEY = "server-secret";
    const result = await updateENV(
      {
        EmbeddingEngine: "native",
        EmbeddingBasePath: "http://other:8000/v1",
        GenericOpenAiEmbeddingApiKey: "other-secret",
        GenericOpenAiEmbeddingApiDelayMs: "500",
      },
      true
    );
    expect(result.error).toMatch(/environment variables/);
    expect(result.newValues).toEqual({});
    expect(process.env.EMBEDDING_ENGINE).toBe("generic-openai");
    expect(process.env.EMBEDDING_BASE_PATH).toBe("http://embedder:8000/v1");
    expect(process.env.GENERIC_OPEN_AI_EMBEDDING_API_KEY).toBe(
      "server-secret"
    );
  });

  it("does not allow changing the built-in model", async () => {
    process.env.EMBEDDING_ENGINE = "native";
    const result = await updateENV(
      { EmbeddingModelPref: "other-model" },
      true
    );
    expect(result.error).toMatch(/built-in model/);
    expect(result.newValues).toEqual({});
  });

  it("lists model IDs from the configured service and saves other generic settings", async () => {
    process.env.EMBEDDING_ENGINE = "generic-openai";
    process.env.EMBEDDING_BASE_PATH = "http://embedder:8000/v1";
    process.env.GENERIC_OPEN_AI_EMBEDDING_API_KEY = "server-secret";
    mockListModels.mockResolvedValueOnce({
      data: [{ id: "embed-small" }, { id: "embed-large" }],
    });
    expect(await getCustomModels("generic-openai-embedder")).toEqual({
      models: [
        { id: "embed-small", name: "embed-small" },
        { id: "embed-large", name: "embed-large" },
      ],
      error: null,
    });

    const write = jest.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    try {
      const result = await updateENV({
        GenericOpenAiEmbeddingApiDelayMs: "500",
      });
      expect(result.error).toBe(false);
      expect(process.env.GENERIC_OPEN_AI_EMBEDDING_API_DELAY_MS).toBe("500");
    } finally {
      write.mockRestore();
    }
  });
});
