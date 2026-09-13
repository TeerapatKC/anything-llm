const {
  validateModelSettings,
  parseModelSettings,
  resolveModel,
  settingsForModel,
  isModelEnabled,
} = require("../../../utils/helpers/llmModelSettings");
const { availableLlmModels } = require("../../../utils/helpers/customModels");

describe("per-model LLM settings", () => {
  const previous = {
    config: process.env.GENERIC_OPEN_AI_MODEL_SETTINGS,
    model: process.env.GENERIC_OPEN_AI_MODEL_PREF,
  };
  const config = {
    defaultModel: "qwen",
    models: {
      qwen: { enabled: true, contextWindow: 4096, maxTokens: 512 },
      gemma: { enabled: true, contextWindow: 8192, maxTokens: 1024 },
      smol: { enabled: false, contextWindow: 2048, maxTokens: 256 },
    },
  };

  beforeEach(() => {
    process.env.GENERIC_OPEN_AI_MODEL_SETTINGS = Buffer.from(
      JSON.stringify(config)
    ).toString("base64url");
    process.env.GENERIC_OPEN_AI_MODEL_PREF = "qwen";
  });

  afterAll(() => {
    if (previous.config === undefined)
      delete process.env.GENERIC_OPEN_AI_MODEL_SETTINGS;
    else process.env.GENERIC_OPEN_AI_MODEL_SETTINGS = previous.config;
    if (previous.model === undefined)
      delete process.env.GENERIC_OPEN_AI_MODEL_PREF;
    else process.env.GENERIC_OPEN_AI_MODEL_PREF = previous.model;
  });

  it("uses separate context and output limits for each enabled model", () => {
    expect(parseModelSettings()).toEqual(config);
    expect(settingsForModel("qwen")).toEqual({
      contextWindow: 4096,
      maxTokens: 512,
    });
    expect(settingsForModel("gemma")).toEqual({
      contextWindow: 8192,
      maxTokens: 1024,
    });
  });

  it("falls back to the enabled default when a stored workspace model is disabled", () => {
    expect(isModelEnabled("smol")).toBe(false);
    expect(resolveModel("smol")).toBe("qwen");
    expect(resolveModel("gemma")).toBe("gemma");
  });

  it("exposes only enabled models to workspace pickers", () => {
    const live = ["qwen", "gemma", "smol"].map((id) => ({ id, name: id }));
    expect(availableLlmModels(live, "").map(({ id }) => id)).toEqual([
      "qwen",
      "gemma",
    ]);
    expect(availableLlmModels(live, "", true)).toHaveLength(3);
  });

  it("rejects a disabled default and impossible token limits", () => {
    expect(validateModelSettings({ ...config, defaultModel: "smol" })).toMatch(
      /default model/
    );
    expect(
      validateModelSettings({
        ...config,
        models: {
          ...config.models,
          qwen: { enabled: true, contextWindow: 100, maxTokens: 101 },
        },
      })
    ).toMatch(/Max tokens/);
  });
});
