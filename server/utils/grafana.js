/**
 * Grafana dashboards shown under Instance Settings.
 *
 * Two ways for the browser to reach Grafana:
 *
 *   proxied (default in docker)  The app reverse-proxies Grafana under /grafana on
 *                                its own origin (see grafanaProxy.js). Grafana needs
 *                                no port or hostname of its own, so it can stay off
 *                                every network but the compose one. Enabled by
 *                                GRAFANA_INTERNAL_URL.
 *   direct                       The iframe loads GRAFANA_PUBLIC_URL, or the app's
 *                                own host on GRAFANA_PUBLISH_PORT, straight from the
 *                                browser. GRAFANA_PUBLIC_URL wins over the proxy.
 *
 * GRAFANA_DASHBOARDS is an optional comma-separated list of
 * `uid|title|publicToken` entries. The public token is Grafana's public-dashboard
 * access token; when set, the iframe uses `/public-dashboards/<token>` so Grafana
 * login is not required. Without a token the kiosk dashboard URL is used, which
 * needs anonymous Viewer access on Grafana.
 */

const { makeJWT, decodeJWT } = require("./http");

const DEFAULT_DASHBOARDS = [
  {
    uid: "nexusai-docker-overview",
    title: "NexusAI - Docker Overview",
    slug: "nexusai-docker-overview",
    publicToken: null,
  },
];

/** Where Grafana is served on the app's own origin when the app proxies it. */
const GRAFANA_PROXY_PATH = "/grafana";
const ENTRY_SCOPE = "grafana-entry";
const SESSION_SCOPE = "grafana-session";

/**
 * Where the server reaches Grafana to proxy it, e.g. http://grafana:3000. Only the
 * origin is used: Grafana itself must be configured to serve from /grafana.
 * @returns {string} empty when proxying is off
 */
function grafanaInternalUrl() {
  return String(process.env.GRAFANA_INTERNAL_URL || "")
    .trim()
    .replace(/\/$/, "");
}

function explicitPublicUrl() {
  return String(process.env.GRAFANA_PUBLIC_URL || "")
    .trim()
    .replace(/\/$/, "");
}

/**
 * The proxy's tokens name the user under `grafanaUser`, never `id`.
 * validatedRequest accepts any JWT carrying an `id`, so a token shaped like a login
 * token would turn a Grafana link - which lands in an iframe URL and in proxy logs -
 * into a key for the whole API.
 */
function grafanaEntryToken(userId) {
  return makeJWT({ grafanaUser: userId, scope: ENTRY_SCOPE }, "15m");
}

function grafanaSessionToken(userId) {
  return makeJWT({ grafanaUser: userId, scope: SESSION_SCOPE }, "8h");
}

/**
 * @param {string|null} token
 * @param {"grafana-entry"|"grafana-session"} scope
 * @returns {number|string|null} the user the token was minted for
 */
function grafanaTokenUser(token, scope) {
  if (!token) return null;
  const payload = decodeJWT(String(token));
  if (payload?.scope !== scope) return null;
  if (payload.grafanaUser === undefined || payload.grafanaUser === null)
    return null;
  return payload.grafanaUser;
}

/**
 * Checked from the server because, when proxied, the browser cannot probe Grafana
 * without a session - and the server is the one that has to reach it anyway.
 * @returns {Promise<boolean>}
 */
async function grafanaReachable() {
  const internal = grafanaInternalUrl();
  if (!internal) return false;
  try {
    const response = await fetch(
      `${internal}${GRAFANA_PROXY_PATH}/api/health`,
      { signal: AbortSignal.timeout(5000) }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * The scheme and hostname the browser used to reach this server, with any port
 * stripped. X-Forwarded-* comes first for the split deployment, where nginx sits
 * in front and the backend only ever sees the proxy.
 *
 * The Host header is set by the client, so it is validated rather than trusted:
 * a hostname, a bracketed IPv6 literal, nothing else. A forged value would in any
 * case only change the iframe on the forger's own page.
 */
function browserOrigin(request) {
  if (!request?.headers) return null;

  const forwardedHost = String(request.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const rawHost = forwardedHost || String(request.headers.host || "").trim();
  if (!rawHost) return null;

  // Strip the port: "example.com:3001" and "[::1]:3001" both keep only the host.
  const host = rawHost.startsWith("[")
    ? rawHost.slice(0, rawHost.indexOf("]") + 1)
    : rawHost.split(":")[0];
  if (!host) return null;
  if (!/^\[[0-9a-fA-F:.]+\]$|^[A-Za-z0-9.-]+$/.test(host)) return null;

  const forwardedProto = String(request.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const protocol =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : request.secure
        ? "https"
        : "http";

  return { protocol, host };
}

/**
 * GRAFANA_PUBLIC_URL still wins when it is set - that is the escape hatch for a
 * Grafana behind its own domain or reverse proxy, where guessing from the app's
 * origin would be wrong.
 */
function grafanaPublicUrl(request = null) {
  const explicit = explicitPublicUrl();
  if (explicit) return explicit;

  const port = String(process.env.GRAFANA_PUBLISH_PORT || "").trim();
  if (!port) return "";

  const origin = browserOrigin(request);
  if (origin) return `${origin.protocol}://${origin.host}:${port}`;

  // No request to learn from - a CLI caller, or a test. Same machine is the only
  // assumption left, and it is the one the old code always made.
  return `http://localhost:${port}`;
}

function parseDashboards() {
  const raw = String(process.env.GRAFANA_DASHBOARDS || "").trim();
  if (!raw) return DEFAULT_DASHBOARDS.map((dashboard) => ({ ...dashboard }));

  return raw
    .split(",")
    .map((entry) => {
      const [uid, title, publicToken] = entry
        .split("|")
        .map((part) => String(part || "").trim());
      if (!uid) return null;
      return {
        uid,
        title: title || uid,
        slug: uid,
        publicToken: publicToken || null,
      };
    })
    .filter(Boolean);
}

/**
 * @param {import("express").Request|null} request
 * @param {{id: number}|null} user - the viewer; proxied mode mints their entry token
 */
function monitoringConfig(request = null, user = null) {
  if (!explicitPublicUrl() && grafanaInternalUrl()) {
    return {
      enabled: true,
      proxied: true,
      publicUrl: GRAFANA_PROXY_PATH,
      entryToken: user ? grafanaEntryToken(user.id) : null,
      dashboards: parseDashboards(),
    };
  }

  const publicUrl = grafanaPublicUrl(request);
  return {
    enabled: Boolean(publicUrl),
    proxied: false,
    publicUrl,
    dashboards: parseDashboards(),
  };
}

module.exports = {
  GRAFANA_PROXY_PATH,
  ENTRY_SCOPE,
  SESSION_SCOPE,
  grafanaInternalUrl,
  grafanaEntryToken,
  grafanaSessionToken,
  grafanaTokenUser,
  grafanaReachable,
  monitoringConfig,
};
