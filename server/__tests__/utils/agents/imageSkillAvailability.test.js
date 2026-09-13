process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

jest.mock("../../../utils/ImageGenerators", () => ({
  isImageGenerationAvailable: jest.fn(),
  generateImageForWorkspace: jest.fn(),
}));
jest.mock("../../../utils/agents/aibitat/providers/ai-provider", () => ({
  systemPrompt: jest.fn(),
}));
jest.mock("../../../utils/agents/aibitat/plugins", () => ({
  memory: { name: "rag-memory" },
  docSummarizer: { name: "document-summarizer" },
  webScraping: { name: "web-scraping" },
  generateImage: { name: "generate-image" },
  requestUserInput: { name: "request-user-input", plugin: [] },
  "generate-image": { name: "generate-image" },
}));
jest.mock("../../../utils/agentFlows", () => ({
  AgentFlows: { globalFlows: jest.fn().mockReturnValue([]) },
}));
jest.mock("../../../utils/MCP", () => jest.fn());

const {
  isImageGenerationAvailable,
} = require("../../../utils/ImageGenerators");
const {
  agentSkillsFromSystemSettings,
} = require("../../../utils/agents/defaults");

describe("generate-image skill selection", () => {
  const selected = {
    activeDefaultSkills: [],
    activeSkills: ["generate-image"],
    disabledSubSkills: {},
  };

  it("loads the tool only when the workspace enables it and the endpoint is ready", async () => {
    isImageGenerationAvailable.mockReturnValue(true);
    await expect(
      agentSkillsFromSystemSettings(null, selected)
    ).resolves.toContain("generate-image");
    await expect(
      agentSkillsFromSystemSettings(null, {
        ...selected,
        activeSkills: [],
      })
    ).resolves.not.toContain("generate-image");

    isImageGenerationAvailable.mockReturnValue(false);
    await expect(
      agentSkillsFromSystemSettings(null, selected)
    ).resolves.not.toContain("generate-image");
  });
});
