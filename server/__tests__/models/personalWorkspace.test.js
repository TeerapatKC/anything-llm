// In-memory stand-ins for the tables the private workspace policy touches. The point
// of these tests is the review flow: a policy change must never destroy anything on its
// own, and an answer must only ever act on what the review actually named.
const mockDb = {
  workspaces: [],
  settings: [],
  documents: [],
  chats: [],
};

function mockReset() {
  mockDb.workspaces = [];
  mockDb.settings = [];
  mockDb.documents = [];
  mockDb.chats = [];
}

function mockMatches(row, where = {}) {
  return Object.entries(where).every(([field, condition]) => {
    if (field === "NOT")
      return !Object.entries(condition).every(
        ([key, value]) => row[key] === value
      );
    if (condition && typeof condition === "object" && "in" in condition)
      return condition.in.includes(row[field]);
    if (condition && typeof condition === "object" && "notIn" in condition)
      return !condition.notIn.includes(row[field]);
    return row[field] === condition;
  });
}

jest.mock("../../utils/prisma", () => ({
  workspaces: {
    findMany: async ({ where = {}, orderBy } = {}) => {
      const rows = mockDb.workspaces.filter((w) => mockMatches(w, where));
      const [first] = Array.isArray(orderBy) ? orderBy.slice(-1) : [orderBy];
      if (first?.createdAt)
        rows.sort((a, b) => a.createdAt - b.createdAt);
      return rows;
    },
    count: async ({ where = {} } = {}) =>
      mockDb.workspaces.filter((w) => mockMatches(w, where)).length,
    findFirst: async ({ where = {} } = {}) =>
      mockDb.workspaces.find((w) => mockMatches(w, where)) ?? null,
  },
  workspace_documents: {
    count: async ({ where = {} } = {}) =>
      mockDb.documents.filter((d) => mockMatches(d, where)).length,
  },
  workspace_chats: {
    count: async ({ where = {} } = {}) =>
      mockDb.chats.filter((c) => mockMatches(c, where)).length,
    findFirst: async ({ where = {} } = {}) =>
      mockDb.chats.find((c) => mockMatches(c, where)) ?? null,
  },
  system_settings: {
    findFirst: async ({ where }) =>
      mockDb.settings.find((s) => s.label === where.label) ?? null,
    upsert: async ({ where, update, create }) => {
      const existing = mockDb.settings.find((s) => s.label === where.label);
      if (existing) {
        existing.value = update.value;
        return existing;
      }
      mockDb.settings.push({ ...create });
      return create;
    },
  },
}));

const mockPurge = jest.fn(async () => true);
const mockUpdate = jest.fn(async (id, data) => {
  const workspace = mockDb.workspaces.find((w) => w.id === id);
  if (workspace) Object.assign(workspace, data);
  return { workspace, message: null };
});

jest.mock("../../models/workspace", () => ({
  Workspace: {
    get: async ({ id }) => mockDb.workspaces.find((w) => w.id === id) ?? null,
    purge: (...args) => mockPurge(...args),
    _update: (...args) => mockUpdate(...args),
    new: jest.fn(),
  },
}));

jest.mock("../../models/workspaceRole", () => ({
  WorkspaceRole: { get: async () => ({ id: 99 }) },
}));

jest.mock("../../models/user", () => ({
  User: { get: async ({ id }) => ({ id, username: `user${id}` }) },
}));

jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: jest.fn(async () => ({})) },
}));

const { PersonalWorkspace } = require("../../models/personalWorkspace");
const { WorkspaceDefaults } = require("../../models/workspaceDefaults");

/** @param {number} id @param {number} ownerId @param {number} day */
function personalWorkspace(id, ownerId, day) {
  return {
    id,
    name: `ws-${id}`,
    slug: `ws-${id}`,
    active: true,
    type: "personal",
    ownerId,
    createdAt: new Date(2026, 0, day),
  };
}

async function setPolicy(profile) {
  await WorkspaceDefaults.update("personal", profile);
}

beforeEach(async () => {
  mockReset();
  mockPurge.mockClear();
  mockUpdate.mockClear();
  PersonalWorkspace._reviews.clear();
});

describe("quota accounting", () => {
  it("counts only the caller's own private workspaces", async () => {
    mockDb.workspaces.push(
      personalWorkspace(1, 7, 1),
      personalWorkspace(2, 7, 2),
      personalWorkspace(3, 8, 3),
      { id: 4, type: "shared", ownerId: null, createdAt: new Date() }
    );
    expect(await PersonalWorkspace.countFor(7)).toBe(2);
    expect(await PersonalWorkspace.countFor(8)).toBe(1);
  });

  it("refuses to create beyond the quota", async () => {
    await setPolicy({ enabled: true, quotaPerUser: 1 });
    mockDb.workspaces.push(personalWorkspace(1, 7, 1));

    const { workspace, message } = await PersonalWorkspace.create({ id: 7 });
    expect(workspace).toBeNull();
    expect(message).toMatch(/maximum/i);
  });

  it("refuses to create at all while the feature is off", async () => {
    await setPolicy({ enabled: false, quotaPerUser: 5 });
    const { workspace, message } = await PersonalWorkspace.create({ id: 7 });
    expect(workspace).toBeNull();
    expect(message).toMatch(/turned off/i);
  });
});

describe("impact of a policy change", () => {
  beforeEach(async () => {
    await setPolicy({ enabled: true, quotaPerUser: 3 });
    // Two owners, three workspaces each, oldest first.
    for (const owner of [7, 8])
      for (const day of [1, 2, 3])
        mockDb.workspaces.push(personalWorkspace(owner * 10 + day, owner, day));
  });

  it("is empty when nothing narrows", async () => {
    const impact = await PersonalWorkspace.impactOf({ quotaPerUser: 5 });
    expect(impact.affected).toEqual([]);
  });

  it("keeps each owner's oldest and flags the rest when the quota drops", async () => {
    const impact = await PersonalWorkspace.impactOf({ quotaPerUser: 1 });
    expect(impact.quotaReduced).toBe(true);
    expect(impact.affected.map((w) => w.id).sort((a, b) => a - b)).toEqual([
      72, 73, 82, 83,
    ]);
    expect(impact.affected.every((w) => w.suggested)).toBe(true);
  });

  it("covers every private workspace when the feature is turned off", async () => {
    const impact = await PersonalWorkspace.impactOf({ enabled: false });
    expect(impact.disabling).toBe(true);
    expect(impact.affected).toHaveLength(6);
  });

  it("reports what an operator needs to judge each one", async () => {
    mockDb.documents.push({ workspaceId: 73 }, { workspaceId: 73 });
    mockDb.chats.push({ workspaceId: 73, createdAt: new Date(2026, 1, 1) });

    const impact = await PersonalWorkspace.impactOf({ quotaPerUser: 1 });
    const row = impact.affected.find((w) => w.id === 73);
    expect(row).toMatchObject({
      ownerUsername: "user7",
      documentCount: 2,
      chatCount: 1,
    });
    expect(row.lastActivityAt).toEqual(new Date(2026, 1, 1));
  });
});

describe("answering the review", () => {
  beforeEach(async () => {
    await setPolicy({ enabled: true, quotaPerUser: 2 });
    mockDb.workspaces.push(
      personalWorkspace(1, 7, 1),
      personalWorkspace(2, 7, 2),
      personalWorkspace(3, 7, 3)
    );
  });

  it("holds the change back rather than saving it", async () => {
    const review = await PersonalWorkspace.openReview(
      { id: 1 },
      { quotaPerUser: 1 }
    );
    expect(review.affected.map((w) => w.id)).toEqual([2, 3]);
    // Nothing saved and nothing touched until the review is answered.
    expect((await PersonalWorkspace.profile()).quotaPerUser).toBe(2);
    expect(mockPurge).not.toHaveBeenCalled();
  });

  it("saves without touching anything when the operator skips", async () => {
    const review = await PersonalWorkspace.openReview(
      { id: 1 },
      { quotaPerUser: 1 }
    );
    const result = await PersonalWorkspace.resolveReview(
      { id: 1 },
      { token: review.token, action: "skip", workspaceIds: [2, 3] }
    );

    expect(result.success).toBe(true);
    expect(mockPurge).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect((await PersonalWorkspace.profile()).quotaPerUser).toBe(1);
  });

  it("acts only on the workspaces the operator picked", async () => {
    const review = await PersonalWorkspace.openReview(
      { id: 1 },
      { quotaPerUser: 1 }
    );
    const result = await PersonalWorkspace.resolveReview(
      { id: 1 },
      { token: review.token, action: "delete", workspaceIds: [3] }
    );

    expect(result.success).toBe(true);
    expect(mockPurge).toHaveBeenCalledTimes(1);
    expect(mockPurge.mock.calls[0][0].id).toBe(3);
  });

  it("ignores ids the review never named", async () => {
    mockDb.workspaces.push(personalWorkspace(4, 9, 1));
    const review = await PersonalWorkspace.openReview(
      { id: 1 },
      { quotaPerUser: 1 }
    );
    await PersonalWorkspace.resolveReview(
      { id: 1 },
      { token: review.token, action: "delete", workspaceIds: [4] }
    );
    expect(mockPurge).not.toHaveBeenCalled();
  });

  it("deactivates rather than deletes when asked to", async () => {
    const review = await PersonalWorkspace.openReview(
      { id: 1 },
      { quotaPerUser: 1 }
    );
    await PersonalWorkspace.resolveReview(
      { id: 1 },
      { token: review.token, action: "deactivate", workspaceIds: [2, 3] }
    );

    expect(mockPurge).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockDb.workspaces.find((w) => w.id === 3).active).toBe(false);
  });

  it("refuses an answer given before a workspace that now exists", async () => {
    const review = await PersonalWorkspace.openReview(
      { id: 1 },
      { quotaPerUser: 1 }
    );
    mockDb.workspaces.push(personalWorkspace(4, 7, 4));

    const result = await PersonalWorkspace.resolveReview(
      { id: 1 },
      { token: review.token, action: "delete", workspaceIds: [2, 3] }
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/changed while you were reviewing/i);
    expect(mockPurge).not.toHaveBeenCalled();
    expect((await PersonalWorkspace.profile()).quotaPerUser).toBe(2);
  });

  it("refuses a token belonging to somebody else", async () => {
    const review = await PersonalWorkspace.openReview(
      { id: 1 },
      { quotaPerUser: 1 }
    );
    const result = await PersonalWorkspace.resolveReview(
      { id: 2 },
      { token: review.token, action: "delete", workspaceIds: [3] }
    );
    expect(result.success).toBe(false);
    expect(mockPurge).not.toHaveBeenCalled();
  });

  it("refuses an unknown action", async () => {
    const review = await PersonalWorkspace.openReview(
      { id: 1 },
      { quotaPerUser: 1 }
    );
    const result = await PersonalWorkspace.resolveReview(
      { id: 1 },
      { token: review.token, action: "purge-everything", workspaceIds: [3] }
    );
    expect(result.success).toBe(false);
    expect(mockPurge).not.toHaveBeenCalled();
  });
});

describe("the policy profile", () => {
  it("starts switched off with one workspace each", async () => {
    const profile = await PersonalWorkspace.profile();
    expect(profile.enabled).toBe(false);
    expect(profile.quotaPerUser).toBe(1);
  });

  it("clamps a nonsense quota back to the default", async () => {
    await setPolicy({ quotaPerUser: -4 });
    expect((await PersonalWorkspace.profile()).quotaPerUser).toBe(1);
  });

  it("keeps a zero quota, which stops new ones without removing any", async () => {
    await setPolicy({ enabled: true, quotaPerUser: 0 });
    expect((await PersonalWorkspace.profile()).quotaPerUser).toBe(0);
  });

  it("renders the name template", () => {
    expect(
      PersonalWorkspace.nameFor({ username: "ada" }, "{username}'s Space")
    ).toBe("ada's Space");
  });
});
