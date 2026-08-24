const { User } = require("../models/user");
const { Role } = require("../models/role");
const { EventLogs } = require("../models/eventLogs");
const { SystemReset } = require("../models/systemReset");
const { SystemSettings } = require("../models/systemSettings");
const { reqBody, userFromSession } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { superAdminOnly } = require("../utils/middleware/authorizedRequest");
const { ReservedPermissions } = require("../models/reservedPermissions");
const {
  SUPER_ADMIN_ONLY_CAPABILITIES,
  SCOPES,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  PERMISSION_CHILDREN,
  RESERVABLE_PERMISSION_KEYS,
  DEFAULT_RESERVED_PERMISSIONS,
} = require("../utils/permissions");

/**
 * The owner-only console: ownership transfer, scoped reset, and factory reset.
 *
 * Every route here is gated on holding the `super-admin` role rather than on any
 * permission - see the note on `superAdminOnly`. Each destructive one also re-verifies
 * the caller's password, because a hijacked session should not be enough to hand the
 * instance away or empty it.
 */

/**
 * What the operator types to confirm a factory reset.
 *
 * The scoped reset asks for the instance's own name; this asks for something else
 * entirely, so muscle memory from having done a partial reset cannot carry someone
 * through the one that deletes their account too.
 */
const FACTORY_CONFIRMATION_PHRASE = "erase this instance";

/**
 * Re-checks the caller's own password. Guards the two irreversible operations against a
 * borrowed session or an unattended browser.
 * @param {{id: number}} actor
 * @param {string} password
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function reauthenticate(actor, password) {
  if (!password || typeof password !== "string")
    return { valid: false, error: "Enter your password to confirm." };
  if (!(await User.verifyPassword(actor.id, password)))
    return { valid: false, error: "That password is not correct." };
  return { valid: true, error: null };
}

function superAdminEndpoints(app) {
  if (!app) return;

  /**
   * Who owns the instance, what owning it means, and which accounts ownership could be
   * handed to. Readable by the owner only - nobody else has a use for it.
   */
  app.get(
    "/super-admin/state",
    [validatedRequest, superAdminOnly()],
    async (request, response) => {
      try {
        const actor = await userFromSession(request, response);
        const owner = await Role.currentSuperAdmin();

        // Ownership can only go to an account that can actually sign in and use it.
        const candidates = (await User.where({ suspended: 0 }))
          .filter((user) => user.id !== actor.id)
          .map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          }));

        response.status(200).json({
          owner: owner ? User.filterFields(owner) : null,
          isOwner: actor?.id === owner?.id,
          capabilities: SUPER_ADMIN_ONLY_CAPABILITIES,
          transferCandidates: candidates,
          error: null,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * Hands ownership to another account and demotes the caller to Admin in the same
   * transaction. The only route that can move the `super-admin` role.
   */
  app.post(
    "/super-admin/transfer",
    [validatedRequest, superAdminOnly()],
    async (request, response) => {
      try {
        const actor = await userFromSession(request, response);
        const { targetUserId, password } = reqBody(request);

        const reauth = await reauthenticate(actor, password);
        if (!reauth.valid)
          return response
            .status(200)
            .json({ success: false, error: reauth.error });

        const { success, error, from, to } =
          await User.transferSuperAdmin(targetUserId);
        if (!success)
          return response.status(200).json({ success: false, error });

        await EventLogs.logEvent(
          "super_admin_transferred",
          { from: from?.username ?? null, to: to.username, via: "console" },
          actor.id
        );

        response.status(200).json({ success: true, error: null, owner: to });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * The system permissions the owner can keep to themselves, and which are currently
   * reserved. Grouped the same way the role editor groups them so the two screens read
   * alike.
   */
  app.get(
    "/super-admin/reserved-permissions",
    [validatedRequest, superAdminOnly()],
    async (_request, response) => {
      try {
        const reserved = await ReservedPermissions.get();
        const categories = Object.entries(PERMISSION_CATEGORIES)
          .filter(([, category]) => category.scope === SCOPES.SYSTEM)
          .sort(([, a], [, b]) => a.order - b.order)
          .map(([key, category]) => ({
            key,
            label: category.label,
            permissions: PERMISSION_CATALOG.filter(
              (permission) =>
                permission.category === key &&
                RESERVABLE_PERMISSION_KEYS.includes(permission.key)
            )
              .sort((a, b) => a.order - b.order)
              .map((permission) => ({
                ...permission,
                // Reserving a coarse permission reaches further than reserving its
                // children: it takes the whole subtree, and - for `system.settings` -
                // it is also the fallback every unmapped settings key falls back to, so
                // things like the support email and password policy go with it. The UI
                // warns rather than forbids; an owner may well mean it.
                hasChildren:
                  (PERMISSION_CHILDREN.get(permission.key) ?? []).length > 0,
              })),
          }))
          .filter((category) => category.permissions.length > 0);

        response.status(200).json({
          categories,
          reserved,
          defaults: DEFAULT_RESERVED_PERMISSIONS,
          error: null,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * Replaces the reserved list. Anything listed here stops being available to every other
   * role on the instance, whatever their role grants - so this is an access-control
   * change, not a matter of hiding menu entries.
   */
  app.post(
    "/super-admin/reserved-permissions",
    [validatedRequest, superAdminOnly()],
    async (request, response) => {
      try {
        const actor = await userFromSession(request, response);
        const { permissions = [] } = reqBody(request);
        const previous = await ReservedPermissions.get();

        const { reserved, error } = await ReservedPermissions.set(permissions);
        if (error) return response.status(200).json({ success: false, error });

        await EventLogs.logEvent(
          "reserved_permissions_updated",
          { by: actor.username, from: previous, to: reserved },
          actor.id
        );

        response.status(200).json({ success: true, error: null, reserved });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * What each reset scope would remove, so the confirmation dialog can show real numbers
   * instead of a generic warning.
   */
  app.get(
    "/super-admin/reset/preview",
    [validatedRequest, superAdminOnly()],
    async (request, response) => {
      try {
        const actor = await userFromSession(request, response);
        response.status(200).json({
          scopes: SystemReset.SCOPES,
          counts: await SystemReset.preview(actor),
          factory: await SystemReset.factoryPreview(),
          confirmationPhrase: await instanceName(),
          factoryConfirmationPhrase: FACTORY_CONFIRMATION_PHRASE,
          error: null,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * Returns the deployment to its pre-onboarding state: every account gone, every table
   * emptied, stored documents cleared and the provider configuration removed, so the next
   * person to open it walks through setup from the beginning.
   *
   * Deliberately a separate route from the scoped reset above, with its own confirmation
   * phrase, so it can never be reached by ticking one more box on that form.
   */
  app.post(
    "/super-admin/reset/factory",
    [validatedRequest, superAdminOnly()],
    async (request, response) => {
      try {
        const actor = await userFromSession(request, response);
        const { password, confirmation } = reqBody(request);

        const reauth = await reauthenticate(actor, password);
        if (!reauth.valid)
          return response
            .status(200)
            .json({ success: false, error: reauth.error });

        if (String(confirmation ?? "").trim() !== FACTORY_CONFIRMATION_PHRASE)
          return response.status(200).json({
            success: false,
            error: `Type "${FACTORY_CONFIRMATION_PHRASE}" exactly to confirm.`,
          });

        const result = await SystemReset.factoryReset({ actor });
        if (!result.success)
          return response
            .status(200)
            .json({ success: false, error: result.error });

        // The first entry in the instance's brand new event log. Written without a user
        // id because the account that ordered it no longer exists.
        await EventLogs.logEvent("factory_reset", {
          by: actor.username,
          records: result.results.records,
        });

        response.status(200).json({
          success: true,
          error: null,
          results: result.results,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * Irreversibly clears the chosen parts of the instance. Requires the caller's password
   * and the instance's own name typed back, so neither a stray click nor a forged
   * cross-site request can trigger it.
   */
  app.post(
    "/super-admin/reset",
    [validatedRequest, superAdminOnly()],
    async (request, response) => {
      try {
        const actor = await userFromSession(request, response);
        const { scopes = [], password, confirmation } = reqBody(request);

        const reauth = await reauthenticate(actor, password);
        if (!reauth.valid)
          return response
            .status(200)
            .json({ success: false, error: reauth.error });

        const phrase = await instanceName();
        if (String(confirmation ?? "").trim() !== phrase)
          return response.status(200).json({
            success: false,
            error: `Type "${phrase}" exactly to confirm the reset.`,
          });

        const resolved = SystemReset.resolveScopes(scopes);
        if (resolved.length === 0)
          return response.status(200).json({
            success: false,
            error: "Choose at least one thing to reset.",
          });

        // Logged before the wipe as well as after, because the event log is itself a
        // resettable scope - this line is what survives in the operator's own logs.
        console.log(
          `\x1b[31m[RESET]\x1b[0m "${actor.username}" is resetting: ${resolved.join(", ")}`
        );

        const result = await SystemReset.execute({ scopes: resolved, actor });
        if (!result.success)
          return response
            .status(200)
            .json({ success: false, error: result.error });

        await EventLogs.logEvent(
          "system_reset",
          {
            scopes: result.scopes,
            results: result.results,
            by: actor.username,
          },
          actor.id
        );

        response.status(200).json({
          success: true,
          error: null,
          scopes: result.scopes,
          results: result.results,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );
}

/**
 * The phrase the operator has to type to confirm a reset: the instance's own name, so
 * the confirmation is specific to *this* deployment rather than a word anyone can guess
 * from a screenshot of the dialog.
 * @returns {Promise<string>}
 */
async function instanceName() {
  const custom = await SystemSettings.get({ label: "custom_app_name" });
  return custom?.value?.trim() || "AnythingLLM";
}

module.exports = { superAdminEndpoints };
