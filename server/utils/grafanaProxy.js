const http = require("http");
const https = require("https");
const { User } = require("../models/user");
const { Role } = require("../models/role");
const { PERMISSIONS } = require("./permissions");
const {
  GRAFANA_PROXY_PATH,
  ENTRY_SCOPE,
  SESSION_SCOPE,
  grafanaInternalUrl,
  grafanaSessionToken,
  grafanaTokenUser,
} = require("./grafana");

/**
 * Grafana, reverse-proxied under /grafana on the app's own origin.
 *
 * This is what lets Grafana stay off the network: the browser only ever talks to
 * the app, and the app reaches Grafana across the compose network. It also puts
 * Grafana behind the app's own permission check - `system.monitoring` - rather than
 * behind whatever Grafana's anonymous access happens to allow.
 *
 * An iframe cannot send the Authorization header the rest of the API uses, so entry
 * is a two-step handshake. The monitoring endpoint hands the page a short-lived
 * entry token; the iframe opens /grafana/_nexus/enter?token=...&next=..., which is
 * checked here and traded for an httpOnly cookie scoped to /grafana. Every request
 * after that carries the cookie.
 *
 * Mounted before the body parsers in server/index.js - they would otherwise
 * consume the request stream this forwards.
 */

const SESSION_COOKIE = "nexusai_grafana";
const SESSION_MS = 8 * 60 * 60 * 1000; // matches grafanaSessionToken's expiry
const ENTRY_PATH = "/_nexus/enter";

// A dashboard load is dozens of requests, and every refresh another round of
// queries. Re-reading the user and role for each would be a database hit per panel,
// so the answer is kept briefly: a revoked permission stops working within a minute.
const ACCESS_CACHE_MS = 60 * 1000;
const accessCache = new Map();

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

/**
 * Mirrors validatedRequest and the route gate on /system/monitoring: the user must
 * exist, be active, not be frozen pending a password change, and hold the permission.
 */
async function userMayView(userId) {
  const key = String(userId);
  const cached = accessCache.get(key);
  if (cached && Date.now() - cached.at < ACCESS_CACHE_MS) return cached.allowed;

  const user = await User.get({ id: Number(userId) });
  const allowed =
    !!user &&
    !user.suspended &&
    !user.requiresPasswordChange &&
    (await Role.userCanAny(user, [PERMISSIONS.SYSTEM_MONITORING]));
  accessCache.set(key, { allowed, at: Date.now() });
  return allowed;
}

function cookieParts(header = "") {
  return String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function readCookie(header, name) {
  for (const part of cookieParts(header)) {
    const eq = part.indexOf("=");
    if (eq !== -1 && part.slice(0, eq).trim() === name)
      return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/** The session cookie is the app's, not Grafana's - it is not forwarded. */
function cookiesWithout(header, name) {
  return cookieParts(header)
    .filter((part) => part.split("=")[0].trim() !== name)
    .join("; ");
}

function isSecure(request) {
  const proto = String(request.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return proto === "https" || !!request.secure;
}

/** Only a path under /grafana - anything else would make this an open redirect. */
function safeNext(next) {
  const value = typeof next === "string" ? next : "";
  const inside =
    value === GRAFANA_PROXY_PATH || value.startsWith(`${GRAFANA_PROXY_PATH}/`);
  if (!inside || value.includes("\\") || value.includes("//"))
    return `${GRAFANA_PROXY_PATH}/`;
  return value;
}

/**
 * Grafana builds absolute redirects from its root_url, whose host is its own idea
 * of where it lives. Keep only the path so the browser stays on the app's origin.
 */
function rewriteLocation(location) {
  try {
    const url = new URL(location, "http://grafana.invalid");
    if (
      url.pathname === GRAFANA_PROXY_PATH ||
      url.pathname.startsWith(`${GRAFANA_PROXY_PATH}/`)
    )
      return `${url.pathname}${url.search}${url.hash}`;
  } catch {}
  return location;
}

function deny(response) {
  return response
    .status(401)
    .type("text/plain")
    .send(
      "Grafana is available to Nexus AI users with monitoring access. Open it from Instance Settings > Monitoring."
    );
}

async function enter(request, response) {
  const userId = grafanaTokenUser(request.query.token, ENTRY_SCOPE);
  if (userId === null || !(await userMayView(userId))) return deny(response);

  response.cookie(SESSION_COOKIE, grafanaSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure(request),
    path: GRAFANA_PROXY_PATH,
    maxAge: SESSION_MS,
  });
  return response.redirect(302, safeNext(request.query.next));
}

function forward(request, response, internal) {
  const target = new URL(request.originalUrl, `${internal}/`);

  const headers = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (!HOP_BY_HOP.has(name)) headers[name] = value;
  }
  // The Host header is left as the browser sent it: Grafana checks a request's
  // Origin against its Host, and rewriting one without the other trips that check.
  delete headers.authorization;
  const cookie = cookiesWithout(request.headers.cookie, SESSION_COOKIE);
  if (cookie) headers.cookie = cookie;
  else delete headers.cookie;
  headers["x-forwarded-host"] =
    request.headers["x-forwarded-host"] || request.headers.host || "";
  headers["x-forwarded-proto"] = isSecure(request) ? "https" : "http";
  headers["x-forwarded-for"] = [
    request.headers["x-forwarded-for"],
    request.socket?.remoteAddress,
  ]
    .filter(Boolean)
    .join(", ");

  const client = target.protocol === "https:" ? https : http;
  const upstream = client.request(
    target,
    { method: request.method, headers },
    (upstreamResponse) => {
      const outgoing = {};
      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (!HOP_BY_HOP.has(name)) outgoing[name] = value;
      }
      if (outgoing.location)
        outgoing.location = rewriteLocation(outgoing.location);
      // Framed by the app's own Monitoring page and nothing else.
      outgoing["x-frame-options"] = "SAMEORIGIN";
      response.writeHead(upstreamResponse.statusCode || 502, outgoing);
      upstreamResponse.pipe(response);
    }
  );

  upstream.on("error", (error) => {
    console.error("[GrafanaProxy]", error.message);
    if (!response.headersSent)
      response
        .status(502)
        .type("text/plain")
        .send("Grafana is not reachable from Nexus AI.");
    else response.destroy(error);
  });
  response.on("close", () => upstream.destroy());
  request.pipe(upstream);
}

async function grafanaProxy(request, response, next) {
  const internal = grafanaInternalUrl();
  if (!internal) return next();

  try {
    if (request.method === "GET" && request.path === ENTRY_PATH)
      return await enter(request, response);

    const session = readCookie(request.headers.cookie, SESSION_COOKIE);
    const userId = grafanaTokenUser(session, SESSION_SCOPE);
    if (userId === null || !(await userMayView(userId))) return deny(response);

    return forward(request, response, internal);
  } catch (error) {
    console.error("[GrafanaProxy]", error);
    if (!response.headersSent) response.sendStatus(500);
  }
}

module.exports = { grafanaProxy, SESSION_COOKIE };
