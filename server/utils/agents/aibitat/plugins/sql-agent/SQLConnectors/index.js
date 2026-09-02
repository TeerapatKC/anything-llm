const { SystemSettings } = require("../../../../../../models/systemSettings");
const { safeJsonParse } = require("../../../../../http");

/**
 * @typedef {('postgresql'|'mysql'|'sql-server')} SQLEngine
 */

/**
 * @typedef {Object} QueryResult
 * @property {[number]} rows - The query result rows
 * @property {number} count - Number of rows the query returned/changed
 * @property {string|null} error - Error string if there was an issue
 */

/**
 * A valid database SQL connection object
 * @typedef {Object} SQLConnection
 * @property {string} database_id - Unique identifier of the database connection
 * @property {SQLEngine} engine - Engine used by connection
 * @property {string} connectionString - RFC connection string for db
 */

/**
 * @param {SQLEngine} identifier
 * @param {object} connectionConfig
 * @returns Database Connection Engine Class for SQLAgent or throws error
 */
function getDBClient(identifier = "", connectionConfig = {}) {
  switch (identifier) {
    case "mysql":
      const { MySQLConnector } = require("./MySQL");
      return new MySQLConnector(connectionConfig);
    case "postgresql":
      const { PostgresSQLConnector } = require("./Postgresql");
      return new PostgresSQLConnector(connectionConfig);
    case "sql-server":
      const { MSSQLConnector } = require("./MSSQL");
      return new MSSQLConnector(connectionConfig);
    default:
      throw new Error(
        `There is no supported database connector for ${identifier}`
      );
  }
}

/**
 * Lists all of the known database connection that can be used by the agent.
 * @returns {Promise<[SQLConnection]>}
 */
async function listSQLConnections() {
  return safeJsonParse(
    (await SystemSettings.get({ label: "agent_sql_connections" }))?.value,
    []
  );
}

/**
 * Every connection visible to a given workspace. Mirrors how agent flows and MCP
 * servers are scoped: a workspace whose `activeSqlConnections` was never set (or
 * was explicitly cleared back to "inherit") sees every configured connection,
 * which keeps every pre-existing workspace behaving exactly as it did before
 * per-connection visibility existed. Only a workspace an admin has actually
 * restricted gets a narrower list.
 *
 * A connection switched off entirely is excluded here regardless of workspace
 * settings - the same as an inactive agent flow, being off instance-wide beats
 * any one workspace's allow-list.
 * @param {import("@prisma/client").workspaces | null} workspace
 * @returns {Promise<[SQLConnection]>}
 */
async function listSQLConnectionsForWorkspace(workspace = null) {
  const all = (await listSQLConnections()).filter(
    (conn) => conn.active !== false
  );
  if (!workspace) return all;

  // Required lazily - workspaceSkills pulls in a fair amount of the agent
  // config machinery that this module otherwise has no reason to load.
  const {
    resolveConfigForWorkspace,
  } = require("../../../../workspaceSkills");
  const config = await resolveConfigForWorkspace(workspace);
  if (!Array.isArray(config.activeSqlConnections)) return all;
  return all.filter((conn) =>
    config.activeSqlConnections.includes(conn.database_id)
  );
}

/**
 * One connection by id, scoped to what the given workspace may see. Returns
 * `undefined` both when the id doesn't exist at all and when it exists but this
 * workspace has been restricted from it - the caller can't tell the difference,
 * which is the point: an agent has no more visibility into a hidden connection's
 * existence than into one that was never configured.
 * @param {import("@prisma/client").workspaces | null} workspace
 * @param {string} database_id
 * @returns {Promise<SQLConnection|undefined>}
 */
async function getSQLConnectionForWorkspace(workspace, database_id) {
  const connections = await listSQLConnectionsForWorkspace(workspace);
  return connections.find((conn) => conn.database_id === database_id);
}

/**
 * Validates a SQL connection by attempting to connect and run a simple query
 * @param {SQLEngine} identifier - The SQL engine type
 * @param {object} connectionConfig - The connection configuration
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function validateConnection(identifier = "", connectionConfig = {}) {
  try {
    const client = getDBClient(identifier, connectionConfig);
    return await client.validateConnection();
  } catch {
    console.log(`Failed to connect to ${identifier} database.`);
    return {
      success: false,
      error: `Unable to connect to ${identifier}. Please verify your connection details.`,
    };
  }
}

module.exports = {
  getDBClient,
  listSQLConnections,
  listSQLConnectionsForWorkspace,
  getSQLConnectionForWorkspace,
  validateConnection,
};
