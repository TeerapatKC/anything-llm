const {
  normalizeRemoteMCPServer,
} = require("../../../utils/MCP/remoteServerConfig");

describe("normalizeRemoteMCPServer", () => {
  it("normalizes a Streamable HTTP server submitted by the UI", () => {
    expect(
      normalizeRemoteMCPServer({
        name: " company-mcp ",
        type: "streamable",
        url: "https://mcp.example.com/mcp",
        headers: { Authorization: " Bearer test-token " },
      })
    ).toEqual({
      name: "company-mcp",
      server: {
        type: "streamable",
        url: "https://mcp.example.com/mcp",
        headers: { Authorization: "Bearer test-token" },
      },
    });
  });

  it.each([
    [
      { name: "bad name", type: "streamable", url: "https://example.com/mcp" },
      /Name must/,
    ],
    [
      { name: "test", type: "stdio", url: "https://example.com/mcp" },
      /Transport/,
    ],
    [
      { name: "test", type: "streamable", url: "file:///tmp/mcp" },
      /http or https/,
    ],
    [
      { name: "test", type: "streamable", url: "not-a-url" },
      /valid MCP server URL/,
    ],
  ])("rejects invalid remote configuration", (input, expected) => {
    expect(() => normalizeRemoteMCPServer(input)).toThrow(expected);
  });

  it("rejects header injection", () => {
    expect(() =>
      normalizeRemoteMCPServer({
        name: "test",
        type: "sse",
        url: "http://localhost:3003/sse",
        headers: { Authorization: "Bearer ok\r\nX-Injected: yes" },
      })
    ).toThrow(/invalid characters/);
  });
});
