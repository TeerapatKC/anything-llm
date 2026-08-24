const { Memory } = require("../../models/memory");
const { SystemSettings } = require("../../models/systemSettings");

/**
 * Personalization is decided by two settings at different levels, and getting the
 * precedence wrong has real consequences in both directions: an instance that
 * turned the feature off must not keep writing memories for anyone, and a user
 * who opted out must not need an admin to make it stick.
 *
 * `null` on a user preference means "never touched the switch". It has to resolve
 * to on, otherwise enabling the feature on an existing deployment would silently
 * do nothing until every account opted in by hand.
 */
describe("memory preference resolution", () => {
  function instance({ enabled, auto = true }) {
    jest.spyOn(SystemSettings, "memoriesEnabled").mockResolvedValue(enabled);
    jest
      .spyOn(SystemSettings, "memoryAutoExtractionSetting")
      .mockResolvedValue(auto);
  }

  afterEach(() => jest.restoreAllMocks());

  describe("instance policy off", () => {
    beforeEach(() => instance({ enabled: false }));

    it("overrides an opted-in user", async () => {
      const user = { memoryEnabled: true, memoryAutoExtraction: true };
      expect(await Memory.enabledForUser(user)).toBe(false);
      expect(await Memory.autoEnabledForUser(user)).toBe(false);
    });

    it("keeps an untouched account off", async () => {
      const user = { memoryEnabled: null, memoryAutoExtraction: null };
      expect(await Memory.enabledForUser(user)).toBe(false);
      expect(await Memory.autoEnabledForUser(user)).toBe(false);
    });
  });

  describe("instance policy on", () => {
    beforeEach(() => instance({ enabled: true }));

    it("treats an untouched account as opted in", async () => {
      const user = { memoryEnabled: null, memoryAutoExtraction: null };
      expect(await Memory.enabledForUser(user)).toBe(true);
      expect(await Memory.autoEnabledForUser(user)).toBe(true);
    });

    it("honours a user who opted out", async () => {
      const user = { memoryEnabled: false, memoryAutoExtraction: null };
      expect(await Memory.enabledForUser(user)).toBe(false);
    });

    it("stops automatic extraction when the user opts out of memories entirely", async () => {
      const user = { memoryEnabled: false, memoryAutoExtraction: true };
      expect(await Memory.autoEnabledForUser(user)).toBe(false);
    });

    it("allows manual memories with automatic extraction switched off", async () => {
      const user = { memoryEnabled: true, memoryAutoExtraction: false };
      expect(await Memory.enabledForUser(user)).toBe(true);
      expect(await Memory.autoEnabledForUser(user)).toBe(false);
    });
  });

  it("lets the instance switch off automatic extraction for everyone", async () => {
    instance({ enabled: true, auto: false });
    const user = { memoryEnabled: true, memoryAutoExtraction: true };
    expect(await Memory.enabledForUser(user)).toBe(true);
    expect(await Memory.autoEnabledForUser(user)).toBe(false);
  });
});
