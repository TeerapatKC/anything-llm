process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

const { PrivateWorkspaceProfile } = require("../../models/privateWorkspaceProfile");
const { ModelRouterRule } = require("../../models/modelRouterRule");

describe("model router selection", () => {
  it("preserves a private workspace router and clears a direct chat model", () => {
    const profile = PrivateWorkspaceProfile.normalize({
      workspace: {
        chatProvider: "nexusai-router",
        router_id: "7",
        chatModel: "old-model",
      },
    });
    expect(profile.workspace.chatProvider).toBe("nexusai-router");
    expect(profile.workspace.router_id).toBe(7);
    expect(profile.workspace.chatModel).toBeNull();
  });

  it("rejects a router selection without a router ID", () => {
    const profile = PrivateWorkspaceProfile.normalize({
      workspace: { chatProvider: "nexusai-router" },
    });
    expect(profile.workspace.chatProvider).toBeNull();
  });

  it("accepts OR rules exposed by the condition builder", () => {
    const result = ModelRouterRule._validateConditions("OR", [
      { property: "promptContent", comparator: "contains", value: "code" },
    ]);
    expect(result.error).toBeUndefined();
    expect(result.condition_logic).toBe("OR");
  });
});
