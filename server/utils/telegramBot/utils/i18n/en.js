/**
 * English strings for everything the Telegram bot says.
 *
 * This file is the source of truth: every other locale mirrors its keys, and a
 * test fails the build when one drifts. A missing key falls back to the English
 * text rather than showing the key itself.
 */
module.exports = {
  // ---------------------------------------------------------------- common
  "common.error": "Sorry, something went wrong. Please try again.",
  "common.callback_error": "Something went wrong.",
  "common.prev": "← Prev",
  "common.next": "Next →",
  "common.active": "active",
  "common.default_thread": "Default",
  "common.unknown": "unknown",

  // ------------------------------------------------------------- linking
  "link.already_linked":
    'This chat is already linked to "{{username}}". Use /unlink first if you want to connect a different account.',
  "link.usage":
    "Usage: <code>/link your-username 123456</code>\n\nGet the code from your account settings in NexusAI.",
  "link.rate_limited":
    "Too many failed attempts. Try again in {{minutes}} minute(s).",
  "link.invalid":
    "That username or code is not valid. Codes expire after 5 minutes - generate a new one in NexusAI and try again.",
  "link.failed": "Could not link this chat. Please try again.",
  "link.success": "✅ Linked to <b>{{username}}</b>.",
  "link.success_workspace":
    "You are chatting in <b>{{workspace}}</b>. Use /switch to change workspace or thread, /language to pick a reply language, and /help for everything else.",
  "link.success_no_workspace":
    "You are not a member of any workspace yet, so there is nothing to chat with. Ask an admin to add you to one, then send /switch.",
  "unlink.done":
    "This chat is no longer linked to your NexusAI account. Send /link with a new code to connect again.",
  "unlink.by_admin":
    "An administrator disconnected this chat from your NexusAI account.",
  "unlink.self": "This chat is no longer linked to your NexusAI account.",
  "callback.not_linked":
    "This chat is not linked to a NexusAI account. Send /link to connect.",

  // --------------------------------------------------------------- start
  "start.welcome":
    'Welcome to NexusAI, {{username}}!\n\nYour messages go to the "{{workspace}}" workspace. Use the buttons below to switch workspace or start a new thread, /workspaces to see what you have access to, and /help for everything else.',
  "start.welcome_no_workspace":
    "Welcome to NexusAI, {{username}}!\n\nNo workspace is selected yet. Use the buttons below to pick one of your workspaces, or ask an admin to add you to one.",

  // -------------------------------------------------------------- whoami
  "whoami.signed_in_as": "Signed in as:",
  "whoami.workspace": "Workspace:",
  "whoami.thread": "Thread:",
  "whoami.language": "Reply language:",
  "whoami.none_selected": "None selected",
  "whoami.note":
    "Everything you send here runs as this account, with the same workspace access you have on the web.",

  // ---------------------------------------------------------------- menu
  "menu.shown": "Here is your button bar. Send /menu off to hide it.",
  "menu.hidden": "Button bar hidden. Send /menu to bring it back.",
  "menu.placeholder": "Ask anything, or tap a button below",
  "menu.tab_workspaces": "📋 My workspaces",
  "menu.tab_new_thread": "🆕 New thread",
  "menu.tab_status": "ℹ️ Status",
  "menu.tab_language": "🌐 Reply language",

  // ---------------------------------------------------------- workspaces
  "workspaces.none":
    "You are not a member of any workspace yet. Ask an admin to add you to one.",
  "workspaces.header": "<b>Your workspaces</b> ({{count}})",
  "workspaces.header_paged":
    "<b>Your workspaces</b> ({{page}}/{{pages}}, {{count}} total)",
  "workspaces.footer":
    "Tap one to switch. /switch also lets you pick a thread.",
  "workspaces.switched": "✅ Now chatting in <b>{{workspace}}</b>.",
  "workspaces.switched_toast": "Switched to {{workspace}}",
  "workspaces.already_in": "Already in {{workspace}}.",
  "workspaces.not_available": "Workspace not available.",

  // -------------------------------------------------------------- switch
  "switch.none_can_create":
    "You are not in any workspace yet. Create one to get started!",
  "switch.create_button": "➕ Create Workspace",
  "switch.select": "Select a workspace:",
  "switch.select_paged":
    "Select a workspace ({{page}}/{{pages}}, {{count}} total):",
  "switch.created":
    'Created and switched to "{{workspace}}". You can start chatting now!',
  "switch.create_failed": "Failed to create workspace.",
  "switch.create_denied": "You do not have permission to create workspaces.",

  // ------------------------------------------------------------- threads
  "thread.select": '"{{workspace}}" — Select a thread:',
  "thread.select_paged":
    '"{{workspace}}" — Select a thread ({{page}}/{{pages}}, {{count}} total):',
  "thread.chats_suffix": "{{count}} chats",
  "thread.back": "← Back to workspaces",
  "thread.switched": 'Switched to "{{workspace}}" → {{thread}}',
  "thread.switched_toast": "Switched!",
  "thread.not_available": "Thread not available.",
  "thread.no_workspace":
    "No workspace selected. Use /switch to pick one of your workspaces.",
  "thread.denied":
    'You do not have permission to create threads in "{{workspace}}".',
  "thread.create_failed": "Failed to create thread.",
  "thread.created":
    'New thread created in "{{workspace}}". Your messages will now go here.',

  // ------------------------------------------------------------- history
  "history.empty": "No messages yet in this thread.",
  "history.you": "You:",
  "history.ai": "AI:",

  // -------------------------------------------------------------- status
  "status.workspace": "Workspace:",
  "status.thread": "Thread:",
  "status.language": "Reply language:",
  "status.provider": "LLM Provider:",
  "status.model": "LLM Model:",
  "status.native_tools": "Native Tool Calling:",
  "status.chat_mode": "Chat Mode:",
  "status.enabled": "Enabled",
  "status.disabled": "Disabled",
  "status.note_no_native_tools":
    "**⚠️ Note**\nNative tool calling is unavailable for this provider/model. You can only use tools with the @agent command.",
  "status.tip_automatic_mode":
    '**💡 Tip**\nChange this workspace\'s chat mode to "automatic" to use tools without the @agent command.',

  // --------------------------------------------------------------- reset
  "reset.done":
    "Chat history has been cleared for the LLM. Previous messages still appear above but won't be used as context.",

  // ---------------------------------------------------------------- help
  "help.header": "Available commands:",

  // --------------------------------------------------------------- proof
  "proof.no_citations": "There are no citations for the previous reply.",
  "proof.no_sources": "The previous reply has no citations available.",
  "proof.header":
    "📚 <b>Citations</b> ({{count}} sources)\n\nSelect a source to view:",
  "proof.header_paged":
    "📚 <b>Citations</b> ({{page}}/{{pages}}, {{count}} total)\n\nSelect a source to view:",
  "proof.close": "Close",
  "proof.not_found": "Source not found. Please try /proof again.",
  "proof.invalid_url": "Invalid web source URL.",

  // --------------------------------------------------------------- abort
  "abort.done": "Response aborted by user.",
  "abort.none": "No active response to abort.",

  // ------------------------------------------------------------ language
  "language.title": "<b>Reply language</b>",
  "language.current": "The assistant currently answers in: <b>{{language}}</b>",
  "language.note":
    "This changes the answers you get and the bot's own messages.",
  "language.changed": "✅ The assistant will answer in <b>{{language}}</b>.",
  "language.changed_toast": "Reply language: {{language}}",
  "language.already": "Already answering in {{language}}.",
  "language.current_suffix": "current",

  // ---------------------------------------------------------------- model
  "model.no_workspace":
    "No workspace selected. Use /switch to select a workspace.",
  "model.denied":
    'You do not have permission to change the model in "{{workspace}}".',
  "model.denied_toast":
    "You do not have permission to change this workspace's model.",
  "model.provider_unsupported":
    'The "{{provider}}" provider does not support model selection via API.',
  "model.none_available": 'No models available for "{{provider}}".',
  "model.select": '"{{workspace}}" — Select a model:',
  "model.select_paged":
    '"{{workspace}}" — Select a model ({{page}}/{{pages}}, {{count}} total):',
  "model.cancel": "Cancel",
  "model.cancelled": "Model selection cancelled.",
  "model.not_found": "Model not found.",
  "model.updated": 'Model changed to "{{model}}" in "{{workspace}}".',
  "model.updated_toast": "Model updated!",

  // ----------------------------------------------------------------- chat
  "chat.no_workspace":
    "No workspace selected. Use /switch to pick one of your workspaces.",
  "chat.account_gone":
    "Your NexusAI account is no longer available. Send /link to connect again.",
  "chat.lost_access":
    "You no longer have access to that workspace. Use /switch to pick another one.",
  "chat.daily_limit":
    "You have reached your daily message limit. Try again tomorrow.",
  "chat.no_response": "No response generated.",
  "chat.stream_error": "An error occurred while streaming the response.",

  // ---------------------------------------------------------------- media
  "media.transcribe_empty": "Could not transcribe the voice message.",
  "media.voice_failed": "Failed to process voice message. Please try again.",
  "media.image_failed": "Failed to process the image. Please try again.",
  "media.document_failed": "Failed to process the document. Please try again.",
  "media.describe_image": "Describe this image.",

  // ----------------------------------------------------------------- tool
  "tool.approval_title": "🔧 <b>Tool Approval Required</b>",
  "tool.approval_body": "The agent wants to execute: <b>{{skill}}</b>",
  "tool.approval_params": "<b>Parameters:</b>",
  "tool.approval_question": "Do you want to allow this action?",
  "tool.approve": "✅ Approve",
  "tool.deny": "❌ Deny",
  "tool.timed_out": "⏱️ Tool approval for <b>{{skill}}</b> timed out.",
  "tool.expired": "This approval request has expired.",
  "tool.approved": "✅ <b>{{skill}}</b> was approved.",
  "tool.denied": "❌ <b>{{skill}}</b> was denied.",
  "tool.approved_toast": "Approved!",
  "tool.denied_toast": "Denied.",
  "chat.chart_failed": "failed to render chart.",

  // ------------------------------------------------------------- feedback
  "feedback.up": "👍 Helpful",
  "feedback.down": "👎 Not helpful",
  "feedback.thanks_up": "Thanks - marked as helpful.",
  "feedback.thanks_down": "Thanks - marked as not helpful.",
  "feedback.cleared": "Rating removed.",
  "feedback.not_available": "That answer is no longer available to rate.",
  "feedback.ask_reason":
    "What was wrong with it? Send a message to tell me, or just carry on - the rating is already saved.",
  "feedback.reason_saved": "Thanks - your feedback was saved.",

  // ------------------------------------------------------- command descriptions
  "command.start": "Start the bot",
  "command.link": "Link this chat to your NexusAI account",
  "command.unlink": "Disconnect this chat from your NexusAI account",
  "command.whoami": "Show the account this chat is signed in as",
  "command.switch": "Switch workspace or thread",
  "command.workspaces": "List the workspaces you have access to",
  "command.language": "Choose the language the assistant answers in",
  "command.menu": "Show the button bar (send /menu off to hide it)",
  "command.model": "Change the LLM model",
  "command.new": "Start a new thread",
  "command.history": "Show recent messages (e.g. /history 25)",
  "command.status": "Show current workspace and model",
  "command.reset": "Clear chat history in current thread",
  "command.help": "Show available commands",
  "command.proof": "Show citations for the last reply",
  "command.abort": "Stop the current response",
};
