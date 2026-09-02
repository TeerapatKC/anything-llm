const {
  RESPONSE_LANGUAGES,
  normalizeLanguage,
  languageFor,
  languageLabel,
  withLanguageDirective,
  withLanguageNote,
} = require("../../../utils/telegramBot/utils/language");

describe("telegram reply language", () => {
  it("offers auto plus the three supported languages", () => {
    expect(RESPONSE_LANGUAGES.map((l) => l.code)).toEqual([
      null,
      "en",
      "th",
      "ja",
    ]);
  });

  it("normalises what is stored or tapped", () => {
    expect(normalizeLanguage("th")).toBe("th");
    expect(normalizeLanguage("JA")).toBe("ja");
    // "auto" is the callback's stand-in for "no language", and anything the bot
    // does not know has to fall back to auto rather than reach the model.
    expect(normalizeLanguage("auto")).toBeNull();
    expect(normalizeLanguage("klingon")).toBeNull();
    expect(normalizeLanguage(null)).toBeNull();
    expect(normalizeLanguage(undefined)).toBeNull();
  });

  it("leaves the prompt untouched on auto", () => {
    expect(withLanguageDirective("You are helpful.", null)).toBe(
      "You are helpful."
    );
    expect(withLanguageNote("hello", null)).toBe("hello");
  });

  it("appends the instruction for a chosen language", () => {
    const prompt = withLanguageDirective("You are helpful.", "th");
    expect(prompt).toContain("You are helpful.");
    expect(prompt).toContain("Thai");

    const note = withLanguageNote("summarise this", "ja");
    expect(note).toContain("summarise this");
    expect(note).toContain("Japanese");
  });

  it("treats an unknown stored value as auto rather than inventing one", () => {
    expect(withLanguageDirective("prompt", "de")).toBe("prompt");
    expect(languageFor("de").code).toBeNull();
    expect(languageLabel(null)).toBe(languageFor(null).label);
  });
});
