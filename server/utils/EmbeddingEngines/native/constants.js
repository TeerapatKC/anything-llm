const SUPPORTED_NATIVE_EMBEDDING_MODELS = {
  "MintplexLabs/multilingual-e5-small": {
    maxConcurrentChunks: 5,
    embeddingMaxChunkLength: 1_000,
    chunkPrefix: "passage: ",
    queryPrefix: "query: ",
    apiInfo: {
      id: "MintplexLabs/multilingual-e5-small",
      name: "multilingual-e5-small",
      description: "Built-in multilingual embedding model.",
      lang: "94 languages",
      size: "235MB",
      modelCard: "https://huggingface.co/MintplexLabs/multilingual-e5-small",
    },
  },
};

module.exports = { SUPPORTED_NATIVE_EMBEDDING_MODELS };
