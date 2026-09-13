const fs = require("fs");
const { updateENV } = require("../../../utils/helpers/updateENV");

describe("environment-managed audio settings", () => {
  const original = {
    stt: process.env.STT_PROVIDER,
    tts: process.env.TTS_PROVIDER,
    voice: process.env.TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL,
  };

  beforeEach(() => {
    process.env.STT_PROVIDER = "generic-openai";
    process.env.TTS_PROVIDER = "generic-openai";
    process.env.TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL = "female";
  });

  afterAll(() => {
    for (const [key, value] of [
      ["STT_PROVIDER", original.stt],
      ["TTS_PROVIDER", original.tts],
      ["TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL", original.voice],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("rejects both provider keys without applying voice changes in the same request", async () => {
    const result = await updateENV({
      TextToSpeechProvider: "unsupported",
      TTSOpenAICompatibleVoiceModel: "male",
    });

    expect(result.error).toMatch(/environment variables/);
    expect(result.newValues).toEqual({});
    expect(process.env.TTS_PROVIDER).toBe("generic-openai");
    expect(process.env.TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL).toBe("female");

    const forced = await updateENV({ SpeechToTextProvider: "unsupported" }, true);
    expect(forced.error).toMatch(/environment variables/);
    expect(process.env.STT_PROVIDER).toBe("generic-openai");
  });

  it("still saves a voice choice when no provider key is submitted", async () => {
    const write = jest.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    try {
      const result = await updateENV({ TTSOpenAICompatibleVoiceModel: "male" });
      expect(result.error).toBe(false);
      expect(result.newValues).toEqual({
        TTSOpenAICompatibleVoiceModel: "male",
      });
      expect(process.env.TTS_OPEN_AI_COMPATIBLE_VOICE_MODEL).toBe("male");
    } finally {
      write.mockRestore();
    }
  });

  it.each([
    ["STTOpenAICompatibleModel", "whisper-1"],
    ["TTSOpenAICompatibleModel", "tts-1"],
    ["TTSOpenAICompatibleEndpoint", "https://example.com/v1"],
    ["TTSOpenAICompatibleKey", "secret"],
  ])("rejects %s even in force mode", async (key, value) => {
    const result = await updateENV({ [key]: value }, true);
    expect(result.error).toMatch(/Only the text-to-speech voice model/);
    expect(result.newValues).toEqual({});
  });
});
