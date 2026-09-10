const SERVER_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const SUPPORTED_TRANSPORTS = new Set(["streamable", "sse"]);

/**
 * Validate and normalize a remote MCP server submitted through the UI.
 * The UI deliberately supports network transports only; stdio definitions can
 * execute arbitrary commands inside the application container.
 * @param {object} input
 * @returns {{name: string, server: object}}
 */
function normalizeRemoteMCPServer(input = {}) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!SERVER_NAME_PATTERN.test(name)) {
    throw new Error(
      "Name must be 1-64 characters and contain only letters, numbers, dots, underscores, or hyphens."
    );
  }

  const type = typeof input.type === "string" ? input.type.trim() : "";
  if (!SUPPORTED_TRANSPORTS.has(type)) {
    throw new Error("Transport must be streamable or sse.");
  }

  let url;
  try {
    url = new URL(String(input.url || "").trim());
  } catch {
    throw new Error("A valid MCP server URL is required.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("MCP server URL must use http or https.");
  }

  const headers = input.headers ?? {};
  if (
    typeof headers !== "object" ||
    headers === null ||
    Array.isArray(headers)
  ) {
    throw new Error("Headers must be an object.");
  }

  const normalizedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    const headerName = String(key).trim();
    const headerValue = typeof value === "string" ? value.trim() : "";
    if (!headerName || !headerValue) {
      throw new Error("Header names and values cannot be empty.");
    }
    if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(headerName)) {
      throw new Error(`Invalid HTTP header name: ${headerName}`);
    }
    if (/[^\t\x20-\x7e]/.test(headerValue)) {
      throw new Error("Headers contain invalid characters.");
    }
    normalizedHeaders[headerName] = headerValue;
  }

  return {
    name,
    server: {
      type,
      url: url.toString(),
      ...(Object.keys(normalizedHeaders).length
        ? { headers: normalizedHeaders }
        : {}),
    },
  };
}

module.exports = { normalizeRemoteMCPServer };
