/**
 * The language the assistant answers a Telegram chat in.
 *
 * This is a reply-language choice, not an interface translation: the bot's own
 * messages stay in English. What it changes is the instruction the model is
 * given, so it applies to plain chat and to agent replies alike.
 */

/**
 * `null` is the default and means "answer in whatever language the person
 * wrote in" - the behaviour before this was a setting.
 * @type {{code: string|null, label: string, directive: string|null}[]}
 */
const RESPONSE_LANGUAGES = [
  {
    code: null,
    label: "🌐 Auto (match my message)",
    directive: null,
  },
  {
    code: "en",
    label: "🇬🇧 English",
    directive:
      "Always write your reply in English, whatever language the user writes in.",
  },
  {
    code: "th",
    label: "🇹🇭 ไทย (Thai)",
    directive:
      "Always write your reply in Thai (ภาษาไทย), whatever language the user writes in.",
  },
  {
    code: "ja",
    label: "🇯🇵 日本語 (Japanese)",
    directive:
      "Always write your reply in Japanese (日本語), whatever language the user writes in.",
  },
];

/** Codes that may be stored. Anything else is treated as "auto". */
const SUPPORTED_CODES = RESPONSE_LANGUAGES.map((l) => l.code).filter(Boolean);

/**
 * Reduce a stored or user-supplied value to a language this bot knows.
 * @param {string|null|undefined} code
 * @returns {string|null} A supported code, or null for auto.
 */
function normalizeLanguage(code) {
  if (!code) return null;
  const lower = String(code).toLowerCase();
  return SUPPORTED_CODES.includes(lower) ? lower : null;
}

/**
 * The entry for a code, falling back to the auto entry.
 * @param {string|null} code
 * @returns {{code: string|null, label: string, directive: string|null}}
 */
function languageFor(code) {
  const normalized = normalizeLanguage(code);
  return (
    RESPONSE_LANGUAGES.find((l) => l.code === normalized) ||
    RESPONSE_LANGUAGES[0]
  );
}

/**
 * Human-readable name for the current choice, for /status and confirmations.
 * @param {string|null} code
 * @returns {string}
 */
function languageLabel(code) {
  return languageFor(code).label;
}

/**
 * Append the language instruction to a system prompt.
 * Returns the prompt untouched when the chat is on auto.
 * @param {string} systemPrompt
 * @param {string|null} code
 * @returns {string}
 */
function withLanguageDirective(systemPrompt, code) {
  const { directive } = languageFor(code);
  if (!directive) return systemPrompt;
  return `${systemPrompt}\n\n${directive}`;
}

/**
 * The same instruction phrased for the agent path, where there is no system
 * prompt of our own to extend and the model only sees the user's turn.
 * @param {string} message
 * @param {string|null} code
 * @returns {string}
 */
function withLanguageNote(message, code) {
  const { directive } = languageFor(code);
  if (!directive) return message;
  return `${message}\n\n(${directive})`;
}

module.exports = {
  RESPONSE_LANGUAGES,
  SUPPORTED_CODES,
  normalizeLanguage,
  languageFor,
  languageLabel,
  withLanguageDirective,
  withLanguageNote,
};
