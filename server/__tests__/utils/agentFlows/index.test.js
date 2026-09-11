process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

const { AgentFlows } = require("../../../utils/agentFlows");
const { FlowExecutor } = require("../../../utils/agentFlows/executor");
const { Telemetry } = require("../../../models/telemetry");

function registerFlowWithVariables(variables) {
  jest.spyOn(AgentFlows, "loadFlow").mockReturnValue({
    name: "Test Flow",
    uuid: "test-uuid",
    config: {
      name: "Test Flow",
      description: "A test flow",
      steps: [{ type: "start", config: { variables } }],
    },
  });

  const plugin = AgentFlows.loadFlowPlugin("test-uuid");
  let registered = null;
  plugin.plugin().setup({
    function: (config) => (registered = config),
    introspect: jest.fn(),
  });
  return registered;
}

function mockExecuteFlow() {
  return jest.spyOn(AgentFlows, "executeFlow").mockResolvedValue({
    success: true,
    results: [],
    variables: {},
    directOutput: null,
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("AgentFlows.loadFlowPlugin variable categories", () => {
  it("keeps legacy variables optional", () => {
    const fn = registerFlowWithVariables([
      { name: "city", value: "Bangkok" },
      { name: "", value: "ignored" },
    ]);

    expect(Object.keys(fn.parameters.properties)).toEqual(["city"]);
    expect(fn.parameters.required).toEqual([]);
  });

  it("exposes required and optional variables but hides static values", () => {
    const fn = registerFlowWithVariables([
      { name: "query", type: "required", description: "Search query" },
      { name: "limit", value: "10", type: "optional" },
      { name: "apiKey", value: "secret", type: "static" },
    ]);

    expect(Object.keys(fn.parameters.properties)).toEqual(["query", "limit"]);
    expect(fn.parameters.required).toEqual(["query"]);
    expect(fn.parameters.properties.apiKey).toBeUndefined();
  });

  it("filters unknown and static arguments before execution", async () => {
    const fn = registerFlowWithVariables([
      { name: "query", type: "required" },
      { name: "apiKey", value: "secret", type: "static" },
    ]);
    const executeSpy = mockExecuteFlow();

    await fn.handler({ query: "weather", apiKey: "override", unknown: true });
    expect(executeSpy).toHaveBeenCalledWith(
      "test-uuid",
      { query: "weather" },
      expect.anything()
    );
  });

  it("rejects only undefined and empty-string required values", async () => {
    const fn = registerFlowWithVariables([{ name: "count", type: "required" }]);
    const executeSpy = mockExecuteFlow();

    expect(await fn.handler({})).toContain("missing required parameter");
    expect(await fn.handler({ count: "" })).toContain(
      "missing required parameter"
    );
    await fn.handler({ count: 0 });
    expect(executeSpy).toHaveBeenCalledWith(
      "test-uuid",
      { count: 0 },
      expect.anything()
    );
  });
});

describe("FlowExecutor variable initialization", () => {
  it("keeps static defaults while allowing supplied values to override", async () => {
    jest.spyOn(Telemetry, "sendTelemetry").mockResolvedValue();
    const flow = {
      config: {
        steps: [
          {
            type: "start",
            config: {
              variables: [
                { name: "city", value: "Bangkok", type: "optional" },
                { name: "apiKey", value: "secret", type: "static" },
              ],
            },
          },
        ],
      },
    };

    const result = await new FlowExecutor().executeFlow(flow, {
      city: "Chiang Mai",
    });
    expect(result.success).toBe(true);
    expect(result.variables.city).toBe("Chiang Mai");
    expect(result.variables.apiKey).toBe("secret");
  });
});
