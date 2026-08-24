process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

/**
 * The boot-time reconciliation of `onboarding_complete`.
 *
 * The case that matters most is the fourth one: a fresh deploy whose environment names an
 * LLM provider, a vector DB and a JWT secret - which every docker deployment does - used to
 * be marked onboarded before anyone had created an account, leaving a login screen that no
 * password could open and no way to reach onboarding. So each test sets those variables, to
 * prove the flag now follows the database rather than the environment.
 */

const { SystemSettings } = require("../../../models/systemSettings");
const { User } = require("../../../models/user");
const { Workspace } = require("../../../models/workspace");

jest.mock("../../../models/systemSettings");
jest.mock("../../../models/user");
jest.mock("../../../models/workspace");

const markOnboarded = require("../../../utils/boot/markOnboarded");

/**
 * @param {{onboarded: boolean, users: number, workspaces: number}} state
 */
function givenInstance({ onboarded, users, workspaces }) {
  SystemSettings.isOnboardingComplete.mockResolvedValue(onboarded);
  SystemSettings.markOnboardingComplete.mockResolvedValue(true);
  SystemSettings.markOnboardingIncomplete.mockResolvedValue(true);
  User.count.mockResolvedValue(users);
  Workspace.where.mockResolvedValue(new Array(workspaces).fill({ id: 1 }));
}

describe("markOnboarded", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    // Every docker deployment has these set before its first boot.
    process.env.LLM_PROVIDER = "openai";
    process.env.VECTOR_DB = "lancedb";
    process.env.JWT_SECRET = "a-secret";
  });

  afterEach(() => {
    console.log.mockRestore();
    delete process.env.LLM_PROVIDER;
    delete process.env.VECTOR_DB;
    delete process.env.JWT_SECRET;
  });

  it("leaves a fresh instance un-onboarded so the setup screen can be reached", async () => {
    givenInstance({ onboarded: false, users: 0, workspaces: 0 });

    await expect(markOnboarded()).resolves.toBe(false);
    expect(SystemSettings.markOnboardingComplete).not.toHaveBeenCalled();
    expect(SystemSettings.markOnboardingIncomplete).not.toHaveBeenCalled();
  });

  it("marks a legacy multi-user instance onboarded", async () => {
    givenInstance({ onboarded: false, users: 2, workspaces: 3 });

    await expect(markOnboarded()).resolves.toBe(true);
    expect(SystemSettings.markOnboardingComplete).toHaveBeenCalled();
  });

  it("marks a legacy single-user instance onboarded from its workspaces alone", async () => {
    // Single-user mode held no user rows, but could not be used without a workspace.
    givenInstance({ onboarded: false, users: 0, workspaces: 1 });

    await expect(markOnboarded()).resolves.toBe(true);
    expect(SystemSettings.markOnboardingComplete).toHaveBeenCalled();
  });

  it("reopens onboarding for an instance flagged onboarded with nothing in it", async () => {
    givenInstance({ onboarded: true, users: 0, workspaces: 0 });

    await expect(markOnboarded()).resolves.toBe(false);
    expect(SystemSettings.markOnboardingIncomplete).toHaveBeenCalled();
    expect(SystemSettings.markOnboardingComplete).not.toHaveBeenCalled();
  });

  it("leaves a genuinely onboarded instance alone", async () => {
    givenInstance({ onboarded: true, users: 1, workspaces: 1 });

    await markOnboarded();
    expect(SystemSettings.markOnboardingIncomplete).not.toHaveBeenCalled();
    expect(SystemSettings.markOnboardingComplete).not.toHaveBeenCalled();
  });

  it("does not consult the environment when the database is empty", async () => {
    givenInstance({ onboarded: false, users: 0, workspaces: 0 });
    process.env.LLM_PROVIDER = "anthropic";
    process.env.VECTOR_DB = "pinecone";
    process.env.JWT_SECRET = "another-secret";

    await expect(markOnboarded()).resolves.toBe(false);
    expect(SystemSettings.markOnboardingComplete).not.toHaveBeenCalled();
  });
});
