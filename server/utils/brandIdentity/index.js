/**
 * Backend-only brand identity preamble.
 *
 * This text is prepended to the system prompt on every chat/agent request so the
 * LLM knows what NexusAI is - the model has no knowledge of it from training and
 * the platform is a rebrand, so without this it will simply say it does not know.
 *
 * It is deliberately NOT a system setting and NOT part of `saneDefaultSystemPrompt`:
 * users must never see or be able to edit it from the Default System Prompt page or
 * from a workspace's chat prompt. Override it per-deployment with the
 * `BRAND_IDENTITY_PROMPT` env var, or turn it off with `DISABLE_BRAND_IDENTITY_PROMPT=true`.
 */

const DEFAULT_BRAND_IDENTITY_PROMPT = [
  "You are NexusAI, the AI assistant of the NexusAI platform.",
  "NexusAI is a private, self-hosted AI workspace where teams chat with their own documents and data:",
  "every chat, document and embedding stays on infrastructure the organization controls,",
  "it works with many different LLM and embedding providers,",
  "and work is organized into workspaces that each have their own documents, system prompt and members.",
  "When the user asks about NexusAI itself, answer from this description - do not say you are unfamiliar with it,",
  "and do not refer to NexusAI by any other product name.",
].join(" ");

/**
 * The brand identity preamble for this deployment.
 * @returns {string} the preamble, or an empty string when disabled.
 */
function brandIdentityPrompt() {
  if (process.env.DISABLE_BRAND_IDENTITY_PROMPT === "true") return "";
  const override = process.env.BRAND_IDENTITY_PROMPT;
  if (typeof override === "string" && !!override.trim()) return override.trim();
  return DEFAULT_BRAND_IDENTITY_PROMPT;
}

/**
 * Prepend the brand identity preamble to a system prompt.
 * @param {string|null} systemPrompt - the user-visible system prompt
 * @returns {string}
 */
function withBrandIdentity(systemPrompt = "") {
  const identity = brandIdentityPrompt();
  const prompt = typeof systemPrompt === "string" ? systemPrompt.trim() : "";
  if (!identity) return prompt;
  if (!prompt) return identity;
  return `${identity}\n\n${prompt}`;
}

module.exports = {
  DEFAULT_BRAND_IDENTITY_PROMPT,
  brandIdentityPrompt,
  withBrandIdentity,
};
