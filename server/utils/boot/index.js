const { BackgroundService } = require("../BackgroundWorkers");
const { EncryptionManager } = require("../EncryptionManager");
const { CommunicationKey } = require("../comKey");
const eagerLoadContextWindows = require("./eagerLoadContextWindows");
const markOnboarded = require("./markOnboarded");
const { bootstrapAdminFromEnv, ensureJWTSecret } = require("./bootstrapAdmin");
const {
  ensureSuperAdminExists,
  applyBreakGlassFromEnv,
} = require("./superAdmin");
const { TelegramBotService } = require("../telegramBot");
const { Role } = require("../../models/role");
const { WorkspaceRole } = require("../../models/workspaceRole");
const { WORKSPACE_PERMISSIONS } = require("../permissions");

// Testing SSL? You can make a self signed certificate and point the ENVs to that location
// make a directory in server called 'sslcert' - cd into it
// - openssl genrsa -aes256 -passout pass:gsahdg -out server.pass.key 4096
// - openssl rsa -passin pass:gsahdg -in server.pass.key -out server.key
// - rm server.pass.key
// - openssl req -new -key server.key -out server.csr
// Update .env keys with the correct values and boot. These are temporary and not real SSL certs - only use for local.
// Test with https://localhost:3001/api/ping
// build and copy frontend to server/public with correct API_BASE and start server in prod model and all should be ok
function bootSSL(app, port = 3001) {
  try {
    console.log(
      `\x1b[33m[SSL BOOT ENABLED]\x1b[0m Loading the certificate and key for HTTPS mode...`
    );
    const fs = require("fs");
    const https = require("https");
    const privateKey = fs.readFileSync(process.env.HTTPS_KEY_PATH);
    const certificate = fs.readFileSync(process.env.HTTPS_CERT_PATH);
    const credentials = { key: privateKey, cert: certificate };
    const server = https.createServer(credentials, app);

    server
      .listen(port, async () => {
        await ensureJWTSecret();
        await markOnboarded();
        await Role.seed();
        await WorkspaceRole.seed();
        // One-time grants for permissions introduced after an instance was first booted;
        // seeding alone never revisits a role that already exists.
        await WorkspaceRole.grantOnce(
          "workspace-manager",
          WORKSPACE_PERMISSIONS.AGENT_FLOWS_MANAGE,
          "backfill_workspace_manager_agent_flows"
        );
        await WorkspaceRole.grantOnce(
          "workspace-manager",
          WORKSPACE_PERMISSIONS.SQL_CONNECTORS_MANAGE,
          "backfill_workspace_manager_sql_connectors"
        );
        await WorkspaceRole.grantOnce(
          "workspace-manager",
          WORKSPACE_PERMISSIONS.MCP_SERVERS_MANAGE,
          "backfill_workspace_manager_mcp_servers"
        );
        await WorkspaceRole.grantOnce(
          "workspace-manager",
          WORKSPACE_PERMISSIONS.SCHEDULED_JOBS_MANAGE,
          "backfill_workspace_manager_scheduled_jobs"
        );
        // After role seeding - the owner role must exist before the account can be made.
        await bootstrapAdminFromEnv();
        // Instances created before the owner role existed have nobody holding it, and the
        // recovery paths are the only way ownership moves without a signed-in owner.
        await ensureSuperAdminExists();
        await applyBreakGlassFromEnv();
        new CommunicationKey(true);
        new EncryptionManager();
        new BackgroundService().boot();
        await eagerLoadContextWindows();
        console.log(`Primary server in HTTPS mode listening on port ${port}`);
        // Telegram is an optional integration. A slow API or duplicate poller
        // must never hold the primary application startup path open.
        TelegramBotService.bootIfActive();
      })
      .on("error", catchSigTerms);

    require("@mintplex-labs/express-ws").default(app, server);
    return { app, server };
  } catch (e) {
    console.error(
      `\x1b[31m[SSL BOOT FAILED]\x1b[0m ${e.message} - falling back to HTTP boot.`,
      {
        ENABLE_HTTPS: process.env.ENABLE_HTTPS,
        HTTPS_KEY_PATH: process.env.HTTPS_KEY_PATH,
        HTTPS_CERT_PATH: process.env.HTTPS_CERT_PATH,
        stacktrace: e.stack,
      }
    );
    return bootHTTP(app, port);
  }
}

function bootHTTP(app, port = 3001) {
  if (!app) throw new Error('No "app" defined - crashing!');

  app
    .listen(port, async () => {
      await ensureJWTSecret();
      await markOnboarded();
      await Role.seed();
      await WorkspaceRole.seed();
      // One-time grants for permissions introduced after an instance was first booted;
      // seeding alone never revisits a role that already exists.
      await WorkspaceRole.grantOnce(
        "workspace-manager",
        WORKSPACE_PERMISSIONS.AGENT_FLOWS_MANAGE,
        "backfill_workspace_manager_agent_flows"
      );
      await WorkspaceRole.grantOnce(
        "workspace-manager",
        WORKSPACE_PERMISSIONS.SQL_CONNECTORS_MANAGE,
        "backfill_workspace_manager_sql_connectors"
      );
      await WorkspaceRole.grantOnce(
        "workspace-manager",
        WORKSPACE_PERMISSIONS.MCP_SERVERS_MANAGE,
        "backfill_workspace_manager_mcp_servers"
      );
      await WorkspaceRole.grantOnce(
        "workspace-manager",
        WORKSPACE_PERMISSIONS.SCHEDULED_JOBS_MANAGE,
        "backfill_workspace_manager_scheduled_jobs"
      );
      // After role seeding - the owner role must exist before the account can be made.
      await bootstrapAdminFromEnv();
      // Instances created before the owner role existed have nobody holding it, and the
      // recovery paths are the only way ownership moves without a signed-in owner.
      await ensureSuperAdminExists();
      await applyBreakGlassFromEnv();
      new CommunicationKey(true);
      new EncryptionManager();
      new BackgroundService().boot();
      await eagerLoadContextWindows();
      console.log(`Primary server in HTTP mode listening on port ${port}`);
      // Telegram is an optional integration. A slow API or duplicate poller
      // must never hold the primary application startup path open.
      TelegramBotService.bootIfActive();
    })
    .on("error", catchSigTerms);

  return { app, server: null };
}

function catchSigTerms() {
  process.once("SIGUSR2", function () {
    process.kill(process.pid, "SIGUSR2");
  });
  process.on("SIGINT", function () {
    process.kill(process.pid, "SIGINT");
  });
}

module.exports = {
  bootHTTP,
  bootSSL,
};
