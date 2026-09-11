/**
 * Everything a screen needs to render an agent skill selection: the effective config,
 * the catalog of skills, flows, SQL connections and MCP servers it may choose from, and
 * what each "inherit" option currently resolves to.
 *
 * Two screens ask for this, and they have to agree completely or the same toggles would
 * mean different things in each: a workspace's own agent configuration, and the
 * instance's private workspace profile - which is the agent configuration for every
 * private workspace at once, since none of them has a settings screen of its own.
 *
 * @param {{id: number|null, type?: string, agentSkillConfig?: string|null}} workspace
 *  A real workspace row, or a stand-in whose `id` is null for the private workspace
 *  profile. A null id means "owns nothing", so the catalog comes back with only the
 *  instance-wide flows and connections - which is exactly right for a profile, since
 *  entities owned by one workspace are not available to any other.
 * @returns {Promise<object>}
 */
async function agentSkillsPayload(workspace) {
  const {
    resolveConfigForWorkspace,
    instanceRuntimeConfig,
  } = require("./workspaceSkills");
  const {
    skillCredentialStatus,
    configuredSearchProviders,
  } = require("./skillCredentials");
  const { AgentFlows } = require("../agentFlows");
  const MCPCompatibilityLayer = require("../MCP");
  const { SystemSettings } = require("../../models/systemSettings");
  const {
    sqlConnectionsAvailableTo,
    toPublic: sqlConnectionToPublic,
  } = require("./aibitat/plugins/sql-agent/SQLConnectors");
  const {
    mcpServersAvailableTo,
    toPublic: toPublicMCPServer,
  } = require("../MCP/scope");

  const config = await resolveConfigForWorkspace(workspace);
  // Booted servers decide what the `running` badge says; the catalog itself comes
  // from the config, so a workspace's own server is still listed - and still
  // editable - on a day the service behind it is down.
  const bootedServers = new Set(
    (await new MCPCompatibilityLayer().activeMCPServers()).map((id) =>
      id.replace(/^@@mcp_/, "")
    )
  );
  const [instanceRuntime, skillCredentials] = await Promise.all([
    instanceRuntimeConfig(),
    skillCredentialStatus(workspace.id),
  ]);

  return {
    // `configured` tells the UI whether this is still inheriting the instance-wide
    // defaults or has its own saved copy.
    configured: !!workspace.agentSkillConfig,
    config,
    // The engine this instance is configured for, so the UI can label the "inherit"
    // option. Engine API keys stay instance-wide.
    instanceSearchProvider:
      (await SystemSettings.getValueOrFallback(
        { label: "agent_search_provider" },
        null
      )) ?? null,
    // Resolved instance-wide value of every runtime knob, so the UI can show what
    // "inherit" currently means for each one.
    instanceRuntime,
    // Per-skill credential readiness. Skills whose credential an admin has not supplied
    // are hidden here rather than offered as a toggle that would produce a tool failing
    // at call time.
    skillCredentials,
    // Search engines this instance holds a usable key for (or that need none) - the
    // only engines that may be picked between.
    availableSearchProviders: configuredSearchProviders(),
    catalog: {
      // Global flows plus the ones this workspace owns - never another workspace's,
      // which would otherwise be offered as a toggle here.
      flows: AgentFlows.listFlowsForWorkspace(workspace.id)
        .filter((flow) => flow.active)
        .map((flow) => ({
          id: flow.uuid,
          name: flow.name || flow.uuid,
          scope: flow.scope,
        })),
      // Global connections plus the ones this workspace owns. Deliberately shaped by
      // `toPublic`, which withholds the connection string (and the credentials inside
      // it) for anything the workspace does not own.
      sqlConnections: (await sqlConnectionsAvailableTo(workspace.id)).map(
        (conn) => {
          const summary = sqlConnectionToPublic(conn, workspace.id);
          return {
            id: summary.database_id,
            name: summary.database_id,
            engine: summary.engine,
            scope: summary.scope,
            active: summary.active,
          };
        }
      ),
      // Instance-wide servers plus the ones this workspace owns - never another
      // workspace's, which would otherwise be offered as a toggle here. Shaped by
      // `toPublic`, which withholds the HTTP headers (and the tokens inside them)
      // for anything the workspace does not own.
      mcpServers: mcpServersAvailableTo(workspace.id).map((entry) => {
        const summary = toPublicMCPServer(entry, workspace.id);
        return {
          id: summary.name,
          name: summary.name,
          scope: summary.scope,
          type: summary.type,
          ...(summary.url ? { url: summary.url } : {}),
          ...(summary.headers ? { headers: summary.headers } : {}),
          running: bootedServers.has(summary.name),
        };
      }),
    },
  };
}

module.exports = { agentSkillsPayload };
