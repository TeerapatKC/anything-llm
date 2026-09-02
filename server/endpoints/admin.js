const { ApiKey } = require("../models/apiKeys");
const { BrowserExtensionApiKey } = require("../models/browserExtensionApiKey");
const { Document } = require("../models/documents");
const { EventLogs } = require("../models/eventLogs");
const { Invite } = require("../models/invite");
const { sendWelcomeEmail, sendInviteEmail } = require("../utils/smtp");
const { SystemSettings } = require("../models/systemSettings");
const { User } = require("../models/user");
const { DocumentVectors } = require("../models/vectors");
const { Workspace } = require("../models/workspace");
const { WorkspaceChats } = require("../models/workspaceChats");
const {
  getVectorDbClass,
  getEmbeddingEngineSelection,
} = require("../utils/helpers");
const {
  validRoleSelection,
  canModifyAdmin,
  validCanModify,
} = require("../utils/helpers/admin");
const { reqBody, userFromSession, safeJsonParse } = require("../utils/http");
const {
  userPermissionValid,
  workspacePermissionValid,
} = require("../utils/middleware/authorizedRequest");
const {
  PERMISSIONS,
  SETTINGS_ROUTE_PERMISSIONS,
  permissionForSetting,
  WORKSPACE_PERMISSIONS: WS_PERMISSIONS,
} = require("../utils/permissions");
const { Role } = require("../models/role");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  generateInitialPassword,
} = require("../utils/PasswordRecovery/generatePassword");
const { PasswordResetToken } = require("../models/passwordRecovery");
const ImportedPlugin = require("../utils/agents/imported");
const {
  simpleSSOLoginDisabledMiddleware,
} = require("../utils/middleware/simpleSSOEnabled");
const {
  workspaceDeletionProtection,
} = require("../utils/middleware/workspaceDeletionProtection");

/**
 * Builds a predicate that answers whether a user may read or write a given system
 * setting label, based on the permissions their role grants.
 * @param {import("express").Response} _response
 * @param {{role?: string}|null} user
 * @returns {Promise<(label: string) => boolean>}
 */
async function settingPermissionChecker(_response, user) {
  const granted = new Set(await Role.permissionsForUser(user));
  return (label) => granted.has(permissionForSetting(label));
}

function adminEndpoints(app) {
  if (!app) return;

  app.get(
    "/admin/users",
    [validatedRequest, userPermissionValid([PERMISSIONS.USERS_VIEW])],
    async (_request, response) => {
      try {
        const users = await User.where();
        response.status(200).json({ users });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/users/new",
    [validatedRequest, userPermissionValid([PERMISSIONS.USERS_CREATE])],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const newUserParams = reqBody(request);
        const roleValidation = await validRoleSelection(
          currUser,
          newUserParams
        );

        if (!roleValidation.valid) {
          response
            .status(200)
            .json({ user: null, error: roleValidation.error });
          return;
        }

        // Admins never pick the password - we generate one, hand back the plaintext
        // exactly once, and force the user to replace it on their first login.
        const initialPassword = generateInitialPassword();
        const { user: newUser, error } = await User.create({
          ...newUserParams,
          password: initialPassword,
          requiresPasswordChange: true,
        });
        let emailSent = false;
        if (!!newUser) {
          await EventLogs.logEvent(
            "user_created",
            {
              userName: newUser.username,
              createdBy: currUser.username,
            },
            currUser.id
          );

          if (newUser.email) {
            const { origin } = newUserParams;
            const { sent } = await sendWelcomeEmail({
              to: newUser.email,
              username: newUser.username,
              password: initialPassword,
              loginUrl: typeof origin === "string" ? origin : "",
            });
            emailSent = sent;
          }
        }

        response.status(200).json({
          user: newUser,
          error,
          initialPassword: !!newUser ? initialPassword : null,
          emailSent,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/admin/user/:id",
    // `users.edit` covers the profile fields; changing the role additionally needs
    // `users.assign_roles` and suspending needs `users.suspend`, both checked below.
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_SUSPEND]),
    ],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const { id } = request.params;
        const updates = reqBody(request);
        const user = await User.get({ id: Number(id) });

        // Editing a user can no longer set a password directly - admins use the
        // reset-password route below, which generates one and forces a change on login.
        delete updates.password;

        const canModify = await validCanModify(currUser, user);
        if (!canModify.valid) {
          response.status(200).json({ success: false, error: canModify.error });
          return;
        }

        const roleValidation = await validRoleSelection(
          currUser,
          updates,
          user
        );
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

  // Replaces the "I forgot my password" self-service flow: an admin generates a new
  // password for the account, reads it out to the user, and the user is forced to
  // replace it the moment they log back in.
  app.post(
    "/admin/user/:id/reset-password",
    [validatedRequest, userPermissionValid([PERMISSIONS.USERS_RESET_PASSWORD])],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const { id } = request.params;
        const user = await User.get({ id: Number(id) });
        if (!user) {
          response
            .status(200)
            .json({ success: false, error: "User not found." });
          return;
        }

        const canModify = await validCanModify(currUser, user);
        if (!canModify.valid) {
          response.status(200).json({ success: false, error: canModify.error });
          return;
        }

        const { password, error } = await User.resetPasswordToGenerated(
          user.id
        );
        if (!password) {
          response.status(200).json({
            success: false,
            error: error || "Failed to reset password.",
          });
          return;
        }

        // Any outstanding reset tokens are meaningless now that the password moved.
        await PasswordResetToken.deleteMany({ user_id: user.id });
        await EventLogs.logEvent(
          "user_password_reset",
          {
            userName: user.username,
            resetBy: currUser.username,
          },
          currUser.id
        );

        response.status(200).json({ success: true, error: null, password });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/admin/user/:id",
    [validatedRequest, userPermissionValid([PERMISSIONS.USERS_DELETE])],
    async (request, response) => {
      try {
        const currUser = await userFromSession(request, response);
        const { id } = request.params;
        const user = await User.get({ id: Number(id) });
        if (!user) {
          response
            .status(200)
            .json({ success: false, error: "User not found" });
          return;
        }

        const canModify = await validCanModify(currUser, user);
        if (!canModify.valid) {
          response.status(200).json({ success: false, error: canModify.error });
          return;
        }

        // Checked before any of the side effects below. `validCanModify` lets the owner
        // act on their own account so they can edit their profile, but deleting it would
        // orphan the instance - and the model refuses it, so without this the request
        // would strip their extension keys and then report a success that never happened.
        if (Role.isSuperAdmin(user)) {
          response.status(200).json({
            success: false,
            error:
              "The super admin account cannot be deleted. Transfer ownership first.",
          });
          return;
        }

        await BrowserExtensionApiKey.deleteAllForUser(Number(id));
        const deleted = await User.delete({ id: Number(id) });
        if (!deleted) {
          response
            .status(200)
            .json({ success: false, error: "Failed to delete the user." });
          return;
        }

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
    [validatedRequest, userPermissionValid([PERMISSIONS.INVITES_MANAGE])],
    async (_request, response) => {
      try {
        const invites = await Invite.whereWithUsers();
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
      userPermissionValid([PERMISSIONS.INVITES_CREATE]),
      simpleSSOLoginDisabledMiddleware,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const body = reqBody(request);
        const email =
          typeof body?.email === "string" ? body.email.trim() : "";
        if (email && !User.emailRegex.test(email)) {
          response
            .status(200)
            .json({ invite: null, error: "That is not a valid email address." });
          return;
        }

        const { invite, error } = await Invite.create({
          createdByUserId: user.id,
          workspaceIds: body?.workspaceIds || [],
          email,
        });

        let emailSent = false;
        let emailReason = null;
        if (!!invite && email) {
          const origin =
            typeof body?.origin === "string" ? body.origin : "";
          const { sent, reason } = await sendInviteEmail({
            to: email,
            inviteUrl: `${origin}/accept-invite/${invite.code}`,
          });
          emailSent = sent;
          emailReason = reason;
        }

        await EventLogs.logEvent(
          "invite_created",
          {
            inviteCode: invite.code,
            createdBy: response.locals?.user?.username,
            email: email || null,
            emailSent,
          },
          response.locals?.user?.id
        );
        response.status(200).json({ invite, error, emailSent, emailReason });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/admin/invite/:id",
    [validatedRequest, userPermissionValid([PERMISSIONS.INVITES_DELETE])],
    async (request, response) => {
      try {
        const { id } = request.params;
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
    [validatedRequest, userPermissionValid([PERMISSIONS.WORKSPACES_VIEW_ALL])],
    async (_request, response) => {
      try {
        const workspaces = await Workspace.whereWithUsers();
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
      workspacePermissionValid([WS_PERMISSIONS.MEMBERS_MANAGE]),
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
    [validatedRequest, userPermissionValid([PERMISSIONS.WORKSPACES_CREATE])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name } = reqBody(request);
        const { workspace, message: error } = await Workspace.new(
          name,
          user.id
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
      workspacePermissionValid([WS_PERMISSIONS.MEMBERS_MANAGE]),
    ],
    async (request, response) => {
      try {
        const { workspaceId } = request.params;
        const { userIds } = reqBody(request);
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

  app.delete(
    "/admin/workspaces/:id",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.DELETE]),
      workspaceDeletionProtection,
    ],
    async (request, response) => {
      try {
        const { id } = request.params;
        const VectorDb = getVectorDbClass();
        const workspace = await Workspace.get({ id: Number(id) });
        if (!workspace) {
          response.sendStatus(404).end();
          return;
        }

        await WorkspaceChats.delete({ workspaceId: Number(workspace.id) });
        await DocumentVectors.deleteForWorkspace(Number(workspace.id));
        await Document.delete({ workspaceId: Number(workspace.id) });
        await Workspace.delete({ id: Number(workspace.id) });
        try {
          await VectorDb["delete-namespace"]({ namespace: workspace.slug });
        } catch (e) {
          console.error(e.message);
        }

        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  // System preferences but only by array of labels
  app.get(
    "/admin/system-preferences-for",
    [validatedRequest, userPermissionValid(SETTINGS_ROUTE_PERMISSIONS)],
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

        // Each setting is gated by its own permission, so a caller only ever sees the
        // settings their role was ticked for.
        const canRead = await settingPermissionChecker(response, user);

        for (const label of labels) {
          // Skip any settings that are not explicitly defined as public
          if (!SystemSettings.publicFields.includes(label)) continue;

          // Skip settings this user's role was not granted
          if (!canRead(label)) continue;

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
    [validatedRequest, userPermissionValid(SETTINGS_ROUTE_PERMISSIONS)],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const updates = reqBody(request);

        // Drop any setting the caller's role was not granted permission over, so a role
        // with only `system.appearance` cannot slip an LLM key change into the payload.
        const canWrite = await settingPermissionChecker(response, user);
        const permittedUpdates = {};
        for (const key of Object.keys(updates)) {
          if (!canWrite(key)) continue;
          permittedUpdates[key] = updates[key];
        }

        await SystemSettings.updateSettings(permittedUpdates);
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/admin/api-keys",
    [validatedRequest, userPermissionValid([PERMISSIONS.SYSTEM_API_KEYS])],
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
    [validatedRequest, userPermissionValid([PERMISSIONS.SYSTEM_API_KEYS])],
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
    [validatedRequest, userPermissionValid([PERMISSIONS.SYSTEM_API_KEYS])],
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
