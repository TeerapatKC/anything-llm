const { v4: uuidv4 } = require("uuid");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { resetMemory } = require("./commands/reset");
const { generateImage } = require("./commands/img");
const { convertToPromptHistory } = require("../helpers/chat/responses");
const { SlashCommandPresets } = require("../../models/slashCommandsPresets");
const { SystemPromptVariables } = require("../../models/systemPromptVariables");

const VALID_COMMANDS = {
  "/reset": resetMemory,
  "/img": generateImage,
};

/**
 * Expands slash commands in a chat message. Which commands exist is a property of the
 * workspace being chatted in - its own commands plus the instance-wide built-ins - so
 * a command defined in one workspace is not usable from another.
 * @param {string} message
 * @param {import("@prisma/client").workspaces|null} workspace
 * @returns {Promise<string>}
 */
async function grepCommand(message, workspace = null) {
  const presets = await SlashCommandPresets.forWorkspace(workspace?.id);
  const availableCommands = Object.keys(VALID_COMMANDS);

  // Check if the message starts with any built-in command
  for (let i = 0; i < availableCommands.length; i++) {
    const cmd = availableCommands[i];
    const re = new RegExp(`^(${cmd})`, "i");
    if (re.test(message)) {
      return cmd;
    }
  }

  // Replace all preset commands with their corresponding prompts
  // Allows multiple commands in one message
  let updatedMessage = message;
  for (const preset of presets) {
    // Match the command when it starts the message or follows a space (`lead`),
    // and is not part of a longer command (e.g. don't match /weather in /weatherman).
    // `lead` is captured so we can keep the space when swapping in the prompt.
    const regex = new RegExp(`(^|\\s)(${preset.command})(?![a-z0-9_-])`, "g");
    updatedMessage = updatedMessage.replace(
      regex,
      (_match, lead) => `${lead}${preset.prompt}`
    );
  }

  return updatedMessage;
}

/**
 * Expands slash commands for a developer-API chat. Scoped to the workspace the API
 * call targets - it used to expand every preset on the instance, which would now let
 * one workspace's commands fire inside another.
 * @param {string} message
 * @param {import("@prisma/client").workspaces|null} workspace
 * @returns {Promise<string>}
 */
async function grepAllSlashCommands(message, workspace = null) {
  const presets = await SlashCommandPresets.forWorkspace(workspace?.id);

  // Replace all preset commands with their corresponding prompts
  // Allows multiple commands in one message
  let updatedMessage = message;
  for (const preset of presets) {
    // Match the command when it starts the message or follows a space (`lead`),
    // and is not part of a longer command (e.g. don't match /weather in /weatherman).
    // `lead` is captured so we can keep the space when swapping in the prompt.
    const regex = new RegExp(`(^|\\s)(${preset.command})(?![a-z0-9_-])`, "g");
    updatedMessage = updatedMessage.replace(
      regex,
      (_match, lead) => `${lead}${preset.prompt}`
    );
  }

  return updatedMessage;
}

async function recentChatHistory({
  user = null,
  workspace,
  thread = null,
  messageLimit = 20,
  apiSessionId = null,
}) {
  const rawHistory = (
    await WorkspaceChats.where(
      {
        workspaceId: workspace.id,
        user_id: user?.id || null,
        thread_id: thread?.id || null,
        api_session_id: apiSessionId || null,
        include: true,
      },
      messageLimit,
      { id: "desc" }
    )
  ).reverse();
  return { rawHistory, chatHistory: convertToPromptHistory(rawHistory) };
}

/**
 * Returns the base prompt for the chat with memories appended (when enabled).
 * Also does variable substitution on the prompt if there are any defined variables.
 * @param {Object|null} workspace - the workspace object
 * @param {Object|null} user - the user object
 * @param {{prompt?: string, rawHistory?: object[]}} [opts] - current user message + chat history, used for reranking injected memories
 * @returns {Promise<string>}
 */
async function chatPrompt(workspace, user = null, opts = {}) {
  const { SystemSettings } = require("../../models/systemSettings");
  const { promptWithMemories } = require("../memories");
  const { withBrandIdentity } = require("../brandIdentity");
  const basePrompt =
    workspace?.openAiPrompt ?? SystemSettings.saneDefaultSystemPrompt;
  const systemPrompt = await SystemPromptVariables.expandSystemPromptVariables(
    basePrompt,
    user?.id,
    workspace?.id
  );
  return promptWithMemories({
    systemPrompt: withBrandIdentity(systemPrompt),
    user,
    workspaceId: workspace?.id,
    prompt: opts.prompt ?? "",
    rawHistory: opts.rawHistory ?? [],
  });
}

// We use this util function to deduplicate sources from similarity searching
// if the document is already pinned.
// Eg: You pin a csv, if we RAG + full-text that you will get the same data
// points both in the full-text and possibly from RAG - result in bad results
// even if the LLM was not even going to hallucinate.
function sourceIdentifier(sourceDocument) {
  if (!sourceDocument?.title || !sourceDocument?.published) return uuidv4();
  return `title:${sourceDocument.title}-timestamp:${sourceDocument.published}`;
}

module.exports = {
  sourceIdentifier,
  recentChatHistory,
  chatPrompt,
  grepCommand,
  grepAllSlashCommands,
  VALID_COMMANDS,
};
