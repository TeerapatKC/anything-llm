const { CATALOGS, FALLBACK, t, translator } = require("../../../utils/lineBot/i18n");
const {
  RESPONSE_LANGUAGES,
} = require("../../../utils/telegramBot/utils/language");

const LOCALES = Object.keys(CATALOGS);

describe("line bot translations", () => {
  it("covers every language the bot offers", () => {
    // A language a chat can pick but that has no catalog would silently answer
    // in English while claiming otherwise. Reuses Telegram's language list.
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
    const placeholders = (text) => (text.match(/\{\{(\w+)\}\}/g) || []).sort();
    for (const [key, english] of Object.entries(CATALOGS[FALLBACK])) {
      const translated = CATALOGS[locale][key];
      if (!translated) continue;
      expect({ key, vars: placeholders(translated) }).toEqual({
        key,
        vars: placeholders(english),
      });
    }
  });

  it("falls back to English for an unknown locale or key", () => {
    expect(t("de", "chat.no_response")).toBe(CATALOGS.en["chat.no_response"]);
    expect(t("th", "no.such.key")).toBe("no.such.key");
  });

  it("translates into the chosen language", () => {
    expect(t("th", "unlink.done")).toBe(CATALOGS.th["unlink.done"]);
    expect(t("ja", "unlink.done")).toBe(CATALOGS.ja["unlink.done"]);
    expect(t("th", "unlink.done")).not.toBe(CATALOGS.en["unlink.done"]);
  });

  it("gives an unset language the fallback", () => {
    expect(translator(null)("chat.no_response")).toBe(
      CATALOGS.en["chat.no_response"]
    );
  });
});
