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

function grafanaPublicUrl() {
  const explicit = String(process.env.GRAFANA_PUBLIC_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (explicit) return explicit;

  const port = String(process.env.GRAFANA_PUBLISH_PORT || "").trim();
  if (port) return `http://localhost:${port}`;
  return "";
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

function monitoringConfig() {
  const publicUrl = grafanaPublicUrl();
  return {
    enabled: Boolean(publicUrl),
    publicUrl,
    dashboards: parseDashboards(),
  };
}

module.exports = { monitoringConfig };
