jest.mock("../../utils/prisma", () => ({
  workspace_chats: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
}));

const prisma = require("../../utils/prisma");
const { WorkspaceChats } = require("../../models/workspaceChats");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("WorkspaceChats.upsert", () => {
  const revealArgs = {
    workspaceId: 5,
    response: { text: "", sources: [], type: "chat" },
    user: { id: 2 },
    threadId: 22,
    include: true,
    // No prompt: the turn errored before it ever produced a reply, and the
    // prompt is already on the row this call is meant to reveal.
  };

  it("sends a usable create branch when the caller has no prompt", async () => {
    prisma.workspace_chats.upsert.mockResolvedValue({ id: 49, include: true });

    const { chat, message } = await WorkspaceChats.upsert(49, revealArgs);

    // Prisma rejects the whole call - update included - when a required field is
    // missing from `create`, which is what used to leave the prompt hidden.
    const [args] = prisma.workspace_chats.upsert.mock.calls[0];
    expect(args.create.prompt).toBe("");
    expect(args.create).not.toHaveProperty("prompt", undefined);
    expect(args.where).toEqual({ id: 49, user_id: 2 });
    expect(args.update.include).toBe(true);
    // The update must not carry a prompt: the row already holds the real one.
    expect(args.update).not.toHaveProperty("prompt");

    expect(chat).toEqual({ id: 49, include: true });
    expect(message).toBeNull();
  });

  it("keeps the caller's prompt when there is one", async () => {
    prisma.workspace_chats.upsert.mockResolvedValue({ id: 50 });

    await WorkspaceChats.upsert(50, { ...revealArgs, prompt: "hello" });

    const [args] = prisma.workspace_chats.upsert.mock.calls[0];
    expect(args.create.prompt).toBe("hello");
  });

  it("returns the record rather than a field of it", async () => {
    prisma.workspace_chats.upsert.mockResolvedValue({ id: 51, include: true });

    const { chat } = await WorkspaceChats.upsert(51, revealArgs);
    expect(chat.id).toBe(51);
  });
});

describe("WorkspaceChats._update", () => {
  it("stamps the edit time alongside the caller's fields", async () => {
    prisma.workspace_chats.update.mockResolvedValue({});

    const before = Date.now();
    const result = await WorkspaceChats._update(7, { prompt: "edited" });
    const after = Date.now();

    expect(result).toBe(true);
    const [args] = prisma.workspace_chats.update.mock.calls[0];
    expect(args.where).toEqual({ id: 7 });
    expect(args.data.prompt).toBe("edited");
    // The column is a plain default, not @updatedAt, so an edit that does not set it
    // leaves the chat reporting its creation time as the last time it changed.
    expect(args.data.lastUpdatedAt).toBeInstanceOf(Date);
    expect(args.data.lastUpdatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(args.data.lastUpdatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("refuses an update with no chat id", async () => {
    await expect(WorkspaceChats._update(null, { prompt: "x" })).rejects.toThrow(
      /no workspace chat id/i
    );
    expect(prisma.workspace_chats.update).not.toHaveBeenCalled();
  });

  it("reports a failed write rather than throwing", async () => {
    prisma.workspace_chats.update.mockRejectedValue(new Error("db error"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(WorkspaceChats._update(7, { include: false })).resolves.toBe(
      false
    );
    console.error.mockRestore();
  });
});
