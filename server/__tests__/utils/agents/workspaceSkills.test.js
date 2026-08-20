// Set required env vars before requiring modules
process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

const { SystemSettings } = require("../../../models/systemSettings");

jest.mock("../../../models/systemSettings");
jest.mock("../../../utils/agents/imported", () => ({
  activeImportedPlugins: jest.fn().mockReturnValue([]),
}));
jest.mock("../../../utils/agentFlows", () => ({
  AgentFlows: {
    activeFlowPlugins: jest.fn().mockReturnValue([]),
  },
}));

const {
  resolveRuntimeForWorkspace,
  instanceRuntimeConfig,
} = require("../../../utils/agents/workspaceSkills");

/** Build a workspace row carrying `runtime` overrides and nothing else. */
function workspaceWithRuntime(runtime) {
  return { agentSkillConfig: JSON.stringify({ runtime }) };
}

describe("agent runtime resolution", () => {
  const ENV_KEYS = [
    "AGENT_MAX_TOOL_CALLS",
    "AGENT_SKILL_RERANKER_ENABLED",
    "AGENT_SKILL_RERANKER_TOP_N",
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    ENV_KEYS.forEach((key) => delete process.env[key]);
    SystemSettings.getValueOrFallback = jest
      .fn()
      .mockImplementation(async (_clause, fallback) => fallback);
  });

  it("falls back to the built-in defaults when nothing is configured", async () => {
    await expect(instanceRuntimeConfig()).resolves.toEqual({
      maxToolCalls: 10,
      rerankerEnabled: true,
      rerankerTopN: 15,
      clarifyingQuestionsEnabled: false,
      clarifyingQuestionsMaxPerTurn: 3,
    });
  });

  it("reads the instance-wide values for a workspace with no overrides", async () => {
    process.env.AGENT_MAX_TOOL_CALLS = "20";
    process.env.AGENT_SKILL_RERANKER_TOP_N = "5";

    const resolved = await resolveRuntimeForWorkspace({
      agentSkillConfig: null,
    });
    expect(resolved.maxToolCalls).toBe(20);
    expect(resolved.rerankerTopN).toBe(5);
  });

  it("overrides only the knobs the workspace set", async () => {
    process.env.AGENT_MAX_TOOL_CALLS = "20";
    process.env.AGENT_SKILL_RERANKER_TOP_N = "5";

    const resolved = await resolveRuntimeForWorkspace(
      workspaceWithRuntime({ maxToolCalls: 40 })
    );
    expect(resolved.maxToolCalls).toBe(40);
    // Untouched knobs keep tracking the instance.
    expect(resolved.rerankerTopN).toBe(5);
    expect(resolved.rerankerEnabled).toBe(true);
  });

  it("lets a workspace turn a knob off while the instance has it on", async () => {
    const resolved = await resolveRuntimeForWorkspace(
      workspaceWithRuntime({ rerankerEnabled: false })
    );
    expect(resolved.rerankerEnabled).toBe(false);
  });

  it("lets a workspace turn a knob on while the instance has it off", async () => {
    process.env.AGENT_SKILL_RERANKER_ENABLED = "false";
    const instance = await instanceRuntimeConfig();
    expect(instance.rerankerEnabled).toBe(false);

    const resolved = await resolveRuntimeForWorkspace(
      workspaceWithRuntime({ rerankerEnabled: true })
    );
    expect(resolved.rerankerEnabled).toBe(true);
  });

  it("ignores a corrupted config rather than dropping to empty values", async () => {
    process.env.AGENT_MAX_TOOL_CALLS = "20";
    const resolved = await resolveRuntimeForWorkspace({
      agentSkillConfig: "{not json",
    });
    expect(resolved.maxToolCalls).toBe(20);
  });

  it("resolves clarifying questions from system settings", async () => {
    SystemSettings.getValueOrFallback = jest
      .fn()
      .mockImplementation(async ({ label }, fallback) => {
        if (label === "agent_clarifying_questions_enabled") return "true";
        if (label === "agent_clarifying_questions_max_per_turn") return "7";
        return fallback;
      });

    const resolved = await resolveRuntimeForWorkspace(null);
    expect(resolved.clarifyingQuestionsEnabled).toBe(true);
    expect(resolved.clarifyingQuestionsMaxPerTurn).toBe(7);

    const overridden = await resolveRuntimeForWorkspace(
      workspaceWithRuntime({ clarifyingQuestionsEnabled: false })
    );
    expect(overridden.clarifyingQuestionsEnabled).toBe(false);
    expect(overridden.clarifyingQuestionsMaxPerTurn).toBe(7);
  });
});
