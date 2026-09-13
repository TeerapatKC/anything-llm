function getTTSProvider() {
  const provider = process.env.TTS_PROVIDER || "generic-openai";
  if (provider !== "generic-openai")
    throw new Error(
      `Unsupported TTS_PROVIDER "${provider}". Use generic-openai.`
    );
  const { GenericOpenAiTTS } = require("./openAiGeneric");
  return new GenericOpenAiTTS();
}

module.exports = { getTTSProvider };
