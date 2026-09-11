const path = require("path");
const fs = require("fs");
const os = require("os");
const http = require("http");
const {
  Server: MCPTestServer,
} = require("@modelcontextprotocol/sdk/server/index.js");
const {
  SSEServerTransport,
} = require("@modelcontextprotocol/sdk/server/sse.js");
const {
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

// pkce-challenge (used by the MCP SDK's OAuth support, which these tests
// never exercise) is ESM-only under the hood and cannot be loaded by jest
// without --experimental-vm-modules.
jest.mock("pkce-challenge", () => ({
  default: async () => ({ code_verifier: "", code_challenge: "" }),
}));

const MCPCompatibilityLayer = require("../../../utils/MCP");
const MCPHypervisor = require("../../../utils/MCP/hypervisor");

const GOOD_TOOL = {
  name: "echo",
  description: "Echoes input back",
  inputSchema: { type: "object", properties: { text: { type: "string" } } },
};

// A tool whose outputSchema contains a $ref Ajv cannot resolve. The MCP
// SDK eagerly compiles outputSchema validators inside client.listTools(),
// so listing this tool throws - the exact failure from issue #5917 that
// used to hide the entire server list.
const BAD_REF_TOOL = {
  name: "bad-ref",
  description: "Advertises an unresolvable outputSchema $ref",
  inputSchema: { type: "object", properties: {} },
  outputSchema: {
    type: "object",
    $ref: "#/definitions/does-not-exist",
  },
};

/**
 * Minimal in-process SSE MCP server advertising the given tools. GET opens
 * the event stream, POST /messages carries the JSON-RPC messages.
 */
function startSSETestServer(tools) {
  const transports = {};
  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET") {
      const transport = new SSEServerTransport("/messages", res);
      transports[transport.sessionId] = transport;
      const mcpServer = new MCPTestServer(
        { name: "test-sse-server", version: "1.0.0" },
        { capabilities: { tools: {} } }
      );
      mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools,
      }));
      await mcpServer.connect(transport);
      return;
    }

    if (req.method === "POST" && url.pathname === "/messages") {
      const transport = transports[url.searchParams.get("sessionId")];
      if (!transport) {
        res.writeHead(400).end();
        return;
      }
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () =>
        transport.handlePostMessage(req, res, JSON.parse(body))
      );
      return;
    }

    res.writeHead(404).end();
  });

  return new Promise((resolve) =>
    httpServer.listen(0, () => resolve(httpServer))
  );
}

function stopSSETestServer(httpServer) {
  if (typeof httpServer.closeAllConnections === "function")
    httpServer.closeAllConnections();
  httpServer.close();
}

describe("MCPCompatibilityLayer.servers", () => {
  let storageDir;
  let mcpLayer;

  beforeEach(() => {
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-compat-"));
    process.env.STORAGE_DIR = storageDir;
    MCPCompatibilityLayer._instance = undefined;
    MCPHypervisor._instance = undefined;
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (mcpLayer) mcpLayer.pruneMCPServers();
    MCPCompatibilityLayer._instance = undefined;
    MCPHypervisor._instance = undefined;
    mcpLayer = undefined;
    delete process.env.STORAGE_DIR;
    fs.rmSync(storageDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  function writeMCPConfig(servers) {
    fs.mkdirSync(path.join(storageDir, "plugins"), { recursive: true });
    fs.writeFileSync(
      path.join(storageDir, "plugins", "nexusai_mcp_servers.json"),
      JSON.stringify({ mcpServers: servers }, null, 2)
    );
  }

  it("keeps a server visible with its error when listTools throws on an unresolvable outputSchema $ref (issue #5917)", async () => {
    const goodServer = await startSSETestServer([GOOD_TOOL]);
    const badServer = await startSSETestServer([BAD_REF_TOOL]);

    try {
      writeMCPConfig({
        "good-server": {
          url: `http://localhost:${goodServer.address().port}`,
        },
        "bad-ref-server": {
          url: `http://localhost:${badServer.address().port}`,
        },
      });
      mcpLayer = new MCPCompatibilityLayer();
      const servers = await mcpLayer.servers();

      expect(servers).toHaveLength(2);

      const good = servers.find((s) => s.name === "good-server");
      expect(good.running).toBe(true);
      expect(good.tools.map((t) => t.name)).toEqual(["echo"]);
      expect(good.error).toBeNull();

      const bad = servers.find((s) => s.name === "bad-ref-server");
      expect(bad.running).toBe(false);
      expect(bad.tools).toEqual([]);
      expect(bad.error).toMatch(/resolve reference/);
    } finally {
      stopSSETestServer(goodServer);
      stopSSETestServer(badServer);
    }
  });

  it("keeps a server visible with its error when ping fails after boot", async () => {
    writeMCPConfig({});
    mcpLayer = new MCPCompatibilityLayer();

    // Simulate a server that connected at boot but has since died - its
    // ping() rejects. bootMCPServers() skips booting since mcps is populated.
    mcpLayer.mcps = {
      "dead-server": {
        ping: () => Promise.reject(new Error("fetch failed")),
        transport: { close: () => {} },
        close: () => {},
      },
      "alive-server": {
        ping: () => Promise.resolve(true),
        listTools: () => Promise.resolve({ tools: [GOOD_TOOL] }),
        transport: { close: () => {} },
        close: () => {},
      },
    };
    mcpLayer.mcpLoadingResults = {
      "dead-server": { status: "success", message: "connected" },
      "alive-server": { status: "success", message: "connected" },
    };

    const servers = await mcpLayer.servers();

    expect(servers).toHaveLength(2);

    const dead = servers.find((s) => s.name === "dead-server");
    expect(dead.running).toBe(false);
    expect(dead.error).toBe("fetch failed");

    const alive = servers.find((s) => s.name === "alive-server");
    expect(alive.running).toBe(true);
    expect(alive.tools.map((t) => t.name)).toEqual(["echo"]);
  });

  it("creates and immediately connects a remote MCP server", async () => {
    const remoteServer = await startSSETestServer([GOOD_TOOL]);
    writeMCPConfig({});
    mcpLayer = new MCPCompatibilityLayer();

    try {
      const result = await mcpLayer.createRemoteServer("external-test", {
        type: "sse",
        url: `http://localhost:${remoteServer.address().port}`,
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(result.server.running).toBe(true);
      expect(result.server.tools.map((tool) => tool.name)).toEqual(["echo"]);

      const saved = JSON.parse(
        fs.readFileSync(
          path.join(storageDir, "plugins", "nexusai_mcp_servers.json"),
          "utf8"
        )
      );
      expect(saved.mcpServers["external-test"]).toEqual({
        type: "sse",
        url: `http://localhost:${remoteServer.address().port}`,
      });
    } finally {
      stopSSETestServer(remoteServer);
    }
  });

  it("updates, renames, and reconnects a remote MCP server", async () => {
    const originalServer = await startSSETestServer([GOOD_TOOL]);
    const replacementServer = await startSSETestServer([GOOD_TOOL]);
    writeMCPConfig({
      original: {
        type: "sse",
        url: `http://localhost:${originalServer.address().port}`,
        nexusai: { suppressedTools: ["echo"] },
      },
    });
    mcpLayer = new MCPCompatibilityLayer();

    try {
      await mcpLayer.servers();
      const result = await mcpLayer.updateRemoteServer(
        "original",
        "replacement",
        {
          type: "sse",
          url: `http://localhost:${replacementServer.address().port}`,
        }
      );

      expect(result.success).toBe(true);
      expect(result.server.name).toBe("replacement");
      expect(result.server.running).toBe(true);
      expect(mcpLayer.mcps.original).toBeUndefined();

      const saved = JSON.parse(
        fs.readFileSync(
          path.join(storageDir, "plugins", "nexusai_mcp_servers.json"),
          "utf8"
        )
      );
      expect(saved.mcpServers.original).toBeUndefined();
      expect(saved.mcpServers.replacement.nexusai.suppressedTools).toEqual([
        "echo",
      ]);
    } finally {
      stopSSETestServer(originalServer);
      stopSSETestServer(replacementServer);
    }
  });

  it("restores the previous server when an update cannot connect", async () => {
    const originalServer = await startSSETestServer([GOOD_TOOL]);
    const originalUrl = `http://localhost:${originalServer.address().port}`;
    writeMCPConfig({ original: { type: "sse", url: originalUrl } });
    mcpLayer = new MCPCompatibilityLayer();

    try {
      await mcpLayer.servers();
      const result = await mcpLayer.updateRemoteServer("original", "broken", {
        type: "streamable",
        url: "http://127.0.0.1:1/mcp",
      });

      expect(result.success).toBe(false);
      const saved = JSON.parse(
        fs.readFileSync(
          path.join(storageDir, "plugins", "nexusai_mcp_servers.json"),
          "utf8"
        )
      );
      expect(saved.mcpServers).toEqual({
        original: { type: "sse", url: originalUrl },
      });
      expect(mcpLayer.mcps.original).toBeDefined();
      expect(mcpLayer.mcps.broken).toBeUndefined();
    } finally {
      stopSSETestServer(originalServer);
    }
  });

  it("records the owning workspace on a server created inside one", async () => {
    const remote = await startSSETestServer([GOOD_TOOL]);
    writeMCPConfig({});
    mcpLayer = new MCPCompatibilityLayer();

    try {
      const result = await mcpLayer.createRemoteServer(
        "owned",
        { type: "sse", url: `http://localhost:${remote.address().port}` },
        7
      );

      expect(result.success).toBe(true);
      expect(result.server.scope).toBe("workspace");
      expect(result.server.workspaceId).toBe(7);

      const saved = JSON.parse(
        fs.readFileSync(
          path.join(storageDir, "plugins", "nexusai_mcp_servers.json"),
          "utf8"
        )
      );
      expect(saved.mcpServers.owned.nexusai.workspaceId).toBe(7);
    } finally {
      stopSSETestServer(remote);
    }
  });

  it("leaves a server added by an administrator instance-wide", async () => {
    const remote = await startSSETestServer([GOOD_TOOL]);
    writeMCPConfig({});
    mcpLayer = new MCPCompatibilityLayer();

    try {
      const result = await mcpLayer.createRemoteServer("shared", {
        type: "sse",
        url: `http://localhost:${remote.address().port}`,
      });

      expect(result.server.scope).toBe("global");
      expect(result.server.workspaceId).toBeNull();
      const saved = JSON.parse(
        fs.readFileSync(
          path.join(storageDir, "plugins", "nexusai_mcp_servers.json"),
          "utf8"
        )
      );
      expect(saved.mcpServers.shared.nexusai).toBeUndefined();
    } finally {
      stopSSETestServer(remote);
    }
  });

  it("hides another workspace's server from the one asking", async () => {
    const shared = await startSSETestServer([GOOD_TOOL]);
    const owned = await startSSETestServer([GOOD_TOOL]);

    try {
      writeMCPConfig({
        shared: {
          type: "sse",
          url: `http://localhost:${shared.address().port}`,
        },
        "nine-own": {
          type: "sse",
          url: `http://localhost:${owned.address().port}`,
          nexusai: { workspaceId: 9 },
        },
      });
      mcpLayer = new MCPCompatibilityLayer();

      const asNine = await mcpLayer.servers({ workspaceId: 9 });
      expect(asNine.map((s) => s.name).sort()).toEqual(["nine-own", "shared"]);

      const asFive = await mcpLayer.servers({ workspaceId: 5 });
      expect(asFive.map((s) => s.name)).toEqual(["shared"]);

      // An administrator still sees everything, with each server's owner on it.
      const all = await mcpLayer.servers();
      expect(all.map((s) => s.name).sort()).toEqual(["nine-own", "shared"]);
      expect(all.find((s) => s.name === "nine-own").workspaceId).toBe(9);
      expect(all.find((s) => s.name === "shared").scope).toBe("global");
    } finally {
      stopSSETestServer(shared);
      stopSSETestServer(owned);
    }
  });

  it("keeps the owner when the server is edited", async () => {
    const first = await startSSETestServer([GOOD_TOOL]);
    const second = await startSSETestServer([GOOD_TOOL]);

    try {
      writeMCPConfig({
        owned: {
          type: "sse",
          url: `http://localhost:${first.address().port}`,
          nexusai: { workspaceId: 4 },
        },
      });
      mcpLayer = new MCPCompatibilityLayer();
      await mcpLayer.servers();

      const result = await mcpLayer.updateRemoteServer("owned", "renamed", {
        type: "sse",
        url: `http://localhost:${second.address().port}`,
        // A caller cannot hand ownership to someone else by asking.
        nexusai: { workspaceId: 99 },
      });

      expect(result.success).toBe(true);
      const saved = JSON.parse(
        fs.readFileSync(
          path.join(storageDir, "plugins", "nexusai_mcp_servers.json"),
          "utf8"
        )
      );
      expect(saved.mcpServers.renamed.nexusai.workspaceId).toBe(4);
    } finally {
      stopSSETestServer(first);
      stopSSETestServer(second);
    }
  });
});
