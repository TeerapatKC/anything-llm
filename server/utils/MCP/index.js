const MCPHypervisor = require("./hypervisor");

class MCPCompatibilityLayer extends MCPHypervisor {
  static _instance;

  constructor() {
    super();
    if (MCPCompatibilityLayer._instance) return MCPCompatibilityLayer._instance;
    MCPCompatibilityLayer._instance = this;
  }

  /**
   * Get all of the active MCP servers as plugins we can load into agents.
   * This will also boot all MCP servers if they have not been started yet.
   * @returns {Promise<string[]>} Array of flow names in @@mcp_{name} format
   */
  async activeMCPServers() {
    await this.bootMCPServers();
    return Object.keys(this.mcps).flatMap((name) => `@@mcp_${name}`);
  }

  /**
   * Convert an MCP server name to an NexusAI Agent plugin
   * @param {string} name - The base name of the MCP server to convert - not the tool name. eg: `docker-mcp` not `docker-mcp:list-containers`
   * @param {Object} aibitat - The aibitat object to pass to the plugin
   * @returns {Promise<{name: string, description: string, plugin: Function}[]|null>} Array of plugin configurations or null if not found
   */
  async convertServerToolsToPlugins(name, _aibitat = null) {
    const mcp = this.mcps[name];
    if (!mcp) return null;

    let tools;
    try {
      const response = await mcp.listTools();
      tools = response.tools;
    } catch (error) {
      this.log(`Failed to list tools for MCP server ${name}:`, error);
      return null;
    }
    if (!tools || !tools.length) return null;

    const suppressedTools = this.getSuppressedTools(name);
    const totalTools = tools.length;
    tools = tools.filter((tool) => !suppressedTools.includes(tool.name));
    const suppressedCount = totalTools - tools.length;

    if (suppressedCount > 0) {
      this.log(
        `MCP server ${name}: ${suppressedCount} tool(s) suppressed, ${tools.length} tool(s) enabled`
      );
    }

    if (!tools.length) {
      this.log(`MCP server ${name}: All tools are suppressed, skipping`);
      return null;
    }

    const plugins = [];
    for (const tool of tools) {
      plugins.push({
        name: `${name}-${tool.name}`,
        description: tool.description,
        plugin: function () {
          return {
            name: `${name}-${tool.name}`,
            setup: (aibitat) => {
              aibitat.function({
                super: aibitat,
                name: `${name}-${tool.name}`,
                controller: new AbortController(),
                description: tool.description,
                isMCPTool: true,
                examples: [],
                parameters: {
                  $schema: "http://json-schema.org/draft-07/schema#",
                  ...tool.inputSchema,
                },
                handler: async function (args = {}) {
                  try {
                    const mcpLayer = new MCPCompatibilityLayer();
                    const currentMcp = mcpLayer.mcps[name];
                    if (!currentMcp)
                      throw new Error(
                        `MCP server ${name} is not currently running`
                      );

                    aibitat.handlerProps.log(
                      `Executing MCP server: ${name}:${tool.name} with args:`,
                      args
                    );
                    aibitat.introspect(
                      `Executing MCP server: ${name} with ${JSON.stringify(args, null, 2)}`
                    );
                    const result = await currentMcp.callTool({
                      name: tool.name,
                      arguments: args,
                    });
                    aibitat.handlerProps.log(
                      `MCP server: ${name}:${tool.name} completed successfully`,
                      result
                    );
                    aibitat.introspect(
                      `MCP server: ${name}:${tool.name} completed successfully`
                    );

                    aibitat.addCitation?.({
                      id: `mcp-${name}-${tool.name}-${Date.now()}`,
                      title: `${name}: ${tool.name}`,
                      text: `MCP tool "${tool.name}" on server "${name}"`,
                      chunkSource: `mcp://${name}/${tool.name}`,
                    });

                    return MCPCompatibilityLayer.returnMCPResult(result);
                  } catch (error) {
                    aibitat.handlerProps.log(
                      `MCP server: ${name}:${tool.name} failed with error:`,
                      error
                    );
                    aibitat.introspect(
                      `MCP server: ${name}:${tool.name} failed with error:`,
                      error
                    );
                    return `The tool ${name}:${tool.name} failed with error: ${error?.message || "An unknown error occurred"}`;
                  }
                },
              });
            },
          };
        },
        toolName: `${name}:${tool.name}`,
      });
    }

    return plugins;
  }

  /**
   * Returns the MCP servers that were loaded or attempted to be loaded
   * so that we can display them in the frontend for review or error logging.
   * @returns {Promise<{
   *   name: string,
   *   running: boolean,
   *   tools: {name: string, description: string, inputSchema: Object}[],
   *   process: {pid: number, cmd: string}|null,
   *   error: string|null
   * }[]>} - The active MCP servers
   */
  async servers() {
    await this.bootMCPServers();
    const servers = [];
    for (const [name, result] of Object.entries(this.mcpLoadingResults)) {
      const config = this.mcpServerConfigs.find((s) => s.name === name);

      if (result.status === "failed") {
        servers.push({
          name,
          config: config?.server || null,
          running: false,
          tools: [],
          error: result.message,
          process: null,
        });
        continue;
      }

      const mcp = this.mcps[name];
      if (!mcp) {
        delete this.mcpLoadingResults[name];
        delete this.mcps[name];
        continue;
      }

      // ping() and listTools() can throw - e.g. when a tool's outputSchema
      // contains a $ref the MCP SDK cannot resolve. If we let that bubble up
      // it crashes the entire list, so a single bad server would hide every
      // other server. Keep the server visible with its error instead.
      try {
        const online = !!(await mcp.ping());
        const tools = (online ? (await mcp.listTools()).tools : []).filter(
          (tool) => !tool.name.startsWith("handle_mcp_connection_mcp_")
        );
        servers.push({
          name,
          config: config?.server || null,
          running: online,
          tools,
          error: null,
          process: {
            pid: mcp.transport?.process?.pid || null,
          },
        });
      } catch (error) {
        this.log(`Failed to list tools for MCP server ${name}:`, error);
        servers.push({
          name,
          config: config?.server || null,
          running: false,
          tools: [],
          error: error?.message || "Failed to load tools for this MCP server.",
          process: null,
        });
      }
    }
    return servers;
  }

  /**
   * Toggle the MCP server (start or stop)
   * @param {string} name - The name of the MCP server to toggle
   * @returns {Promise<{success: boolean, error: string | null}>}
   */
  async toggleServerStatus(name) {
    const server = this.mcpServerConfigs.find((s) => s.name === name);
    if (!server)
      return {
        success: false,
        error: `MCP server ${name} not found in config file.`,
      };
    const mcp = this.mcps[name];
    const online = !!mcp ? !!(await mcp.ping()) : false; // If the server is not in the mcps object, it is not running

    if (online) {
      const killed = this.pruneMCPServer(name);
      return {
        success: killed,
        error: killed ? null : `Failed to kill MCP server: ${name}`,
      };
    } else {
      const startupResult = await this.startMCPServer(name);
      return { success: startupResult.success, error: startupResult.error };
    }
  }

  /**
   * Persist and immediately connect a new remote MCP server.
   * A failed connection leaves the definition in place so its error is visible
   * in the management UI and the operator can retry after fixing the service.
   * @param {string} name
   * @param {object} server
   * @returns {Promise<{success: boolean, error: string|null, server?: object}>}
   */
  async createRemoteServer(name, server) {
    const saved = this.addMCPServerToConfig(name, server);
    if (!saved.success) return saved;

    const startup = await this.startMCPServer(name);
    if (!startup.success) {
      return {
        success: true,
        error: this.mcpLoadingResults[name]?.message || startup.error,
        server: {
          name,
          config: server,
          running: false,
          tools: [],
          error: this.mcpLoadingResults[name]?.message || startup.error,
          process: null,
        },
      };
    }

    const created = (await this.servers()).find((item) => item.name === name);
    return { success: true, error: null, server: created };
  }

  /**
   * Update and reconnect a remote MCP server. If the replacement cannot
   * connect, restore the previous persistent definition and runtime state.
   * @param {string} currentName
   * @param {string} name
   * @param {object} server
   * @returns {Promise<{success: boolean, error: string|null, server?: object}>}
   */
  async updateRemoteServer(currentName, name, server) {
    const current = this.mcpServerConfigs.find(
      (item) => item.name === currentName
    );
    if (!current)
      return {
        success: false,
        error: `MCP server ${currentName} not found in config file.`,
      };
    if (!current.server?.url)
      return {
        success: false,
        error: "Only external HTTP MCP servers can be edited here.",
      };

    const previousServer = JSON.parse(JSON.stringify(current.server));
    const previousResult = this.mcpLoadingResults[currentName];
    const wasRunning = !!this.mcps[currentName];
    const replacement = {
      ...server,
      ...(current.server.nexusai ? { nexusai: current.server.nexusai } : {}),
    };

    this.pruneMCPServer(currentName);
    const saved = this.updateMCPServerInConfig(currentName, name, replacement);
    if (!saved.success) {
      if (wasRunning) await this.startMCPServer(currentName);
      return saved;
    }

    delete this.mcpLoadingResults[currentName];
    const startup = await this.startMCPServer(name);
    if (!startup.success) {
      this.updateMCPServerInConfig(name, currentName, previousServer);
      delete this.mcps[name];
      delete this.mcpLoadingResults[name];
      if (wasRunning) await this.startMCPServer(currentName);
      else if (previousResult)
        this.mcpLoadingResults[currentName] = previousResult;
      return {
        success: false,
        error: `Updated server could not connect: ${startup.error}`,
      };
    }

    const updated = (await this.servers()).find((item) => item.name === name);
    return { success: true, error: null, server: updated };
  }

  /**
   * Delete the MCP server - will also remove it from the config file
   * @param {string} name - The name of the MCP server to delete
   * @returns {Promise<{success: boolean, error: string | null}>}
   */
  async deleteServer(name) {
    const server = this.mcpServerConfigs.find((s) => s.name === name);
    if (!server)
      return {
        success: false,
        error: `MCP server ${name} not found in config file.`,
      };

    const mcp = this.mcps[name];
    const online = !!mcp ? !!(await mcp.ping()) : false; // If the server is not in the mcps object, it is not running
    if (online) this.pruneMCPServer(name);
    this.removeMCPServerFromConfig(name);

    delete this.mcps[name];
    delete this.mcpLoadingResults[name];
    this.log(`MCP server was killed and removed from config file: ${name}`);
    return { success: true, error: null };
  }

  /**
   * Return the result of an MCP server call as a string
   * This will handle circular references and bigints since an MCP server can return any type of data.
   * @param {Object} result - The result to return
   * @returns {string} The result as a string
   */
  static returnMCPResult(result) {
    if (typeof result !== "object" || result === null) return String(result);

    const seen = new WeakSet();
    try {
      return JSON.stringify(result, (key, value) => {
        if (typeof value === "bigint") return value.toString();
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        return value;
      });
    } catch (e) {
      return `[Unserializable: ${e.message}]`;
    }
  }

  /**
   * Toggle tool suppression for an MCP server
   * @param {string} serverName - The name of the MCP server
   * @param {string} toolName - The name of the tool to toggle
   * @param {boolean} enabled - Whether the tool should be enabled (true) or suppressed (false)
   * @returns {Promise<{success: boolean, error: string | null, suppressedTools: string[]}>}
   */
  async toggleToolSuppression(serverName, toolName, enabled) {
    return this.updateSuppressedTools(serverName, toolName, enabled);
  }
}
module.exports = MCPCompatibilityLayer;
