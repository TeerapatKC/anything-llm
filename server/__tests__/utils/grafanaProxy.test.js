process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "grafana-proxy-test-secret";

/**
 * The /grafana reverse proxy. It is what lets Grafana stay off the network, so the
 * tests that matter most are the ones about who gets through: no session, a session
 * for a user without `system.monitoring`, and a Grafana token tried against the rest
 * of the API. A fake upstream stands in for Grafana and records what it was sent.
 */

const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");

jest.mock("../../models/user");
jest.mock("../../models/role");

const { User } = require("../../models/user");
const { Role } = require("../../models/role");
const { makeJWT } = require("../../utils/http");
const {
  grafanaEntryToken,
  grafanaSessionToken,
} = require("../../utils/grafana");
const { grafanaProxy, SESSION_COOKIE } = require("../../utils/grafanaProxy");
const {
  validatedRequest,
} = require("../../utils/middleware/validatedRequest");

const USERS = {
  1: { id: 1, role: "monitor" },
  2: { id: 2, role: "default" },
  3: { id: 3, role: "monitor", suspended: true },
  4: { id: 4, role: "monitor" },
  5: { id: 5, role: "monitor" },
  6: { id: 6, role: "monitor" },
  7: { id: 7, role: "monitor" },
  8: { id: 8, role: "monitor" },
};

let upstream;
let server;
let base;
let seen = [];

function listen(target) {
  return new Promise((resolve) => {
    const handle = target.listen(0, "127.0.0.1", () => resolve(handle));
  });
}

beforeAll(async () => {
  upstream = http.createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      seen.push({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body,
      });
      if (request.url === "/grafana/redirects") {
        response.writeHead(302, {
          Location: "http://localhost:3000/grafana/login?x=1",
        });
        return response.end();
      }
      response.writeHead(200, {
        "Content-Type": "application/json",
        "X-Frame-Options": "deny",
      });
      response.end(JSON.stringify({ database: "ok" }));
    });
  });
  await listen(upstream);
  process.env.GRAFANA_INTERNAL_URL = `http://127.0.0.1:${upstream.address().port}`;

  const app = express();
  app.use("/grafana", grafanaProxy);
  // After the proxy, as in server/index.js - a proxied body must reach Grafana intact.
  app.use(bodyParser.json());
  app.get("/api/whoami", validatedRequest, (_request, response) =>
    response.status(200).json({ ok: true })
  );
  app.all("*", (_request, response) => response.sendStatus(404));
  server = await listen(app);
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => upstream.close(resolve));
  delete process.env.GRAFANA_INTERNAL_URL;
});

beforeEach(() => {
  seen = [];
  jest.clearAllMocks();
  User.get.mockImplementation(async ({ id }) => USERS[id] ?? null);
  Role.userCanAny.mockImplementation(
    async (user, permissions) =>
      user?.role === "monitor" && permissions.includes("system.monitoring")
  );
});

const withSession = (userId) => ({
  cookie: `theme=dark; ${SESSION_COOKIE}=${grafanaSessionToken(userId)}`,
});

describe("grafanaProxy", () => {
  it("refuses a request without a session and never reaches Grafana", async () => {
    const response = await fetch(`${base}/grafana/api/health`);
    expect(response.status).toBe(401);
    expect(seen).toHaveLength(0);
  });

  it("trades a valid entry token for a /grafana-scoped httpOnly cookie", async () => {
    const next = "/grafana/d/abc/overview?kiosk&theme=dark";
    const response = await fetch(
      `${base}/grafana/_nexus/enter?${new URLSearchParams({
        token: grafanaEntryToken(1),
        next,
      })}`,
      { redirect: "manual" }
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(next);
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toMatch(/Path=\/grafana/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(seen).toHaveLength(0);
  });

  it.each([
    ["an absolute URL", "https://evil.example/grafana/"],
    ["a protocol-relative URL", "//evil.example/grafana/"],
    ["a path outside /grafana", "/api/system"],
  ])("will not redirect to %s", async (_label, next) => {
    const response = await fetch(
      `${base}/grafana/_nexus/enter?${new URLSearchParams({
        token: grafanaEntryToken(4),
        next,
      })}`,
      { redirect: "manual" }
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/grafana/");
  });

  it.each([
    ["a session token", () => grafanaSessionToken(5)],
    ["a login token", () => makeJWT({ id: 5, username: "u" }, "1h")],
    ["garbage", () => "not-a-jwt"],
  ])("refuses %s as an entry token", async (_label, token) => {
    const response = await fetch(
      `${base}/grafana/_nexus/enter?token=${encodeURIComponent(token())}`,
      { redirect: "manual" }
    );
    expect(response.status).toBe(401);
  });

  it("refuses a user without system.monitoring", async () => {
    const response = await fetch(`${base}/grafana/api/health`, {
      headers: withSession(2),
    });
    expect(response.status).toBe(401);
    expect(seen).toHaveLength(0);
  });

  it("refuses a suspended user", async () => {
    const response = await fetch(`${base}/grafana/api/health`, {
      headers: withSession(3),
    });
    expect(response.status).toBe(401);
  });

  it("forwards to Grafana under /grafana, without the app's own credentials", async () => {
    const response = await fetch(`${base}/grafana/api/health?check=1`, {
      headers: { ...withSession(6), authorization: "Bearer app-token" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ database: "ok" });
    // Grafana is framed by the app's page, so its own DENY is replaced.
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");

    expect(seen).toHaveLength(1);
    const [received] = seen;
    expect(received.url).toBe("/grafana/api/health?check=1");
    expect(received.headers.host).toBe(new URL(base).host);
    expect(received.headers.authorization).toBeUndefined();
    expect(received.headers.cookie).toBe("theme=dark");
  });

  it("streams a request body through, ahead of the app's body parser", async () => {
    const payload = JSON.stringify({ queries: [{ refId: "A" }] });
    const response = await fetch(`${base}/grafana/api/ds/query`, {
      method: "POST",
      headers: { ...withSession(7), "content-type": "application/json" },
      body: payload,
    });

    expect(response.status).toBe(200);
    expect(seen[0].method).toBe("POST");
    expect(seen[0].body).toBe(payload);
  });

  it("keeps Grafana's redirects on the app's origin", async () => {
    const response = await fetch(`${base}/grafana/redirects`, {
      headers: withSession(8),
      redirect: "manual",
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/grafana/login?x=1");
  });
});

describe("Grafana tokens against the rest of the API", () => {
  it.each([
    ["an entry token", () => grafanaEntryToken(1)],
    ["a session token", () => grafanaSessionToken(1)],
  ])("rejects %s as an API bearer token", async (_label, token) => {
    const response = await fetch(`${base}/api/whoami`, {
      headers: { authorization: `Bearer ${token()}` },
    });
    expect(response.status).toBe(401);
  });
});
