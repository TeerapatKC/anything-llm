const { ApiKey } = require("../models/apiKeys");
const { BrowserExtensionApiKey } = require("../models/browserExtensionApiKey");
const { EventLogs } = require("../models/eventLogs");
const { Invite } = require("../models/invite");
const { SystemSettings } = require("../models/systemSettings");
const { User } = require("../models/user");
const { Workspace } = require("../models/workspace");
const { Customer } = require("../models/customer");
const { getEmbeddingEngineSelection } = require("../utils/helpers");
const {
  validRoleSelection,
  canModifyAdmin,
  validCanModify,
} = require("../utils/helpers/admin");
const { reqBody, userFromSession, safeJsonParse } = require("../utils/http");
const {
  strictMultiUserRoleValid,
  flexUserRoleValid,
  isCustomerAdmin,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const ImportedPlugin = require("../utils/agents/imported");
const {
  simpleSSOLoginDisabledMiddleware,
} = require("../utils/middleware/simpleSSOEnabled");
const {
  workspaceDeletionProtection,
} = require("../utils/middleware/workspaceDeletionProtection");
const {
  customerScopedWorkspace,
  customerScopedUser,
} = require("../utils/middleware/customerScoped");

function adminEndpoints(app) {
  if (!app) return;

  app.get(
    "/admin/users",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
    ],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const clause = isCustomerAdmin(currUser)
          ? { customer_id: currUser.customer_id }
          : {};
        const users = await User.where(clause);
        response.status(200).json({ users });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/users/new",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
    ],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const newUserParams = reqBody(request);
        const roleValidation = validRoleSelection(currUser, newUserParams);

        if (!roleValidation.valid) {
          response
            .status(200)
            .json({ user: null, error: roleValidation.error });
          return;
        }

        // A Customer Admin's new user always lands in their own customer -
        // never client-supplied, mirroring how the workspace_role_id/role
        // fields are already forced elsewhere in this file.
        if (isCustomerAdmin(currUser)) newUserParams.customer_id = currUser.customer_id;

        // The old frontend lets the operator type a password directly; the new
        // frontend sends none and expects the server to generate one, handed
        // back once as `initialPassword` for the operator to relay out-of-band.
        const crypto = require("crypto");
        const generatedPassword = !newUserParams.password
          ? crypto.randomBytes(12).toString("base64url")
          : null;

        // Admin is setting the initial password on this account's behalf -
        // require it be changed on first login. (Not forced for self-service
        // invite signups, where the user already picked their own password.)
        const { user: newUser, error } = await User.create({
          ...newUserParams,
          password: generatedPassword || newUserParams.password,
          mustResetPassword: true,
        });
        if (!!newUser) {
          await EventLogs.logEvent(
            "user_created",
            {
              userName: newUser.username,
              createdBy: currUser.username,
            },
            currUser.id
          );
        }

        response.status(200).json({
          user: newUser,
          error,
          initialPassword: newUser && generatedPassword ? generatedPassword : null,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/user/:id",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
      customerScopedUser(),
    ],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const { id } = request.params;
        const updates = reqBody(request);
        // customer_id is never reassignable through this generic-update
        // endpoint - moving a user between customers is a bigger operation
        // than this route is meant for, and a Customer Admin must never be
        // able to smuggle themselves/another user into a different customer.
        delete updates.customer_id;
        const user = response.locals?.targetUser ?? (await User.get({ id: Number(id) }));
        if (!user) {
          response.status(404).json({ success: false, error: "User not found." });
          return;
        }

        const canModify = validCanModify(currUser, user);
        if (!canModify.valid) {
          response.status(200).json({ success: false, error: canModify.error });
          return;
        }

        const roleValidation = validRoleSelection(currUser, updates);
        if (!roleValidation.valid) {
          response
            .status(200)
            .json({ success: false, error: roleValidation.error });
          return;
        }

        const validAdminRoleModification = await canModifyAdmin(user, updates);
        if (!validAdminRoleModification.valid) {
          response
            .status(200)
            .json({ success: false, error: validAdminRoleModification.error });
          return;
        }

        const { success, error } = await User.update(id, updates);
        response.status(200).json({ success, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  // Dedicated path a newer upstream frontend branch (feat/shadcn-migration)
  // uses for "generate a new password for this user" (distinct from
  // POST /admin/user/:id, which requires the caller to supply the new
  // password). Generates one server-side and returns it so the operator can
  // hand it to the user out-of-band, then forces a change on next login -
  // same mustResetPassword contract as admin-created accounts.
  app.post(
    "/admin/user/:userId/reset-password",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
      customerScopedUser(),
    ],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const { userId } = request.params;
        const user = response.locals?.targetUser ?? (await User.get({ id: Number(userId) }));
        if (!user) {
          response.status(404).json({ success: false, error: "User not found." });
          return;
        }

        const canModify = validCanModify(currUser, user);
        if (!canModify.valid) {
          response.status(200).json({ success: false, error: canModify.error });
          return;
        }

        const crypto = require("crypto");
        const newPassword = crypto.randomBytes(12).toString("base64url");
        const { success, error } = await User.update(userId, { password: newPassword });
        if (!success) {
          response.status(200).json({ success: false, error });
          return;
        }
        // User.update always clears mustResetPassword on a password change -
        // re-set it here since this password is server-generated and unknown
        // to the user until the operator hands it over.
        await User._update(Number(userId), { mustResetPassword: true });

        response.status(200).json({ success: true, password: newPassword, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/admin/user/:id",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
      customerScopedUser(),
    ],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const { id } = request.params;
        const user = response.locals?.targetUser ?? (await User.get({ id: Number(id) }));
        if (!user) {
          response.status(404).json({ success: false, error: "User not found." });
          return;
        }

        const canModify = validCanModify(currUser, user);
        if (!canModify.valid) {
          response.status(200).json({ success: false, error: canModify.error });
          return;
        }

        // A delete is an implicit "role removed" - canModifyAdmin's lockout
        // check (last instance admin / last customer_admin for a customer)
        // needs to see it that way. Pre-existing gap: this route never called
        // canModifyAdmin at all, so the lockout guard tested below for
        // customer_admin was silently unenforced for every role, including
        // the original instance-admin case it was written for.
        const roleRemoval = await canModifyAdmin(user, { role: "default" });
        if (!roleRemoval.valid) {
          response.status(200).json({ success: false, error: roleRemoval.error });
          return;
        }

        await BrowserExtensionApiKey.deleteAllForUser(Number(id));
        await User.delete({ id: Number(id) });
        await EventLogs.logEvent(
          "user_deleted",
          {
            userName: user.username,
            deletedBy: currUser.username,
          },
          currUser.id
        );
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/admin/invites",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
    ],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const clause = isCustomerAdmin(currUser)
          ? { customer_id: currUser.customer_id }
          : {};
        const invites = await Invite.whereWithUsers(clause);
        response.status(200).json({ invites });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/invite/new",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
      simpleSSOLoginDisabledMiddleware,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const body = reqBody(request);
        let workspaceIds = body?.workspaceIds || [];

        // A Customer Admin's invite is stamped with their own customer and
        // may only reach workspaces that customer actually owns - even if the
        // request body asked for a foreign workspace id.
        const customerId = isCustomerAdmin(user) ? user.customer_id : null;
        if (customerId) {
          const ownWorkspaces = await Workspace.where({ customer_id: customerId });
          const ownIds = new Set(ownWorkspaces.map((ws) => ws.id));
          workspaceIds = workspaceIds.filter((id) => ownIds.has(Number(id)));
        }

        const { invite, error } = await Invite.create({
          createdByUserId: user.id,
          workspaceIds,
          customer_id: customerId,
        });

        await EventLogs.logEvent(
          "invite_created",
          {
            inviteCode: invite.code,
            createdBy: response.locals?.user?.username,
          },
          response.locals?.user?.id
        );
        response.status(200).json({ invite, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/admin/invite/:id",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
    ],
    async (request, response) => {
      try {
        const { id } = request.params;
        const currUser = await userFromSession(request, response);
        if (isCustomerAdmin(currUser)) {
          const invite = await Invite.get({ id: Number(id) });
          if (!invite || invite.customer_id !== currUser.customer_id)
            return response.status(404).json({ error: "Invite does not exist." });
        }

        const { success, error } = await Invite.deactivate(id);
        await EventLogs.logEvent(
          "invite_deleted",
          { deletedBy: response.locals?.user?.username },
          response.locals?.user?.id
        );
        response.status(200).json({ success, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/admin/workspaces",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
    ],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const clause = isCustomerAdmin(currUser)
          ? { customer_id: currUser.customer_id }
          : {};
        const workspaces = await Workspace.whereWithUsers(clause);
        response.status(200).json({ workspaces });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/admin/workspaces/:workspaceId/users",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
      customerScopedWorkspace(),
    ],
    async (request, response) => {
      try {
        const { workspaceId } = request.params;
        const users = await Workspace.workspaceUsers(workspaceId);
        response.status(200).json({ users });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/workspaces/new",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name } = reqBody(request);
        const { workspace, message: error } = await Workspace.new(
          name,
          user.id,
          {},
          isCustomerAdmin(user) ? user.customer_id : null
        );
        response.status(200).json({ workspace, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/workspaces/:workspaceId/update-users",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
      customerScopedWorkspace(),
    ],
    async (request, response) => {
      try {
        const { workspaceId } = request.params;
        const currUser = await userFromSession(request, response);
        let { userIds } = reqBody(request);

        // A Customer Admin can only place their own customer's users into
        // their own customer's workspace - even if the request body asked
        // for a foreign/platform user id.
        if (isCustomerAdmin(currUser)) {
          const ownUsers = await User.where({ customer_id: currUser.customer_id });
          const ownIds = new Set(ownUsers.map((u) => u.id));
          userIds = (userIds || []).filter((id) => ownIds.has(Number(id)));
        }

        const { success, error } = await Workspace.updateUsers(
          workspaceId,
          userIds
        );
        response.status(200).json({ success, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  // Archives the workspace (soft-delete), consistent with DELETE
  // /workspace/:slug - this is just another surface for the same "delete
  // workspace" action, and having two delete buttons in the product behave
  // differently (one reversible, one not) is exactly the kind of
  // inconsistency that catches an admin off guard. The permanent, irreversible
  // version lives at DELETE /workspace/:slug/purge (still instance-admin only
  // + workspaceDeletionProtection-gated).
  app.delete(
    "/admin/workspaces/:id",
    [
      validatedRequest,
      strictMultiUserRoleValid([ROLES.admin, ROLES.manager, ROLES.customer_admin]),
      customerScopedWorkspace(),
      workspaceDeletionProtection,
    ],
    async (request, response) => {
      try {
        const { id } = request.params;
        const workspace = response.locals?.workspace ?? (await Workspace.get({ id: Number(id) }));
        if (!workspace) {
          response.sendStatus(404).end();
          return;
        }

        const user = await userFromSession(request, response);
        const { workspace: archived, message } = await Workspace.archive(
          workspace.id,
          user?.id
        );
        if (!archived)
          return response.status(500).json({ success: false, error: message });
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  // Customer/Tenant management (V.1.5 Hosted Customer Trial) - Platform-Admin
  // only throughout. A customer_admin never reaches these; they manage their
  // own customer's workspaces/users/invites through the routes above instead,
  // never the customer record itself.
  app.get(
    "/admin/customers",
    [validatedRequest, strictMultiUserRoleValid([ROLES.admin, ROLES.manager])],
    async (_request, response) => {
      try {
        const customers = await Customer.where({}, null, { createdAt: "desc" });
        response.status(200).json({ customers });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/customers/new",
    [validatedRequest, strictMultiUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { name, trialExpiresAt } = reqBody(request);
        const { customer, message: error } = await Customer.new(name, trialExpiresAt);
        if (customer) {
          await EventLogs.logEvent(
            "customer_created",
            { customerName: customer.name, createdBy: response.locals?.user?.username },
            response.locals?.user?.id
          );
        }
        response.status(200).json({ customer, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/customers/:id",
    [validatedRequest, strictMultiUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const updates = reqBody(request);
        const { customer, message: error } = await Customer.update(id, updates);
        response.status(200).json({ customer, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/customers/:id/archive",
    [validatedRequest, strictMultiUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const user = await userFromSession(request, response);
        const { customer, message: error } = await Customer.archive(id, user?.id);
        response.status(200).json({ customer, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/customers/:id/restore",
    [validatedRequest, strictMultiUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const user = await userFromSession(request, response);
        const { customer, message: error } = await Customer.restore(id, user?.id);
        response.status(200).json({ customer, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  // System preferences but only by array of labels
  app.get(
    "/admin/system-preferences-for",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const requestedSettings = {};
        const labels = request.query.labels?.split(",") || [];
        const needEmbedder = [
          "text_splitter_chunk_size",
          "max_embed_chunk_size",
        ];
        const noRecord = [
          "max_embed_chunk_size",
          "agent_sql_connections",
          "imported_agent_skills",
          "feature_flags",
          "meta_page_title",
          "meta_page_favicon",
        ];

        // Managers can only read a limited set of settings (centralized in
        // SystemSettings.managerAllowedFields so the read/write sides can't drift).
        // These match the ManagerRoute pages in the frontend.
        const managerAllowedFields = SystemSettings.managerAllowedFields;

        for (const label of labels) {
          // Skip any settings that are not explicitly defined as public
          if (!SystemSettings.publicFields.includes(label)) continue;

          // Managers can only read manager-allowed fields
          if (
            user?.role === ROLES.manager &&
            !managerAllowedFields.includes(label)
          )
            continue;

          // Only get the embedder if the setting actually needs it
          let embedder = needEmbedder.includes(label)
            ? getEmbeddingEngineSelection()
            : null;
          // Only get the record from db if the setting actually needs it
          let setting = noRecord.includes(label)
            ? null
            : await SystemSettings.get({ label });

          switch (label) {
            case "footer_data":
              requestedSettings[label] = setting?.value ?? JSON.stringify([]);
              break;
            case "support_email":
              requestedSettings[label] = setting?.value || null;
              break;
            case "text_splitter_chunk_size":
              requestedSettings[label] =
                setting?.value || embedder?.embeddingMaxChunkLength || null;
              break;
            case "text_splitter_chunk_overlap":
              requestedSettings[label] = setting?.value || null;
              break;
            case "max_embed_chunk_size":
              requestedSettings[label] =
                embedder?.embeddingMaxChunkLength || 1000;
              break;
            case "agent_search_provider":
              requestedSettings[label] = setting?.value || null;
              break;
            case "agent_sql_connections":
              requestedSettings[label] =
                await SystemSettings.agent_sql_connections();
              break;
            case "default_agent_skills":
              requestedSettings[label] = safeJsonParse(setting?.value, []);
              break;
            case "disabled_agent_skills":
              requestedSettings[label] = safeJsonParse(setting?.value, []);
              break;
            case "disabled_filesystem_skills":
              requestedSettings[label] = safeJsonParse(setting?.value, []);
              break;
            case "disabled_create_files_skills":
              requestedSettings[label] = safeJsonParse(setting?.value, []);
              break;
            case "disabled_gmail_skills":
              requestedSettings[label] = safeJsonParse(setting?.value, []);
              break;
            case "disabled_outlook_skills":
              requestedSettings[label] = safeJsonParse(setting?.value, []);
              break;
            case "imported_agent_skills":
              requestedSettings[label] = ImportedPlugin.listImportedPlugins();
              break;
            case "custom_app_name":
              requestedSettings[label] = setting?.value || null;
              break;
            case "feature_flags":
              requestedSettings[label] =
                (await SystemSettings.getFeatureFlags()) || {};
              break;
            case "meta_page_title":
              requestedSettings[label] =
                await SystemSettings.getValueOrFallback({ label }, null);
              break;
            case "meta_page_favicon":
              requestedSettings[label] =
                await SystemSettings.getValueOrFallback({ label }, null);
              break;
            case "memory_enabled":
              requestedSettings[label] = setting?.value || "false";
              break;
            case "memory_auto_extraction":
              requestedSettings[label] = setting?.value ?? "true";
              break;
            default:
              break;
          }
        }

        response.status(200).json({ settings: requestedSettings });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/system-preferences",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        let updates = reqBody(request);

        // Managers can only update a limited set of settings.
        // These match the ManagerRoute pages in the frontend.
        // Admin users can update all supportedFields without restriction.
        if (user?.role === ROLES.manager) {
          const filteredUpdates = {};
          for (const key of Object.keys(updates)) {
            if (SystemSettings.managerAllowedFields.includes(key)) {
              filteredUpdates[key] = updates[key];
            }
          }
          updates = filteredUpdates;
        }

        await SystemSettings.updateSettings(updates);
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/admin/api-keys",
    [validatedRequest, strictMultiUserRoleValid([ROLES.admin])],
    async (_request, response) => {
      try {
        const apiKeys = await ApiKey.whereWithUser({});
        return response.status(200).json({
          apiKeys,
          error: null,
        });
      } catch (error) {
        console.error(error);
        response.status(500).json({
          apiKey: null,
          error: "Could not find an API Keys.",
        });
      }
    }
  );

  app.post(
    "/admin/generate-api-key",
    [validatedRequest, strictMultiUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name = null } = reqBody(request);
        const { apiKey, error } = await ApiKey.create(user.id, name);
        await EventLogs.logEvent(
          "api_key_created",
          { createdBy: user?.username, name: apiKey?.name },
          user?.id
        );
        return response.status(200).json({
          apiKey,
          error,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/admin/delete-api-key/:id",
    [validatedRequest, strictMultiUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { id } = request.params;
        if (!id || isNaN(Number(id))) return response.sendStatus(400).end();
        await ApiKey.delete({ id: Number(id) });

        await EventLogs.logEvent(
          "api_key_deleted",
          { deletedBy: response.locals?.user?.username },
          response?.locals?.user?.id
        );
        return response.status(200).end();
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );
}

module.exports = { adminEndpoints };
