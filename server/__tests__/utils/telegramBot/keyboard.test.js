const {
  TAB_ROWS,
  tabKeyboard,
  removeTabKeyboard,
  resolveTabAction,
} = require("../../../utils/telegramBot/utils/keyboard");
const {
  BOT_COMMANDS,
} = require("../../../utils/telegramBot/utils/commands");
const { CATALOGS, t } = require("../../../utils/telegramBot/utils/i18n");

const LOCALES = Object.keys(CATALOGS);

describe("telegram tab bar", () => {
  it("renders every button in the chat's language", () => {
    const keyboard = tabKeyboard("th");
    expect(keyboard.keyboard).toEqual(
      TAB_ROWS.map((row) => row.map((button) => ({ text: t("th", button.key) })))
    );
    expect(keyboard.is_persistent).toBe(true);
    expect(keyboard.resize_keyboard).toBe(true);
    expect(keyboard.input_field_placeholder).toBe(t("th", "menu.placeholder"));
  });

  it("falls back to English when the chat has no language", () => {
    expect(tabKeyboard(null).keyboard[0][0].text).toBe(
      t("en", TAB_ROWS[0][0].key)
    );
  });

  it("has no button for a command the list already covers", () => {
    // /switch and the workspace list both switch workspace; only the list is a
    // button, and /switch stays available as a command for picking a thread.
    expect(TAB_ROWS.flat().map((b) => b.command)).not.toContain("switch");
  });

  it("can be taken away again", () => {
    expect(removeTabKeyboard()).toEqual({ remove_keyboard: true });
  });

  it("routes a tap in any language to a real command handler", () => {
    // A bar drawn in Thai stays in the chat after a switch to English, so both
    // labels have to keep working.
    for (const locale of LOCALES) {
      for (const button of TAB_ROWS.flat()) {
        expect(typeof resolveTabAction(t(locale, button.key))).toBe("function");
      }
    }
  });

  it("only names commands the bot actually registers", () => {
    const registered = BOT_COMMANDS.map((c) => c.command);
    for (const button of TAB_ROWS.flat()) {
      expect(registered).toContain(button.command);
    }
  });

  it("leaves ordinary messages alone", () => {
    // A tapped button and a typed question arrive identically, so anything that
    // is not an exact label has to fall through to the LLM.
    expect(resolveTabAction("what is our refund policy?")).toBeNull();
    expect(resolveTabAction("Status")).toBeNull();
    expect(resolveTabAction("")).toBeNull();
    expect(resolveTabAction(undefined)).toBeNull();
  });

  it("tolerates the whitespace a client may add", () => {
    const label = t("en", TAB_ROWS[0][0].key);
    expect(typeof resolveTabAction(`  ${label} `)).toBe("function");
  });
});
