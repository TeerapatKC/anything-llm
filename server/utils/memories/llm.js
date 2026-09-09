const { getBaseLLMProviderModel } = require("../helpers/index.js");

/**
 * Pick a provider/model for memory work: workspace chat → workspace agent →
 * system default. Memory extraction and in-chat capture both run their own
 * agent turn rather than riding the user's chat connector, so they need to
 * resolve a model the same way and from one place.
 * @param {import("@prisma/client").workspaces} workspace
 * @returns {{provider: string, model: string}|null}
 */
function resolveMemoryLLM(workspace) {
  if (workspace?.chatProvider && workspace?.chatModel)
    return { provider: workspace.chatProvider, model: workspace.chatModel };
  if (workspace?.agentProvider && workspace?.agentModel)
    return { provider: workspace.agentProvider, model: workspace.agentModel };
  const provider = process.env.LLM_PROVIDER;
  const model = provider ? getBaseLLMProviderModel({ provider }) : null;
  if (provider && model) return { provider, model };
  return null;
}

module.exports = { resolveMemoryLLM };
