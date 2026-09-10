const {
  isTelegramPollingConflict,
} = require("../../../utils/telegramBot/pollingErrors");

describe("isTelegramPollingConflict", () => {
  it("recognizes the getUpdates conflict emitted by node-telegram-bot-api", () => {
    expect(
      isTelegramPollingConflict({
        code: "ETELEGRAM",
        message:
          "ETELEGRAM: 409 Conflict: terminated by other getUpdates request; make sure that only one bot instance is running",
      })
    ).toBe(true);
  });

  it("recognizes a structured Telegram 409 response", () => {
    expect(isTelegramPollingConflict({ response: { statusCode: 409 } })).toBe(
      true
    );
  });

  it("does not confuse transient network failures with polling conflicts", () => {
    expect(
      isTelegramPollingConflict({
        code: "ETIMEDOUT",
        message: "request timed out",
      })
    ).toBe(false);
  });
});
