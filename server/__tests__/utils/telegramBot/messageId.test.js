const { asMessageId } = require("../../../utils/telegramBot/utils");

describe("asMessageId", () => {
  it("keeps a real message id", () => {
    expect(asMessageId(42)).toBe(42);
    expect(asMessageId(0)).toBe(0);
  });

  it("refuses anything that is not one", () => {
    // A command invocation passes its own arguments through this position - a
    // whole Telegram message object used to land here and be sent to
    // editMessageText, which Telegram answers with "message to edit not found".
    expect(asMessageId({ message_id: 42, chat: { id: 1 } })).toBeNull();
    expect(asMessageId("/switch")).toBeNull();
    expect(asMessageId(undefined)).toBeNull();
    expect(asMessageId(null)).toBeNull();
    expect(asMessageId(1.5)).toBeNull();
    expect(asMessageId(NaN)).toBeNull();
  });
});
