const {
  CATALOGS,
  FALLBACK,
  t,
  translator,
  translatorFor,
  interpolate,
} = require("../../../utils/telegramBot/utils/i18n");
const {
  BOT_COMMANDS,
} = require("../../../utils/telegramBot/utils/commands");
const {
  RESPONSE_LANGUAGES,
} = require("../../../utils/telegramBot/utils/language");

const LOCALES = Object.keys(CATALOGS);

describe("telegram bot translations", () => {
  it("covers every language the bot offers", () => {
    // A language a chat can pick but that has no catalog would silently answer
    // in English while claiming otherwise.
    for (const language of RESPONSE_LANGUAGES) {
      if (!language.code) continue;
      expect(LOCALES).toContain(language.code);
    }
  });

  it.each(LOCALES.filter((l) => l !== FALLBACK))(
    "%s has exactly the keys English has",
    (locale) => {
      const expected = Object.keys(CATALOGS[FALLBACK]).sort();
      expect(Object.keys(CATALOGS[locale]).sort()).toEqual(expected);
    }
  );

  it.each(LOCALES)("%s uses the same placeholders as English", (locale) => {
    const placeholders = (text) =>
      (text.match(/\{\{(\w+)\}\}/g) || []).sort();
    for (const [key, english] of Object.entries(CATALOGS[FALLBACK])) {
      const translated = CATALOGS[locale][key];
      if (!translated) continue;
      expect({ key, vars: placeholders(translated) }).toEqual({
        key,
        vars: placeholders(english),
      });
    }
  });

  it("describes every command in every language", () => {
    for (const locale of LOCALES) {
      for (const command of BOT_COMMANDS) {
        expect(CATALOGS[locale][`command.${command.command}`]).toBeTruthy();
      }
    }
  });

  it("fills placeholders and leaves unknown ones visible", () => {
    expect(interpolate("Hi {{name}}", { name: "Ada" })).toBe("Hi Ada");
    expect(interpolate("Hi {{name}}", {})).toBe("Hi {{name}}");
  });

  it("falls back to English for an unknown locale or key", () => {
    expect(t("de", "common.error")).toBe(CATALOGS.en["common.error"]);
    expect(t("th", "no.such.key")).toBe("no.such.key");
  });

  it("translates into the chosen language", () => {
    expect(t("th", "abort.done")).toBe(CATALOGS.th["abort.done"]);
    expect(t("ja", "abort.done")).toBe(CATALOGS.ja["abort.done"]);
    expect(t("th", "abort.done")).not.toBe(CATALOGS.en["abort.done"]);
  });

  it("gives a chat on Auto the fallback language", () => {
    // Auto describes what the assistant does with the user's message; there is
    // nothing to detect before that message arrives.
    expect(translatorFor({ language: null })("common.error")).toBe(
      CATALOGS.en["common.error"]
    );
    expect(translatorFor(null)("common.error")).toBe(CATALOGS.en["common.error"]);
    expect(translator("th")("common.error")).toBe(CATALOGS.th["common.error"]);
  });
});
