function getSTTProvider() {
  const provider = process.env.STT_PROVIDER || "generic-openai";
  if (provider !== "generic-openai")
    throw new Error(
      `Unsupported STT_PROVIDER "${provider}". Use generic-openai.`
    );
  const { GenericOpenAiSTT } = require("./openAiGeneric");
  return new GenericOpenAiSTT();
}

module.exports = { getSTTProvider };
