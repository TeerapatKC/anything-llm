/**
 * English strings for everything the LINE bot says.
 *
 * This file is the source of truth: every other locale mirrors its keys. A
 * missing key falls back to the English text rather than showing the key
 * itself. Scoped to LINE's own (smaller) command set - see
 * server/utils/telegramBot/utils/i18n/en.js for the Telegram equivalent.
 */
module.exports = {
  "link.instructions": [
    "This bot is not linked to your account yet.",
    "",
    "1. Sign in to NexusAI in your browser",
    "2. Open your account settings and start the LINE connection",
    "3. Send the command you're shown there, in the form:",
    "",
    "/link your-username 123456",
    "",
    "The code expires after 5 minutes. Ask for a new one if it runs out.",
  ].join("\n"),
  "link.rate_limited":
    "Too many attempts. Try again in {{minutes}} minute(s).",
  "link.invalid":
    "That username or code is invalid, or the code has expired. Please request a new one from your NexusAI account settings.",
  "link.success":
    'You\'re linked as "{{username}}". You can start chatting now.',
  "link.success_workspace":
    'Chatting in workspace "{{workspace}}". Send /help to see available commands.',
  "link.success_no_workspace":
    "Your account doesn't have access to any workspace yet. Contact your admin.",

  "unlink.done": "You've been unlinked. Send /link <username> <code> to link again.",
  "account.gone":
    "Your linked NexusAI account is no longer available. Send /link <username> <code> to link again.",

  "help.text": [
    "Available commands:",
    "/help - show this list",
    "/workspace - show your current workspace and list the ones you can access",
    "/workspace <number> - switch to one of them",
    "/language - show the language the assistant answers in",
    "/language <number> - change it",
    "/unlink - unpair this LINE account from NexusAI",
  ].join("\n"),

  "workspace.no_access":
    "Hi {{username}}, your account doesn't have access to any workspace yet. Contact your admin.",
  "workspace.status":
    'You\'re currently chatting in "{{workspace}}" ({{slug}}).\n\nWorkspaces you can access:\n{{list}}\n\nSend /workspace <number> to switch.',
  "workspace.not_found":
    'No workspace matches "{{arg}}". Send /workspace to see your options.',
  "workspace.already": 'You\'re already chatting in "{{workspace}}".',
  "workspace.switched": 'Switched to workspace "{{workspace}}".',

  "language.status":
    "The assistant currently answers in: {{language}}\n\nOptions:\n{{list}}\n\nSend /language <number> to change it.",
  "language.changed": "The assistant will now answer in {{language}}.",
  "language.already": "Already answering in {{language}}.",
  "language.not_found":
    'No option matches "{{arg}}". Send /language to see your options.',

  "chat.no_response": "Sorry, I couldn't generate a response.",
};
