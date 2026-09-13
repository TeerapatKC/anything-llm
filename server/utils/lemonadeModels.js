const { humanFileSize } = require("./helpers");

function extractModelOrganization(modelId) {
  const match = modelId.match(/^([A-Za-z]+)/);
  return match ? match[1] : modelId;
}

/**
 * Parse the base path of the Docker Model Runner endpoint and return the host and port.
 * @param {string} basePath - The base path of the Lemonade server endpoint.
 * @param {'base' | 'openai' | 'ollama'} to - The provider to parse the endpoint for (internal DMR or openai-compatible)
 * @returns {string | null}
 */
function parseLemonadeServerEndpoint(basePath = null, to = "openai") {
  if (!basePath) return null;
  try {
    const url = new URL(basePath);
    if (to === "openai") url.pathname = "api/v1";
    else if (to === "ollama") url.pathname = "api";
    else if (to === "base") url.pathname = ""; // only used for /live
    return url.toString();
  } catch {
    return basePath;
  }
}

/**
 * This function will fetch the remote models from the Lemonade server as well
 * as the local models installed on the system.
 * @param {string} basePath - The base path of the Lemonade server endpoint.
 * @param {'chat' | 'embedding' | 'reranking' | 'transcription' | 'image' | 'all'} task - The task to fetch the models for.
 * @param {string|null} apiKey - The API key to use for the request. Defaults to the LLM api key when not provided.
 */
async function getAllLemonadeModels(
  basePath = null,
  task = "chat",
  apiKey = null
) {
  const availableModels = {};
  const _apiKey = apiKey || process.env.LEMONADE_LLM_API_KEY || null;

  function isValidForTask(model) {
    if (task === "reranking") return model.labels?.includes("reranking");
    if (task === "embedding") return model.labels?.includes("embeddings");
    if (task === "transcription")
      return model.labels?.includes("transcription");
    if (task === "image") return model.labels?.includes("image");
    if (task === "chat")
      return !["embeddings", "reranking", "image"].some((label) =>
        model.labels?.includes(label)
      );
    return true;
  }

  try {
    // Grab the locally installed models from the Lemonade server API
    const lemonadeUrl = new URL(
      parseLemonadeServerEndpoint(
        basePath ?? process.env.LEMONADE_LLM_BASE_PATH,
        "openai"
      )
    );
    lemonadeUrl.pathname += "/models";
    lemonadeUrl.searchParams.append("show_all", "true");

    await fetch(lemonadeUrl.toString(), {
      headers: {
        ...(!!_apiKey ? { Authorization: `Bearer ${_apiKey}` } : {}),
      },
    })
      .then((res) => res.json())
      .then(({ data }) => {
        data?.forEach((model) => {
          if (!isValidForTask(model)) return;

          const organization = extractModelOrganization(model.id);
          const modelData = {
            id: model.id,
            name: organization + ":" + model.id,
            // Reports in GB, convert to bytes
            size: model?.size
              ? humanFileSize(model.size * 1024 ** 3)
              : "Unknown size",
            downloaded: model?.downloaded ?? false,
            organization,
          };

          if (!availableModels[organization])
            availableModels[organization] = { tags: [] };
          availableModels[organization].tags.push(modelData);
        });
      });
  } catch (e) {
    console.error(`Error getting Lemonade models`, e);
  } finally {
    // eslint-disable-next-line
    return Object.values(availableModels).flatMap((m) => m.tags);
  }
}

module.exports = { parseLemonadeServerEndpoint, getAllLemonadeModels };
