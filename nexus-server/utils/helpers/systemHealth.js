// Best-effort health probes for the /system/health aggregate endpoint.
// Each check is independently try/caught by its caller so one failing/
// misconfigured provider never takes down the whole health response.
//
// Scope note: per the V.1 System Administration decision, this covers
// connectivity/config-validity checks only - no GPU/storage/memory metrics
// and no ability to actually restart a service (both require infra/OS
// integration outside this application).

/**
 * Best-effort LLM connectivity check for the system-wide default provider
 * (process.env.LLM_PROVIDER). Workspaces may override their own provider -
 * this reflects the system default only, matching how the other health
 * sub-checks are also system-wide rather than per-workspace.
 * @returns {Promise<{status: "ok"|"unknown"|"error", provider: string, model?: string|null, reason?: string, error?: string}>}
 */
async function checkLLMHealth() {
  const { getLLMProviderClass, getBaseLLMProviderModel } = require("./index");
  const provider = process.env.LLM_PROVIDER || "openai";

  try {
    const ProviderClass = getLLMProviderClass({ provider });
    if (!ProviderClass)
      return { status: "unknown", provider, reason: "No provider class resolved for the configured LLM_PROVIDER." };

    const model = getBaseLLMProviderModel({ provider });
    // Constructing the connector alone validates required env/config (most
    // provider constructors throw synchronously if an API key is missing).
    const connector = new ProviderClass(null, model);

    // If the underlying SDK exposes a cheap models-list call, use it as a
    // real connectivity probe. Not every provider wrapper exposes one.
    if (typeof connector.openai?.models?.list === "function") {
      await connector.openai.models.list();
      return { status: "ok", provider, model };
    }

    return {
      status: "unknown",
      provider,
      model,
      reason: "Configuration loaded without error, but no lightweight connectivity probe is available for this provider.",
    };
  } catch (error) {
    return { status: "error", provider, error: error.message };
  }
}

/**
 * Best-effort embedding engine health check (process.env.EMBEDDING_ENGINE).
 * There is no cheap, universal "ping" for embedders without spending a real
 * embedding call, so this only distinguishes "fails to even configure" from
 * "configures fine, live connectivity not further verified".
 * @returns {Promise<{status: "ok"|"unknown"|"error", engine: string, error?: string, reason?: string}>}
 */
async function checkEmbedderHealth() {
  const { getEmbeddingEngineSelection } = require("./index");
  const engine = process.env.EMBEDDING_ENGINE || "native";

  try {
    getEmbeddingEngineSelection();
    return {
      status: "unknown",
      engine,
      reason: "Configuration loaded without error; no lightweight connectivity probe available for embedders.",
    };
  } catch (error) {
    return { status: "error", engine, error: error.message };
  }
}

/**
 * Wires up the vector DB provider's existing (previously dormant) heartbeat()
 * method - every provider implements it, but until now it was only ever
 * called internally during connect().
 * @returns {Promise<{status: "ok"|"error", provider: string, error?: string}>}
 */
async function checkVectorDbHealth() {
  const { getVectorDbClass } = require("./index");
  const provider = process.env.VECTOR_DB || "lancedb";

  try {
    const VectorDb = getVectorDbClass();
    await VectorDb.heartbeat();
    return { status: "ok", provider };
  } catch (error) {
    return { status: "error", provider, error: error.message };
  }
}

/**
 * Reuses the existing CollectorApi.online() reachability check.
 * @returns {Promise<{status: "ok"|"error", online: boolean}>}
 */
async function checkCollectorHealth() {
  try {
    const { CollectorApi } = require("../collectorApi");
    const online = await new CollectorApi().online();
    return { status: online ? "ok" : "error", online };
  } catch (error) {
    return { status: "error", online: false, error: error.message };
  }
}

/**
 * Instance-wide document processing queue counts by status.
 * @returns {Promise<{status: "ok", counts: {queued: number, processing: number, completed: number, failed: number, disabled: number}}>}
 */
async function checkDocumentQueueHealth() {
  const { DocumentProcessingQueue } = require("../../models/documentProcessingQueue");
  const counts = await DocumentProcessingQueue.summary();
  return { status: "ok", counts };
}

module.exports = {
  checkLLMHealth,
  checkEmbedderHealth,
  checkVectorDbHealth,
  checkCollectorHealth,
  checkDocumentQueueHealth,
};
