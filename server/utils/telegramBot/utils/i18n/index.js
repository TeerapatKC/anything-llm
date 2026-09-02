const en = require("./en");
const th = require("./th");
const ja = require("./ja");

/**
 * Translations for everything the Telegram bot says.
 *
 * The language comes from the chat's own reply-language setting, so the bot
 * speaks the same language it answers in. A chat left on Auto gets English:
 * "auto" describes what the assistant does with the user's message, and there
 * is nothing to detect before the first message arrives.
 */
const CATALOGS = { en, th, ja };

/** The locale used when a chat has no explicit choice. */
const FALLBACK = "en";

/**
 * Fill {{placeholders}} from a variables object. Anything without a matching
 * variable is left as-is so a missing value is visible rather than silent.
 * @param {string} template
 * @param {object} vars
 * @returns {string}
 */
function interpolate(template, vars = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name)
      ? String(vars[name])
      : match
  );
}

/**
 * Look up a string in a chat's language.
 *
 * An unknown locale, or a key a locale has not translated yet, falls back to
 * English rather than showing the key - a half-translated release still reads
 * as sentences.
 * @param {string|null} lang
 * @param {string} key
 * @param {object} [vars]
 * @returns {string}
 */
function t(lang, key, vars = {}) {
  const catalog = CATALOGS[lang] || CATALOGS[FALLBACK];
  const template = catalog[key] ?? CATALOGS[FALLBACK][key] ?? key;
  return interpolate(template, vars);
}

/**
 * Bind a language once, for handlers that use several strings.
 * @param {string|null} lang
 * @returns {(key: string, vars?: object) => string}
 */
function translator(lang) {
  return (key, vars) => t(lang, key, vars);
}

/**
 * The translator for a resolved session, defaulting to English when there is no
 * session yet (an unlinked chat has told us nothing about itself).
 * @param {{language?: string|null}|null} session
 * @returns {(key: string, vars?: object) => string}
 */
function translatorFor(session) {
  return translator(session?.language || FALLBACK);
}

module.exports = {
  CATALOGS,
  FALLBACK,
  t,
  translator,
  translatorFor,
  interpolate,
};
