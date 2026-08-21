/**
 * Credential handling on the model-listing path.
 *
 * The settings UI never has the real secret to send back: the key field renders a row of
 * asterisks for an already-saved key, and `SystemSettings` reports saved keys as booleans
 * so the secret stays on the server. Either can be posted back as the "apiKey".
 *
 * `getGenericOpenAiModels` caches whatever it is handed into `process.env` once a listing
 * succeeds, and `dumpENV` later writes that to the env file - so a mask arriving here
 * replaces the real key with asterisks and the credential is gone for good. `updateENV`
 * guards the settings-save path against exactly this; these tests pin the same guarantee
 * on the path that does not go through it.
 *
 * The provider SDK is stubbed so the listing succeeds. That matters: with a failing
 * request no models come back, the caching branch never runs, and a test would pass
 * whether or not the guard exists.
 */

const mockListModels = jest.fn();

jest.mock("openai", () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    models: { list: mockListModels },
  })),
}));

const { getCustomModels } = require("../../../utils/helpers/customModels");

const KEY = "GENERIC_OPEN_AI_API_KEY";
const REAL_KEY = "sk-a-real-looking-secret";
const MASK = "*".repeat(20);

let originalKey;
let originalBasePath;

beforeEach(() => {
  jest.clearAllMocks();
  mockListModels.mockResolvedValue({
    data: [{ id: "qwen27b", owned_by: "local" }],
  });

  originalKey = process.env[KEY];
  originalBasePath = process.env.GENERIC_OPEN_AI_BASE_PATH;
  process.env[KEY] = REAL_KEY;
  process.env.GENERIC_OPEN_AI_BASE_PATH = "https://example.invalid/v1";
});

afterEach(() => {
  if (originalKey === undefined) delete process.env[KEY];
  else process.env[KEY] = originalKey;
  if (originalBasePath === undefined)
    delete process.env.GENERIC_OPEN_AI_BASE_PATH;
  else process.env.GENERIC_OPEN_AI_BASE_PATH = originalBasePath;
});

describe("getCustomModels credential handling", () => {
  it("lists models successfully, so the caching branch really is reached", async () => {
    const { models, error } = await getCustomModels(
      "generic-openai",
      REAL_KEY,
      null
    );

    expect(error).toBeNull();
    expect(models).toEqual([
      { id: "qwen27b", name: "qwen27b", organization: "local" },
    ]);
  });

  it("caches a genuine key so it survives a restart", async () => {
    await getCustomModels("generic-openai", "sk-newly-entered-key", null);
    expect(process.env[KEY]).toBe("sk-newly-entered-key");
  });

  it("never lets the asterisk placeholder overwrite a saved key", async () => {
    await getCustomModels("generic-openai", MASK, null);
    expect(process.env[KEY]).toBe(REAL_KEY);
  });

  it("never lets a boolean from the settings payload overwrite a saved key", async () => {
    // `GenericOpenAiKey: true` is exactly what `/setup-complete` reports.
    await getCustomModels("generic-openai", true, null);
    expect(process.env[KEY]).toBe(REAL_KEY);
  });

  it("never lets an empty or whitespace value overwrite a saved key", async () => {
    await getCustomModels("generic-openai", "", null);
    expect(process.env[KEY]).toBe(REAL_KEY);

    await getCustomModels("generic-openai", "   ", null);
    expect(process.env[KEY]).toBe(REAL_KEY);
  });

  it("sends the stored key to the provider when handed a mask, not the mask", async () => {
    const { OpenAI } = require("openai");
    await getCustomModels("generic-openai", MASK, null);

    // Otherwise the provider is asked to authenticate with asterisks, returns nothing,
    // and the model dropdown silently falls back to a free-text box.
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: REAL_KEY })
    );
  });

  it("refuses providers it does not support without touching anything", async () => {
    const { models, error } = await getCustomModels("not-a-provider", MASK);
    expect(models).toEqual([]);
    expect(error).toMatch(/invalid provider/i);
    expect(process.env[KEY]).toBe(REAL_KEY);
  });
});
