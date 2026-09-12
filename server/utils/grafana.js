/**
 * Grafana dashboards shown under Instance Settings.
 *
 * The browser loads Grafana directly (iframe), so GRAFANA_PUBLIC_URL must be a
 * URL the user's browser can reach - typically http://localhost:3300 when the
 * compose stack publishes Grafana on that port.
 *
 * GRAFANA_DASHBOARDS is an optional comma-separated list of
 * `uid|title|publicToken` entries. The public token is Grafana's public-dashboard
 * access token; when set, the iframe uses `/public-dashboards/<token>` so Grafana
 * login is not required. Without a token the kiosk dashboard URL is used, which
 * needs anonymous Viewer access on Grafana.
 */

const DEFAULT_DASHBOARDS = [
  {
    uid: "nexusai-docker-overview",
    title: "NexusAI - Docker Overview",
    slug: "nexusai-docker-overview",
    publicToken: null,
  },
];

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
  const explicit = String(process.env.GRAFANA_PUBLIC_URL || "")
    .trim()
    .replace(/\/$/, "");
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
      const [uid, title, publicToken] = entry.split("|").map((part) =>
        String(part || "").trim()
      );
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

function monitoringConfig(request = null) {
  const publicUrl = grafanaPublicUrl(request);
  return {
    enabled: Boolean(publicUrl),
    publicUrl,
    dashboards: parseDashboards(),
  };
}

module.exports = { monitoringConfig };
