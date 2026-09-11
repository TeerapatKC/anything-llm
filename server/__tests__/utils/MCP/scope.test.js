const path = require("path");
const fs = require("fs");
const os = require("os");

// pkce-challenge (used by the MCP SDK's OAuth support, which these tests never
// exercise) is ESM-only under the hood and cannot be loaded by jest without
// --experimental-vm-modules.
jest.mock("pkce-challenge", () => ({
  default: async () => ({ code_verifier: "", code_challenge: "" }),
}));

// The one path that resolves a config for itself would otherwise go to the database
// for a workspace row these tests never create. What it returns is exercised by
// workspaceSkills' own tests; what matters here is that an unset list means "every
// server this workspace may see".
jest.mock("../../../utils/agents/workspaceSkills", () => ({
  resolveConfigForWorkspace: jest.fn(async () => ({
    activeMcpServers: null,
  })),
}));

const MCPHypervisor = require("../../../utils/MCP/hypervisor");
const MCPCompatibilityLayer = require("../../../utils/MCP");
const scope = require("../../../utils/MCP/scope");

const CONFIG = {
  shared: { type: "streamable", url: "https://shared.example/mcp" },
  "five-own": {
    type: "streamable",
    url: "https://five.example/mcp",
    headers: { Authorization: "Bearer five-secret" },
    nexusai: { workspaceId: 5, suppressedTools: ["danger"] },
  },
  "nine-own": {
    type: "sse",
    url: "https://nine.example/mcp",
    headers: { Authorization: "Bearer nine-secret" },
    nexusai: { workspaceId: 9 },
  },
};

const names = (entries) => entries.map((entry) => entry.name).sort();

describe("MCP server ownership & visibility", () => {
  let storageDir;

  beforeEach(() => {
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-scope-"));
    process.env.STORAGE_DIR = storageDir;
    // Both classes share one instance, so both have to be forgotten between tests or
    // the next one reads the config path of a temp directory already deleted.
    MCPCompatibilityLayer._instance = undefined;
    MCPHypervisor._instance = undefined;
    jest.spyOn(console, "log").mockImplementation(() => {});
    fs.mkdirSync(path.join(storageDir, "plugins"), { recursive: true });
    fs.writeFileSync(
      path.join(storageDir, "plugins", "nexusai_mcp_servers.json"),
      JSON.stringify({ mcpServers: CONFIG }, null, 2)
    );
  });

  afterEach(() => {
    MCPCompatibilityLayer._instance = undefined;
    MCPHypervisor._instance = undefined;
    delete process.env.STORAGE_DIR;
    fs.rmSync(storageDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe("ownership", () => {
    it("treats a server with no owner as instance-wide", () => {
      expect(names(scope.globalMCPServers())).toEqual(["shared"]);
      expect(scope.serverOwner({ server: CONFIG.shared })).toBeNull();
      expect(scope.serverOwner({ server: CONFIG["five-own"] })).toBe(5);
    });

    it("ignores an owner that is not a real workspace id", () => {
      expect(scope.normalizeWorkspaceId("0")).toBeNull();
      expect(scope.normalizeWorkspaceId(-3)).toBeNull();
      expect(scope.normalizeWorkspaceId("abc")).toBeNull();
      expect(scope.normalizeWorkspaceId("7")).toBe(7);
      expect(
        scope.serverOwner({ server: { nexusai: { workspaceId: 0 } } })
      ).toBeNull();
    });

    it("stamps and clears an owner without disturbing the rest of the block", () => {
      const stamped = scope.withOwner(
        { url: "https://x.example", nexusai: { suppressedTools: ["a"] } },
        7
      );
      expect(stamped.nexusai).toEqual({
        suppressedTools: ["a"],
        workspaceId: 7,
      });
      const cleared = scope.withOwner(stamped, null);
      expect(cleared.nexusai).toEqual({ suppressedTools: ["a"] });
      expect(
        scope.withOwner({ url: "https://x.example" }, null).nexusai
      ).toBeUndefined();
    });
  });

  describe("reading the config", () => {
    it("leaves the MCP singleton usable", () => {
      // Both classes share one instance and the layer extends the hypervisor, so
      // whichever is built first becomes that instance. Reading the config here must
      // not leave later callers holding a bare hypervisor with none of the
      // compatibility layer's own methods on it.
      expect(scope.globalMCPServers().length).toBeGreaterThan(0);

      const layer = new MCPCompatibilityLayer();
      expect(typeof layer.activeMCPServers).toBe("function");
      expect(typeof layer.servers).toBe("function");
      expect(typeof layer.createRemoteServer).toBe("function");
    });
  });

  describe("visibility", () => {
    it("shows a workspace the global pool plus its own servers", () => {
      expect(names(scope.mcpServersAvailableTo(5))).toEqual([
        "five-own",
        "shared",
      ]);
      expect(names(scope.mcpServersAvailableTo(9))).toEqual([
        "nine-own",
        "shared",
      ]);
      expect(names(scope.mcpServersOwnedByWorkspace(5))).toEqual(["five-own"]);
    });

    it("shows only the global pool when there is no workspace", () => {
      expect(names(scope.mcpServersAvailableTo(null))).toEqual(["shared"]);
      expect(scope.mcpServersOwnedByWorkspace(null)).toEqual([]);
    });

    it("withholds the headers of a server the asking workspace does not own", () => {
      const [shared] = scope
        .mcpServersAvailableTo(5)
        .filter((entry) => entry.name === "shared")
        .map((entry) => scope.toPublic(entry, 5));
      expect(shared.scope).toBe("global");
      expect(shared.headers).toBeUndefined();

      const [own] = scope
        .mcpServersOwnedByWorkspace(5)
        .map((entry) => scope.toPublic(entry, 5));
      expect(own.scope).toBe("workspace");
      expect(own.headers).toEqual({ Authorization: "Bearer five-secret" });

      // The same server seen from anywhere else keeps its secret.
      const asNine = scope.toPublic(
        { name: "five-own", server: CONFIG["five-own"] },
        9
      );
      expect(asNine.headers).toBeUndefined();
    });
  });

  describe("what an agent is allowed to load", () => {
    it("gives an unconfigured workspace everything it may see", async () => {
      const allowed = await scope.mcpServerNamesForWorkspace({ id: 5 }, null);
      expect(allowed.sort()).toEqual(["five-own", "shared"]);
    });

    it("keeps a workspace's own server even when the allow-list is empty", async () => {
      const allowed = await scope.mcpServerNamesForWorkspace(
        { id: 5 },
        { activeMcpServers: [] }
      );
      expect(allowed).toEqual(["five-own"]);
    });

    it("never hands over another workspace's server, however the config asks", async () => {
      const allowed = await scope.mcpServerNamesForWorkspace(
        { id: 5 },
        { activeMcpServers: ["shared", "nine-own"] }
      );
      expect(allowed.sort()).toEqual(["five-own", "shared"]);
    });

    it("honours a workspace switching a shared server off", async () => {
      const allowed = await scope.mcpServerNamesForWorkspace(
        { id: 9 },
        { activeMcpServers: [] }
      );
      expect(allowed).toEqual(["nine-own"]);
    });
  });
});
