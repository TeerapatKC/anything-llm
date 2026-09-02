const {
  resolveCallbackHandler,
  PrefixCallbackHandlers,
} = require("../../../utils/telegramBot/utils/navigation/callbacks");

describe("telegram callback routing", () => {
  // Prefixes are matched in order, so a prefix that is also the start of another
  // one silently swallows it. Every button in the bot goes through this table.
  const cases = [
    ["wsq:2", "handleWorkspaceQuickSwitch"],
    ["wsqpg:1", "handleWorkspaceListPagination"],
    ["wspg:0", "handleWorkspacePagination"],
    ["ws:2", "handleWorkspaceSelect"],
    ["ws-create", "handleWorkspaceCreate"],
    ["th:2:0", "handleThreadSelect"],
    ["thpg:2:1", "handleThreadPagination"],
    ["mdl:1:gpt-4", "handleModelSelect"],
    ["mdlpg:1", "handleModelPagination"],
    ["mdl:cancel", "handleModelCancel"],
    ["src:3", "handleSourceSelect"],
    ["srcpg:2", "handleSourcePagination"],
    ["src:back", "handleBackSources"],
    ["back:workspaces", "handleBackWorkspaces"],
    ["tool:approve:abc", "handleToolApproval"],
    ["lang:th", "handleLanguageSelect"],
    ["lang:auto", "handleLanguageSelect"],
    ["fb:12:1", "handleFeedback"],
    ["fb:12:0", "handleFeedback"],
  ];

  it.each(cases)("routes %s to %s", (data, expected) => {
    const handler = resolveCallbackHandler(data);
    expect(handler).toBeTruthy();
    expect(handler.name).toBe(expected);
  });

  it("returns nothing for callback data it does not know", () => {
    expect(resolveCallbackHandler("nonsense")).toBeNull();
    expect(resolveCallbackHandler("")).toBeNull();
  });

  it("lists every prefix before any prefix it starts with", () => {
    // "ws:" placed above "wsq:" would capture both; this keeps the table honest
    // as prefixes are added.
    const prefixes = PrefixCallbackHandlers.map((entry) => entry.prefix);
    prefixes.forEach((prefix, index) => {
      const shadowed = prefixes
        .slice(index + 1)
        .filter((later) => later.startsWith(prefix));
      expect(shadowed).toEqual([]);
    });
  });
});
