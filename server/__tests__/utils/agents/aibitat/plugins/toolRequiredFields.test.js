const AgentPlugins = require("../../../../../utils/agents/aibitat/plugins");

/**
 * Collect every tool definition a plugin registers.
 *
 * Definitions live inside `setup(aibitat)`, so the only way to see one is to run the
 * setup against something that records what it is handed - which is all this does.
 * @param {object} plugin - an entry from AgentPlugins, or one of its children
 * @returns {object[]} the definitions passed to `aibitat.function`
 */
function definitionsFor(plugin) {
  const definitions = [];
  const recorder = {
    function: (definition) => definitions.push(definition),
    // A few plugins reach for these while wiring themselves up.
    introspect: () => {},
    handlerProps: { log: () => {} },
  };

  const builders = Array.isArray(plugin.plugin) ? plugin.plugin : [plugin];
  for (const builder of builders) {
    if (typeof builder.plugin !== "function") continue;
    try {
      builder.plugin().setup(recorder);
    } catch {
      // A plugin that cannot be built without a live agent has nothing to check here.
    }
  }
  return definitions;
}

// A tool can be reached through more than one export (the sql-agent parent and its
// children, for instance), so keep one definition per tool name.
const allDefinitions = [
  ...new Map(
    Object.values(AgentPlugins)
      .flatMap((plugin) =>
        typeof plugin === "object" && plugin !== null
          ? definitionsFor(plugin)
          : []
      )
      .map((definition) => [definition.name, definition])
  ).values(),
];

describe("agent tool schemas", () => {
  it("finds tool definitions to check", () => {
    expect(allDefinitions.length).toBeGreaterThan(0);
  });

  it.each(allDefinitions.filter((definition) => !!definition.required))(
    "$name only requires arguments it declares",
    (definition) => {
      const declared = Object.keys(definition.parameters?.properties ?? {});
      // Anthropic and Bedrock copy this list straight into the tool schema they send,
      // so a name here that the tool does not declare tells the model to supply an
      // argument that does not exist - and leaves the real one optional.
      for (const field of definition.required) {
        expect(declared).toContain(field);
      }
    }
  );

  it("requires the query itself on the sql-query tool", () => {
    const sqlQuery = allDefinitions.find((d) => d.name === "sql-query");
    expect(sqlQuery.required).toEqual(["database_id", "sql_query"]);
  });
});
