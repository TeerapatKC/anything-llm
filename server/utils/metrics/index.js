const client = require("prom-client");

/**
 * Prometheus metrics for the running instance, scraped by the monitoring stack's
 * Prometheus container at GET /metrics (see docker/monitoring/prometheus.yml). Host
 * and per-container resource usage already come from node-exporter and cAdvisor -
 * this registry only carries what neither can see from outside the process:
 * request/session concurrency.
 */
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "nexusai_process_" });

const httpRequestsInFlight = new client.Gauge({
  name: "nexusai_http_requests_in_flight",
  help: "HTTP requests currently being handled",
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: "nexusai_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

const activeAgentSessions = new client.Gauge({
  name: "nexusai_active_agent_sessions",
  help: "Open agent-invocation websocket sessions (chat/agent runs in progress)",
  registers: [register],
});

/**
 * Tracks in-flight HTTP requests and their duration. Mounted before the route
 * table in index.js so every request is counted, including ones that 404.
 */
function httpMetricsMiddleware(req, res, next) {
  httpRequestsInFlight.inc();
  const endTimer = httpRequestDuration.startTimer();
  res.on("finish", () => {
    httpRequestsInFlight.dec();
    endTimer({ method: req.method, status_code: res.statusCode });
  });
  next();
}

module.exports = {
  register,
  httpMetricsMiddleware,
  activeAgentSessions,
};
