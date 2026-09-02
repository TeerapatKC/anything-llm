const { reqBody, userFromSession } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { superAdminOnly } = require("../utils/middleware/authorizedRequest");
const { updateENV } = require("../utils/helpers/updateENV");
const { EventLogs } = require("../models/eventLogs");
const {
  SMTP_PROVIDER_PRESETS,
  resolvedConfig,
  isConfigured,
  sendTestEmail,
} = require("../utils/smtp");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Outbound email (SMTP) configuration.
 *
 * Reserved to the instance owner, the same way Agent Flows are on this deployment -
 * every route here is gated on holding the `super-admin` role rather than on a
 * permission, so it cannot be handed to a custom role.
 */
function smtpEndpoints(app) {
  if (!app) return;

  app.get(
    "/smtp",
    [validatedRequest, superAdminOnly()],
    async (_request, response) => {
      try {
        const cfg = resolvedConfig();
        response.status(200).json({
          ...cfg,
          password: cfg.password ? "*".repeat(20) : "",
          hasPassword: !!cfg.password,
          configured: isConfigured(),
          providers: SMTP_PROVIDER_PRESETS,
          error: null,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/smtp",
    [validatedRequest, superAdminOnly()],
    async (request, response) => {
      try {
        const actor = await userFromSession(request, response);
        const {
          enabled = false,
          provider = "custom",
          host = "",
          port = "",
          secure = false,
          username = "",
          password = "",
          fromEmail = "",
          fromName = "",
        } = reqBody(request);

        if (!["google", "microsoft", "outlook", "custom"].includes(provider))
          return response
            .status(200)
            .json({ success: false, error: "Invalid provider selection." });

        if (enabled) {
          const preset = SMTP_PROVIDER_PRESETS[provider];
          const effectiveHost = preset?.host || host;
          if (!effectiveHost || !username || !fromEmail)
            return response.status(200).json({
              success: false,
              error:
                "Host, username and from-address are required to enable SMTP.",
            });
          if (!EMAIL_PATTERN.test(fromEmail))
            return response
              .status(200)
              .json({ success: false, error: "From-address is not a valid email." });
          if (!password && !isConfigured())
            return response.status(200).json({
              success: false,
              error: "A password (or app password) is required to enable SMTP.",
            });
        }

        const { error } = await updateENV(
          {
            SMTPEnabled: String(!!enabled),
            SMTPProvider: provider,
            SMTPHost: host,
            SMTPPort: String(port || ""),
            SMTPSecure: String(!!secure),
            SMTPUsername: username,
            SMTPPassword: password,
            SMTPFromEmail: fromEmail,
            SMTPFromName: fromName,
          },
          false,
          actor?.id
        );

        if (error) return response.status(200).json({ success: false, error });

        await EventLogs.logEvent(
          "smtp_settings_updated",
          { by: actor?.username, provider, enabled: !!enabled },
          actor?.id
        );

        const cfg = resolvedConfig();
        response.status(200).json({
          success: true,
          error: null,
          ...cfg,
          password: cfg.password ? "*".repeat(20) : "",
          hasPassword: !!cfg.password,
          configured: isConfigured(),
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/smtp/test",
    [validatedRequest, superAdminOnly()],
    async (request, response) => {
      try {
        const { to = "" } = reqBody(request);
        if (!EMAIL_PATTERN.test(to))
          return response.status(200).json({
            success: false,
            error: "Enter a valid email address to send the test to.",
          });

        if (!isConfigured())
          return response.status(200).json({
            success: false,
            error: "Save your SMTP settings before sending a test email.",
          });

        await sendTestEmail(to);
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e);
        response
          .status(200)
          .json({ success: false, error: e.message || "Failed to send test email." });
      }
    }
  );
}

module.exports = { smtpEndpoints };
