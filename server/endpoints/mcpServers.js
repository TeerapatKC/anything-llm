const { reqBody, userFromSession } = require("../utils/http");
const MCPCompatibilityLayer = require("../utils/MCP");
const {
  userPermissionValid,
} = require("../utils/middleware/authorizedRequest");
const { PERMISSIONS } = require("../utils/permissions");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { EventLogs } = require("../models/eventLogs");
const { normalizeRemoteMCPServer } = require("../utils/MCP/remoteServerConfig");

function mcpServersEndpoints(app) {
  if (!app) return;

  app.get(
    "/mcp-servers/force-reload",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MCP_SERVERS])],
    async (_request, response) => {
      try {
        const mcp = new MCPCompatibilityLayer();
        await mcp.reloadMCPServers();
        return response.status(200).json({
          success: true,
          error: null,
          servers: await mcp.servers(),
        });
      } catch (error) {
        console.error("Error force reloading MCP servers:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
          servers: [],
        });
      }
    }
  );

  app.post(
    "/mcp-servers/create",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MCP_SERVERS])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name, server } = normalizeRemoteMCPServer(reqBody(request));
        const result = await new MCPCompatibilityLayer().createRemoteServer(
          name,
          server
        );

        if (!result.success)
          return response.status(409).json({
            success: false,
            error: result.error,
            server: null,
          });

        await EventLogs.logEvent(
          "mcp_server_created",
          { serverName: name, type: server.type, url: server.url },
          user?.id
        );
        return response.status(201).json(result);
      } catch (error) {
        return response.status(400).json({
          success: false,
          error: error.message,
          server: null,
        });
      }
    }
  );

  app.post(
    "/mcp-servers/update",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MCP_SERVERS])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const body = reqBody(request);
        const currentName = String(body.currentName || "").trim();
        const { name, server } = normalizeRemoteMCPServer(body);
        if (!currentName)
          return response.status(400).json({
            success: false,
            error: "Current MCP server name is required.",
            server: null,
          });

        const result = await new MCPCompatibilityLayer().updateRemoteServer(
          currentName,
          name,
          server
        );
        if (!result.success)
          return response.status(409).json({ ...result, server: null });

        await EventLogs.logEvent(
          "mcp_server_updated",
          {
            previousName: currentName,
            serverName: name,
            type: server.type,
            url: server.url,
          },
          user?.id
        );
        return response.status(200).json(result);
      } catch (error) {
        return response.status(400).json({
          success: false,
          error: error.message,
          server: null,
        });
      }
    }
  );

  app.get(
    "/mcp-servers/list",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MCP_SERVERS])],
    async (_request, response) => {
      try {
        const servers = await new MCPCompatibilityLayer().servers();
        return response.status(200).json({
          success: true,
          servers,
        });
      } catch (error) {
        console.error("Error listing MCP servers:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  app.post(
    "/mcp-servers/toggle",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MCP_SERVERS])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name } = reqBody(request);
        const result = await new MCPCompatibilityLayer().toggleServerStatus(
          name
        );

        // An MCP server hands the agent tools that reach outside this instance, so
        // starting or stopping one changes what the agent can do to the outside
        // world. The resulting state is not recorded because the toggle does not
        // report it back - only that the flip succeeded.
        if (result.success)
          await EventLogs.logEvent(
            "mcp_server_toggled",
            { serverName: name },
            user?.id
          );
        return response.status(200).json({
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        console.error("Error toggling MCP server:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  app.post(
    "/mcp-servers/delete",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MCP_SERVERS])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name } = reqBody(request);
        const result = await new MCPCompatibilityLayer().deleteServer(name);

        if (result.success)
          await EventLogs.logEvent(
            "mcp_server_deleted",
            { serverName: name },
            user?.id
          );
        return response.status(200).json({
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        console.error("Error deleting MCP server:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  app.post(
    "/mcp-servers/toggle-tool",
    [validatedRequest, userPermissionValid([PERMISSIONS.AGENTS_MCP_SERVERS])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { serverName, toolName, enabled } = reqBody(request);
        const result = await new MCPCompatibilityLayer().toggleToolSuppression(
          serverName,
          toolName,
          enabled
        );

        if (result.success)
          await EventLogs.logEvent(
            "mcp_tool_toggled",
            { serverName, toolName, enabled: !!enabled },
            user?.id
          );
        return response.status(200).json({
          success: result.success,
          error: result.error,
          suppressedTools: result.suppressedTools,
        });
      } catch (error) {
        console.error("Error toggling MCP tool:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
          suppressedTools: [],
        });
      }
    }
  );
}

module.exports = { mcpServersEndpoints };
