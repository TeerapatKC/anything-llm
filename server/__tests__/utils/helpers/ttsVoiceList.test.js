const { getCustomModels } = require("../../../utils/helpers/customModels");

describe("configured OpenAI-compatible TTS voices", () => {
  const originalEndpoint = process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT;
  const originalKey = process.env.TTS_OPEN_AI_COMPATIBLE_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT = "http://tts:8000/v1";
    process.env.TTS_OPEN_AI_COMPATIBLE_KEY = "server-secret";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(() => {
    if (originalEndpoint === undefined)
      delete process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT;
    else process.env.TTS_OPEN_AI_COMPATIBLE_ENDPOINT = originalEndpoint;
    if (originalKey === undefined) delete process.env.TTS_OPEN_AI_COMPATIBLE_KEY;
    else process.env.TTS_OPEN_AI_COMPATIBLE_KEY = originalKey;
  });

  it("lists actual voices from the configured Docker TTS service", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ voices: ["female", "male"] }),
    });

    const result = await getCustomModels("generic-openai-tts-voices");

    expect(result).toEqual({
      models: [
        { id: "female", name: "female" },
        { id: "male", name: "male" },
      ],
      error: null,
    });
    expect(global.fetch.mock.calls[0][0].toString()).toBe(
      "http://tts:8000/v1/voices"
    );
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer server-secret"
    );
  });

  it("tries the audio voice route when the first route is unsupported", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ voices: [{ id: "af_bella", name: "Bella" }] }),
      });

    const result = await getCustomModels("generic-openai-tts-voices");

    expect(result.models).toEqual([{ id: "af_bella", name: "Bella" }]);
    expect(global.fetch.mock.calls[1][0].toString()).toBe(
      "http://tts:8000/v1/audio/voices"
    );
  });

  it("returns no selectable voices when the service has none installed", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ voices: [], missing_transcript: ["new.wav"] }),
    });

    const result = await getCustomModels("generic-openai-tts-voices");

    expect(result).toEqual({ models: [], error: null });
  });
});
