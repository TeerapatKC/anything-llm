jest.mock("../../utils/prisma", () => ({
  workspace_chats: {
    upsert: jest.fn(),
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
