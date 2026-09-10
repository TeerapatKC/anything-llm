// The agentSkillConfig validation lazily pulls in utils/agents/workspaceSkills, which
// resolves storage paths at require time.
process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

const mockDb = { workspaces: [] };

jest.mock("../../utils/prisma", () => ({
  workspaces: {
    findFirst: async ({ where }) =>
      mockDb.workspaces.find((w) => w.id === where.id) ?? null,
    update: async ({ where, data }) => {
      const workspace = mockDb.workspaces.find((w) => w.id === where.id);
      Object.assign(workspace, data);
      return workspace;
    },
  },
  system_settings: { findFirst: async () => null },
}));

jest.mock("../../models/user", () => ({ User: {} }));
jest.mock("../../models/promptHistory", () => ({ PromptHistory: {} }));

const { Workspace } = require("../../models/workspace");

beforeEach(() => {
  mockDb.workspaces = [
    { id: 1, name: "Shared", slug: "shared", type: "shared", ownerId: null },
    { id: 2, name: "Mine", slug: "mine", type: "personal", ownerId: 7 },
  ];
});

describe("a private workspace has no settings", () => {
  it("refuses every field but the name", async () => {
    const { workspace, message } = await Workspace.update(2, {
      openAiPrompt: "you are a pirate",
      chatMode: "query",
    });

    expect(message).toMatch(/no settings to change/i);
    expect(workspace).toBeNull();
    expect(mockDb.workspaces[1].openAiPrompt).toBeUndefined();
    expect(mockDb.workspaces[1].chatMode).toBeUndefined();
  });

  it("refuses a rename smuggled in alongside a setting", async () => {
    const { message } = await Workspace.update(2, {
      name: "Renamed",
      openAiTemp: 0.9,
    });

    expect(message).toMatch(/no settings to change/i);
    expect(mockDb.workspaces[1].name).toBe("Mine");
  });

  it("still allows the rename on its own", async () => {
    const { workspace } = await Workspace.update(2, { name: "Renamed" });
    expect(workspace.name).toBe("Renamed");
  });

  it("leaves shared workspaces alone", async () => {
    const { workspace } = await Workspace.update(1, { chatMode: "query" });
    expect(workspace.chatMode).toBe("query");
  });
});

describe("private workspaces are hidden from everyone else", () => {
  it("matches shared workspaces and only the caller's own private ones", () => {
    const clause = Workspace._ownPersonalWorkspacesOnly({ id: 7 });
    expect(clause.OR).toEqual([
      { type: { not: "personal" } },
      { type: "personal", ownerId: 7 },
    ]);
  });

  it("matches nobody's private workspaces when there is no user", () => {
    const clause = Workspace._ownPersonalWorkspacesOnly(null);
    expect(clause.OR[1].ownerId).toBe(-1);
  });
});
