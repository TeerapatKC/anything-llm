process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

jest.mock("../../../../../utils/ImageGenerators", () => ({
  generateImageForWorkspace: jest.fn(),
  isImageGenerationAvailable: jest.fn(),
}));
jest.mock("../../../../../models/workspaceChats", () => ({
  WorkspaceChats: { appendOutput: jest.fn() },
}));

const {
  generateImageForWorkspace,
  isImageGenerationAvailable,
} = require("../../../../../utils/ImageGenerators");
const { WorkspaceChats } = require("../../../../../models/workspaceChats");
const {
  generateImage,
} = require("../../../../../utils/agents/aibitat/plugins/generate-image");

function createAgent() {
  const agent = {
    function: jest.fn(),
    socket: { send: jest.fn() },
    trackedChatId: 42,
    handlerProps: { log: jest.fn() },
  };
  generateImage.plugin().setup(agent);
  return {
    agent,
    tool: agent.function.mock.calls[0][0],
  };
}

describe("generate-image agent skill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isImageGenerationAvailable.mockReturnValue(true);
    WorkspaceChats.appendOutput.mockResolvedValue(true);
    generateImageForWorkspace.mockResolvedValue({
      storageFilename: "image-1.png",
      filename: "fox.png",
      fileSize: 123,
    });
  });

  it("stores the image reference before showing its card", async () => {
    const { agent, tool } = createAgent();
    const result = await tool.handler.call(tool, { prompt: "a fox" });

    expect(result).toMatch(/created and shown/);
    expect(generateImageForWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "a fox" })
    );
    expect(WorkspaceChats.appendOutput).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        type: "imageGenerationCard",
        payload: expect.objectContaining({ storageFilename: "image-1.png" }),
      })
    );
    expect(agent._pendingOutputs).toHaveLength(1);
    expect(agent.socket.send).toHaveBeenCalledWith(
      "imageGenerationCard",
      expect.objectContaining({
        outputs: agent._pendingOutputs,
        chatId: 42,
      })
    );
    expect(
      WorkspaceChats.appendOutput.mock.invocationCallOrder[0]
    ).toBeLessThan(
      agent.socket.send.mock.invocationCallOrder[1]
    );
  });

  it("does not generate when the endpoint is unavailable", async () => {
    isImageGenerationAvailable.mockReturnValue(false);
    const { agent, tool } = createAgent();

    await expect(tool.handler.call(tool, { prompt: "a fox" })).resolves.toMatch(
      /unavailable/
    );
    expect(generateImageForWorkspace).not.toHaveBeenCalled();
    expect(agent.socket.send).not.toHaveBeenCalled();
  });

  it("does not show a file the chat could not authorize", async () => {
    WorkspaceChats.appendOutput.mockResolvedValue(false);
    const { agent, tool } = createAgent();
    await tool.handler.call(tool, { prompt: "a fox" });

    expect(agent._pendingOutputs).toBeUndefined();
    expect(agent.socket.send).toHaveBeenLastCalledWith(
      "imageGenerationCard",
      expect.objectContaining({ failed: true })
    );
  });
});
