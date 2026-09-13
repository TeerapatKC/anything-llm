const { updateENV } = require("../../../utils/helpers/updateENV");

describe("environment-managed transcription settings", () => {
  it.each([
    ["WhisperProvider", "generic-openai"],
    ["WhisperModelPref", "Xenova/whisper-large"],
    ["WhisperGenericOpenAiBaseUrl", "https://example.com/v1"],
    ["WhisperGenericOpenAiApiKey", "secret"],
    ["WhisperGenericOpenAiModel", "whisper-test"],
  ])("rejects %s even in force mode", async (key, value) => {
    const result = await updateENV({ [key]: value }, true);
    expect(result.error).toMatch(/Transcription settings.*environment variables/);
    expect(result.newValues).toEqual({});
  });

  it("rejects a mixed request before applying unrelated changes", async () => {
    const previousMaxTokens = process.env.GENERIC_OPEN_AI_MAX_TOKENS;
    const result = await updateENV({
      WhisperProvider: "generic-openai",
      GenericOpenAiMaxTokens: 999,
    });

    expect(result.error).toMatch(/Transcription settings.*environment variables/);
    expect(result.newValues).toEqual({});
    expect(process.env.GENERIC_OPEN_AI_MAX_TOKENS).toBe(previousMaxTokens);
  });
});
