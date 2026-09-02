/**
 * All command handler functions receive a `ctx` object:
 * @typedef {object} BotContext
 * @property {import('node-telegram-bot-api')} bot - The bot object.
 * @property {object} config - The bot configuration.
 * @property {(chatId: number) => { user: object, workspaceSlug: string | null, threadSlug: string | null } | null} getState - The account and active workspace/thread behind a chat. Null when the chat is unlinked.
 * @property {(chatId: number, updates: object) => void} setState - Update the active workspace/thread for a chat.
 * @property {(chatId: number) => Promise<object|null>} loadSession - Re-read the chat's link from the database.
 * @property {(chatId: number) => void} forgetSession - Drop the cached session for a chat.
 * @property {(text: string, ...args: any[]) => void} log - Log a message.
 */

/**
 * @typedef {object} BotCommandConfig
 * @property {string} command - The command name.
 * @property {string} description - The command description.
 * @property {boolean} skipAutoSetup - Whether to skip automatic setup.
 * @property {boolean} [allowUnlinked] - Whether a chat with no linked account may run it.
 * @property {boolean} [wantsMessage] - Whether the handler takes the raw Telegram message as a fourth argument. Off by default: the menu handlers read a messageId there, and handing them a message object makes them try to edit it.
 * @property {() => (ctx: BotContext, chatId: number, messageText?: string, msg?: object) => Promise<void>} initHandler - The handler function to initialize the command.
 */

const BASE_COMMAND = {
  skipAutoSetup: false,
  allowUnlinked: false,
  wantsMessage: false,
  initHandler: () => {
    throw new Error("Not implemented");
  },
};

/**
 * @type {BotCommandConfig[]}
 */
const BOT_COMMANDS = [
  {
    ...BASE_COMMAND,
    command: "start",
    description: "Start the bot",
    initHandler: () => {
      const { handleStart } = require("./handlers/handleStart");
      return handleStart;
    },
  },
  {
    ...BASE_COMMAND,
    command: "link",
    description: "Link this chat to your NexusAI account",
    // The one command an unlinked chat may run - it is how a chat gets a session.
    allowUnlinked: true,
    // Needs the sender's Telegram handle to store alongside the link.
    wantsMessage: true,
    initHandler: () => {
      const { handleLink } = require("./handlers/handleLink");
      return handleLink;
    },
  },
  {
    ...BASE_COMMAND,
    command: "unlink",
    description: "Disconnect this chat from your NexusAI account",
    initHandler: () => {
      const { handleUnlink } = require("./handlers/handleUnlink");
      return handleUnlink;
    },
  },
  {
    ...BASE_COMMAND,
    command: "whoami",
    description: "Show the account this chat is signed in as",
    initHandler: () => {
      const { handleWhoami } = require("./handlers/handleWhoami");
      return handleWhoami;
    },
  },
  {
    ...BASE_COMMAND,
    command: "switch",
    description: "Switch workspace or thread",
    initHandler: () => {
      const { showWorkspaceMenu } = require("./handlers/showWorkspaceMenu");
      return showWorkspaceMenu;
    },
  },
  {
    ...BASE_COMMAND,
    command: "workspaces",
    description: "List the workspaces you have access to",
    initHandler: () => {
      const { handleWorkspaces } = require("./handlers/handleWorkspaces");
      return handleWorkspaces;
    },
  },
  {
    ...BASE_COMMAND,
    command: "language",
    description: "Choose the language the assistant answers in",
    initHandler: () => {
      const { showLanguageMenu } = require("./handlers/handleLanguage");
      return showLanguageMenu;
    },
  },
  {
    ...BASE_COMMAND,
    command: "menu",
    description: "Show the button bar (send /menu off to hide it)",
    initHandler: () => {
      const { handleMenu } = require("./handlers/handleMenu");
      return handleMenu;
    },
  },
  {
    ...BASE_COMMAND,
    command: "model",
    description: "Change the LLM model",
    initHandler: () => {
      const { showModelMenu } = require("./handlers/showModelMenu");
      return showModelMenu;
    },
  },
  {
    ...BASE_COMMAND,
    command: "new",
    description: "Start a new thread",
    initHandler: () => {
      const { handleNewThread } = require("./handlers/handleNewThread");
      return handleNewThread;
    },
  },
  {
    ...BASE_COMMAND,
    command: "history",
    description: "Show recent messages (e.g. /history 25)",
    skipAutoSetup: true,
    initHandler: () => {
      const { handleHistory } = require("./handlers/handleHistory");
      return handleHistory;
    },
  },
  {
    ...BASE_COMMAND,
    command: "status",
    description: "Show current workspace and model",
    initHandler: () => {
      const { handleStatus } = require("./handlers/handleStatus");
      return handleStatus;
    },
  },
  {
    ...BASE_COMMAND,
    command: "reset",
    description: "Clear chat history in current thread",
    initHandler: () => {
      const { handleReset } = require("./handlers/handleReset");
      return handleReset;
    },
  },
  {
    ...BASE_COMMAND,
    command: "help",
    description: "Show available commands",
    initHandler: () => {
      const { handleHelp } = require("./handlers/handleHelp");
      return handleHelp;
    },
  },
  {
    ...BASE_COMMAND,
    command: "proof",
    description: "Show citations for the last reply",
    initHandler: () => {
      const { handleProof } = require("./handlers/handleProof");
      return handleProof;
    },
  },
  {
    ...BASE_COMMAND,
    command: "abort",
    description: "Stop the current response",
    initHandler: () => {
      const { handleAbort } = require("./handlers/handleAbort");
      return handleAbort;
    },
  },
];

module.exports = {
  BOT_COMMANDS,
};
