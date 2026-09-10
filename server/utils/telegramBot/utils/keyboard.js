const { CATALOGS, t } = require("./i18n");

/**
 * The persistent tab bar shown under the message box.
 *
 * Telegram has no tabs, so the closest thing is a reply keyboard: it sits below
 * the input, survives every message, and its buttons send their own label as a
 * plain message. That last part is why the labels are matched back to commands
 * here - a tap has to be routed to a handler instead of being answered by the
 * LLM as if the user had typed it.
 */

/**
 * No button for /switch: the workspace list switches on tap too, so the pair
 * only ever led to the same place. /switch is still a command, and still the
 * way in when you want to pick a thread rather than just a workspace.
 */
const TAB_ROWS = [
  [
    { key: "menu.tab_language", command: "language" },
    { key: "menu.tab_workspaces", command: "workspaces" },
  ],
  [
    { key: "menu.tab_new_thread", command: "new" },
    { key: "menu.tab_status", command: "status" },
  ],
];

/**
 * What an unlinked chat sees instead.
 *
 * The four tabs all lead to commands that need an account behind them, so
 * showing them before a link exists offers four ways to be told no. This is the
 * only thing such a chat can usefully do, so it is the only button it gets.
 */
const LINK_ROWS = [[{ key: "menu.tab_link", command: "link" }]];

/**
 * Every label in every language, mapped to the command it stands for.
 *
 * A bar drawn in Thai is still sitting in the chat after someone switches to
 * English - Telegram keeps showing the last keyboard it was sent - so a tap has
 * to be understood whatever language it was drawn in.
 * @type {Map<string, string>}
 */
const LABELS_TO_COMMAND = new Map();
for (const lang of Object.keys(CATALOGS)) {
  for (const button of [...TAB_ROWS.flat(), ...LINK_ROWS.flat()])
    LABELS_TO_COMMAND.set(t(lang, button.key), button.command);
}

/**
 * The reply_markup that renders the tab bar.
 * @param {string|null} [lang]
 * @returns {object}
 */
function tabKeyboard(lang = null) {
  return {
    keyboard: TAB_ROWS.map((row) =>
      row.map((button) => ({ text: t(lang, button.key) }))
    ),
    resize_keyboard: true,
    is_persistent: true,
    one_time_keyboard: false,
    input_field_placeholder: t(lang, "menu.placeholder"),
  };
}

/**
 * The reply_markup for a chat with no account behind it: one button, which asks
 * how to link. Sent wherever the link is missing or has just been taken away, so
 * the bar always matches what the chat can actually do.
 * @param {string|null} [lang]
 * @returns {object}
 */
function linkKeyboard(lang = null) {
  return {
    keyboard: LINK_ROWS.map((row) =>
      row.map((button) => ({ text: t(lang, button.key) }))
    ),
    resize_keyboard: true,
    is_persistent: true,
    one_time_keyboard: false,
    input_field_placeholder: t(lang, "menu.link_placeholder"),
  };
}

/**
 * The reply_markup that takes the tab bar away again.
 *
 * Only `/menu off` still wants this - losing the link swaps the bar for
 * `linkKeyboard` rather than leaving the chat with nothing to tap.
 * @returns {object}
 */
function removeTabKeyboard() {
  return { remove_keyboard: true };
}

/**
 * Resolve a plain message to the command handler its button stands for.
 * @param {string} [text]
 * @returns {Function|null} The handler, or null when the text is a normal message.
 */
function resolveTabAction(text) {
  if (!text) return null;
  const command = LABELS_TO_COMMAND.get(text.trim());
  if (!command) return null;

  // Required lazily: the command table pulls in handlers that import this module.
  const { BOT_COMMANDS } = require("./commands");
  const entry = BOT_COMMANDS.find((c) => c.command === command);
  return entry ? entry.initHandler() : null;
}

module.exports = {
  TAB_ROWS,
  LINK_ROWS,
  LABELS_TO_COMMAND,
  tabKeyboard,
  linkKeyboard,
  removeTabKeyboard,
  resolveTabAction,
};
