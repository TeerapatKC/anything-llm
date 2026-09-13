const AIbitat = require("../../../../utils/agents/aibitat");
const { MODEL_PRICING } = require("../../../../utils/helpers/modelPricing");

describe("AIbitat Generic OpenAI provider", () => {
  const originalModel = process.env.GENERIC_OPEN_AI_MODEL_PREF;

  beforeAll(() => {
    process.env.GENERIC_OPEN_AI_MODEL_PREF = "configured-model";
  });

  afterAll(() => {
    if (originalModel === undefined) delete process.env.GENERIC_OPEN_AI_MODEL_PREF;
    else process.env.GENERIC_OPEN_AI_MODEL_PREF = originalModel;
  });

  afterEach(() => jest.restoreAllMocks());

  test("uses the selected Generic OpenAI model and slug", () => {
    const aibitat = new AIbitat({ provider: "generic-openai", model: "selected-model" });
    const provider = aibitat.getProviderForConfig({
      provider: "generic-openai",
      model: "selected-model",
    });

    expect(provider.providerSlug).toBe("generic-openai");
    expect(provider.model).toBe("selected-model");
  });

  test("retired provider values use the configured Generic OpenAI model", () => {
    const aibitat = new AIbitat({ provider: "generic-openai" });
    const provider = aibitat.getProviderForConfig({
      provider: "openai",
      model: "old-model",
    });

    expect(provider.providerSlug).toBe("generic-openai");
    expect(provider.model).toBe("configured-model");
  });

  test("a pre-built provider instance keeps its own slug", () => {
    const aibitat = new AIbitat({ provider: "generic-openai" });
    const prebuilt = aibitat.getProviderForConfig({ provider: "generic-openai" });
    prebuilt.providerSlug = "custom-slug";

    expect(aibitat.getProviderForConfig({ provider: prebuilt })).toBe(prebuilt);
    expect(prebuilt.providerSlug).toBe("custom-slug");
  });

  test("records usage under the Generic OpenAI slug and selected model", () => {
    const getCostBreakdown = jest
      .spyOn(MODEL_PRICING, "getCostBreakdown")
      .mockReturnValue({ inputCost: 1, outputCost: 2, totalCost: 3 });
    const aibitat = new AIbitat({ provider: "generic-openai" });
    const provider = aibitat.getProviderForConfig({
      provider: "generic-openai",
      model: "selected-model",
    });

    provider.resetUsage();
    provider.recordUsage({ prompt_tokens: 100, completion_tokens: 10 });

    expect(getCostBreakdown).toHaveBeenCalledWith(
      "generic-openai",
      "selected-model",
      expect.objectContaining({ prompt_tokens: 100, completion_tokens: 10 })
    );
    expect(provider.getCumulativeUsage().totalCost).toBe(3);
  });
});
