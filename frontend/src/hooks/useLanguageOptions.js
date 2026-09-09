import i18n from "@/i18n";
import { resources as languages } from "@/locales/resources";

export function useLanguageOptions() {
  const supportedLanguages = Object.keys(languages);
  const changeLanguage = (newLang = "en") => {
    if (!Object.keys(languages).includes(newLang)) return false;
    i18n.changeLanguage(newLang);
  };

  const getLanguageName = (lang = "en") => {
    try {
      // Use each language as its own locale so options are shown natively:
      // English, 日本語, ไทย, etc.
      return new Intl.DisplayNames([lang], { type: "language" }).of(lang);
    } catch {
      return lang;
    }
  };

  return {
    currentLanguage: i18n.language || "en",
    supportedLanguages,
    getLanguageName,
    changeLanguage,
  };
}
