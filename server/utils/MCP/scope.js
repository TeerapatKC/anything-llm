/**
 * Ownership and visibility rules for MCP servers.
 *
 * Deliberately a mirror of the SQL connector's scoping module
 * (`utils/agents/aibitat/plugins/sql-agent/SQLConnectors`): an MCP server is either
 * instance-wide - added by an administrator and shareable with any workspace - or
 * owned by one workspace and visible nowhere else. The two features answer the same
 * three questions (who owns this, who may reference it, who may see its secrets), so
 * they answer them the same way rather than growing two vocabularies for one idea.
 *
 * Where SQL connections live in a `system_settings` row, MCP servers live in the
 * hypervisor's JSON config file, so the owner is stored alongside the other
 * NexusAI-specific fields at `server.nexusai.workspaceId`. Absent means instance-wide,
 * which is what every server predating this module is.
 */

/**
 * The hypervisor's view of the config file, without booting anything.
 *
 * Deliberately the compatibility layer rather than `MCPHypervisor` directly. Both are
 * singletons and the layer extends the hypervisor, so whichever is constructed first
 * becomes *the* instance for both - and a bare hypervisor built here first would leave
 * every later `new MCPCompatibilityLayer()` returning an object without any of the
 * layer's own methods.
 */
function serverConfigs() {
  const MCPCompatibilityLayer = require("./index");
  return new MCPCompatibilityLayer().mcpServerConfigs;
}

/**
 * Coerce a stored owner into a workspace id or null, so a malformed value can never
 * make a server look like it belongs to a workspace that does not exist.
 * @param {any} workspaceId
 * @returns {number|null}
 */
function normalizeWorkspaceId(workspaceId) {
  const id = Number(workspaceId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * The workspace that owns a server, or null when it is instance-wide.
 * @param {{server?: object}|object} entry - a `{name, server}` config entry or a raw definition
 * @returns {number|null}
 */
function serverOwner(entry) {
  const definition = entry?.server ?? entry;
  return normalizeWorkspaceId(definition?.nexusai?.workspaceId);
}

/**
 * Stamp an owner onto a server definition, or clear it for an instance-wide server.
 * Everything else already in the `nexusai` block - suppressed tools, most notably -
 * is carried through untouched.
 * @param {object} server - a validated MCP server definition
 * @param {number|null} workspaceId
 * @returns {object} a new definition; the input is not mutated
 */
function withOwner(server = {}, workspaceId = null) {
  const owner = normalizeWorkspaceId(workspaceId);
  const nexusai = { ...(server.nexusai ?? {}) };
  if (owner === null) delete nexusai.workspaceId;
  else nexusai.workspaceId = owner;

  const definition = { ...server };
  if (Object.keys(nexusai).length) definition.nexusai = nexusai;
  else delete definition.nexusai;
  return definition;
}

/**
 * Server summary safe to hand to a workspace screen.
 *
 * `headers` carry bearer tokens and API keys in plain text, so they are only included
 * for a server the workspace owns - the one whose credentials somebody there typed in.
 * A global server an admin shared in is usable by the agent, but its secret never
 * reaches a workspace manager.
 * @param {{name: string, server: object}} entry
 * @param {number|null} workspaceId - the workspace asking
 * @returns {object}
 */
function toPublic(entry, workspaceId = null) {
  const definition = entry?.server ?? {};
  const owner = serverOwner(entry);
  const owned = owner !== null && owner === normalizeWorkspaceId(workspaceId);
  return {
    name: entry?.name,
    type: definition.url ? definition.type ?? "streamable" : "stdio",
    ...(definition.url ? { url: definition.url } : {}),
    workspaceId: owner,
    scope: owner === null ? "global" : "workspace",
    ...(owned && definition.headers ? { headers: definition.headers } : {}),
  };
}

/**
 * Servers with no owner - the instance-wide pool an admin manages.
 * @returns {{name: string, server: object}[]}
 */
function globalMCPServers() {
  return serverConfigs().filter((entry) => serverOwner(entry) === null);
}

/**
 * Servers created inside one workspace. Visible nowhere else.
 * @param {number|null} workspaceId
 * @returns {{name: string, server: object}[]}
 */
function mcpServersOwnedByWorkspace(workspaceId = null) {
  const id = normalizeWorkspaceId(workspaceId);
  if (id === null) return [];
  return serverConfigs().filter((entry) => serverOwner(entry) === id);
}

/**
 * Every server a workspace is allowed to reference: the global pool plus its own.
 * This is ownership only - whether a given global server is switched on for this
 * workspace is a separate question answered by `mcpServerNamesForWorkspace`.
 * @param {number|null} workspaceId
 * @returns {{name: string, server: object}[]}
 */
function mcpServersAvailableTo(workspaceId = null) {
  const id = normalizeWorkspaceId(workspaceId);
  return serverConfigs().filter((entry) => {
    const owner = serverOwner(entry);
    return owner === null || owner === id;
  });
}

/**
 * The names of every MCP server a workspace's agent may load, applying ownership
 * first and the workspace's own allow-list second.
 *
 * Mirrors `listSQLConnectionsForWorkspace`: a workspace whose `activeMcpServers` was
 * never set sees every server it owns plus every instance-wide one, which is what
 * every workspace did before servers could be owned. Ownership is applied regardless
 * of that list, so a stale name or a crafted config can never hand an agent another
 * workspace's server - and with it that server's credentials.
 * @param {import("@prisma/client").workspaces | null} workspace
 * @param {object|null} config - already-resolved agent skill config, when the caller has one
 * @returns {Promise<string[]>}
 */
async function mcpServerNamesForWorkspace(workspace = null, config = null) {
  const available = mcpServersAvailableTo(workspace?.id ?? null).map(
    (entry) => entry.name
  );

  // Required lazily - workspaceSkills pulls in a fair amount of the agent config
  // machinery that this module otherwise has no reason to load.
  const resolved =
    config ??
    (await require("../agents/workspaceSkills").resolveConfigForWorkspace(
      workspace
    ));
  if (!Array.isArray(resolved?.activeMcpServers)) return available;

  return available.filter(
    (name) =>
      // A workspace's own server is always available to it; the allow-list only
      // governs which of the shared, instance-wide ones it opted into.
      serverOwner(serverConfigs().find((entry) => entry.name === name)) !==
        null || resolved.activeMcpServers.includes(name)
  );
}

module.exports = {
  normalizeWorkspaceId,
  serverOwner,
  withOwner,
  toPublic,
  globalMCPServers,
  mcpServersOwnedByWorkspace,
  mcpServersAvailableTo,
  mcpServerNamesForWorkspace,
};
