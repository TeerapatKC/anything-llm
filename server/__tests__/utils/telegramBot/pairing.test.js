const {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  ATTEMPT_WINDOW_MS,
  createPairingCode,
  consumePairingCode,
  checkAttemptAllowance,
  recordFailedAttempt,
  clearAttempts,
  revokeCodesForUser,
} = require("../../../utils/telegramBot/utils/pairing");

const USER = { id: 7, username: "alice" };

describe("telegram pairing codes", () => {
  afterEach(() => {
    revokeCodesForUser(USER.id);
    clearAttempts("100");
    jest.useRealTimers();
  });

  it("redeems a code for the user who minted it", () => {
    const { code } = createPairingCode(USER);
    expect(code).toMatch(/^\d{6}$/);

    const { userId, error } = consumePairingCode({
      code,
      username: "alice",
    });
    expect(error).toBeNull();
    expect(userId).toBe(USER.id);
  });

  it("accepts the username case-insensitively", () => {
    const { code } = createPairingCode(USER);
    const { userId } = consumePairingCode({ code, username: "ALICE" });
    expect(userId).toBe(USER.id);
  });

  it("refuses a code paired with the wrong username", () => {
    const { code } = createPairingCode(USER);
    const { userId, error } = consumePairingCode({ code, username: "bob" });
    expect(error).toBe("invalid");
    expect(userId).toBeNull();

    // The failed attempt must not have burned the code for its real owner.
    expect(consumePairingCode({ code, username: "alice" }).userId).toBe(
      USER.id
    );
  });

  it("only lets a code be redeemed once", () => {
    const { code } = createPairingCode(USER);
    expect(consumePairingCode({ code, username: "alice" }).userId).toBe(
      USER.id
    );
    expect(consumePairingCode({ code, username: "alice" }).error).toBe(
      "invalid"
    );
  });

  it("invalidates the previous code when a new one is minted", () => {
    const first = createPairingCode(USER).code;
    const second = createPairingCode(USER).code;

    expect(consumePairingCode({ code: first, username: "alice" }).error).toBe(
      "invalid"
    );
    expect(consumePairingCode({ code: second, username: "alice" }).userId).toBe(
      USER.id
    );
  });

  it("expires a code after its TTL", () => {
    jest.useFakeTimers();
    const { code } = createPairingCode(USER);

    jest.advanceTimersByTime(CODE_TTL_MS + 1000);
    expect(consumePairingCode({ code, username: "alice" }).error).toBe(
      "invalid"
    );
  });

  it("drops codes when the user unlinks", () => {
    const { code } = createPairingCode(USER);
    revokeCodesForUser(USER.id);
    expect(consumePairingCode({ code, username: "alice" }).error).toBe(
      "invalid"
    );
  });

  it("locks a chat out after repeated failures and lets it back in later", () => {
    jest.useFakeTimers();
    for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailedAttempt("100");

    const blocked = checkAttemptAllowance("100");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryInSeconds).toBeGreaterThan(0);

    jest.advanceTimersByTime(ATTEMPT_WINDOW_MS + 1000);
    expect(checkAttemptAllowance("100").allowed).toBe(true);
  });

  it("counts attempts per chat", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailedAttempt("100");
    expect(checkAttemptAllowance("100").allowed).toBe(false);
    expect(checkAttemptAllowance("200").allowed).toBe(true);
    clearAttempts("200");
  });
});
