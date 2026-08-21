/**
 * First-run setup.
 *
 * `createInitialAdmin` is the single gate a brand new deployment passes through, whether
 * the operator walked the onboarding screen or the container was started with
 * `ADMIN_USERNAME`/`ADMIN_PASSWORD`. Three things have to happen there, and each one used
 * to live somewhere in the onboarding UI where it could be - and was - missed:
 *
 *   - the owner account is created;
 *   - the instance is marked as onboarded (the UI called this before anyone had signed
 *     in, so the authenticated endpoint quietly refused it);
 *   - nothing else. A new instance deliberately starts with no workspaces, so the owner
 *     names their first one themselves.
 *
 * The first two are asserted together because the failure mode is always the same: a step
 * gets removed from onboarding and takes an invisible responsibility with it.
 */

const mockState = { users: 0, workspaces: [] };

jest.mock("../../../models/user", () => ({
  User: {
    count: jest.fn(async () => mockState.users),
    createSuperAdmin: jest.fn(async ({ username, email }) => ({
      user: { id: 1, username, email, role: "super-admin" },
      error: null,
    })),
  },
}));

jest.mock("../../../models/workspace", () => ({
  Workspace: {
    where: jest.fn(async () => mockState.workspaces),
    new: jest.fn(async (name, creatorId) => ({
      workspace: { id: 1, name, slug: "my-workspace", creatorId },
      message: null,
    })),
  },
}));

jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { markOnboardingComplete: jest.fn(async () => true) },
}));

jest.mock("../../../models/eventLogs", () => ({
  EventLogs: { logEvent: jest.fn() },
}));

jest.mock("../../../utils/helpers/updateENV", () => ({
  updateENV: jest.fn(async () => ({})),
}));

const { User } = require("../../../models/user");
const { Workspace } = require("../../../models/workspace");
const { SystemSettings } = require("../../../models/systemSettings");
const { createInitialAdmin } = require("../../../utils/boot/bootstrapAdmin");

const CREDENTIALS = {
  username: "owner",
  email: "owner@example.com",
  password: "hunter2hunter2",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockState.users = 0;
  mockState.workspaces = [];
  process.env.JWT_SECRET = "already-set";
});

describe("createInitialAdmin", () => {
  it("creates the owner as a super admin", async () => {
    const { user, error } = await createInitialAdmin(CREDENTIALS);

    expect(error).toBeNull();
    expect(user.role).toBe("super-admin");
    expect(User.createSuperAdmin).toHaveBeenCalledWith(CREDENTIALS);
  });

  it("records the instance as onboarded", async () => {
    // Without this the app has no owner-visible way to leave onboarding: every route
    // guard reads the flag and sends the user straight back to setup.
    await createInitialAdmin(CREDENTIALS);
    expect(SystemSettings.markOnboardingComplete).toHaveBeenCalled();
  });

  it("creates no workspace, leaving the first one to the owner", async () => {
    await createInitialAdmin(CREDENTIALS);
    expect(Workspace.new).not.toHaveBeenCalled();
  });

  it("refuses once the instance has any account at all", async () => {
    mockState.users = 1;

    const { user, error } = await createInitialAdmin(CREDENTIALS);

    expect(user).toBeNull();
    expect(error).toMatch(/already been set up/i);
    expect(User.createSuperAdmin).not.toHaveBeenCalled();
    expect(Workspace.new).not.toHaveBeenCalled();
  });
});
