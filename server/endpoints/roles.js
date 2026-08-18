const { Role } = require("../models/role");
const { WorkspaceRole } = require("../models/workspaceRole");
const { WorkspaceUser } = require("../models/workspaceUsers");
const { Workspace } = require("../models/workspace");
const { EventLogs } = require("../models/eventLogs");
const { reqBody, userFromSession } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  userPermissionValid,
  workspacePermissionValid,
} = require("../utils/middleware/authorizedRequest");
const {
  SCOPES,
  PERMISSIONS,
  WORKSPACE_PERMISSIONS: WS_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
} = require("../utils/permissions");

/**
 * A role may never grant a permission its author does not already hold, otherwise
 * anyone allowed to manage roles could promote themselves to super-admin.
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {string[]} requestedPermissions
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function canGrantPermissions(request, response, requestedPermissions) {
  const actor = await userFromSession(request, response);
  if (await Role.userCan(actor, PERMISSIONS.SUPER_ADMIN))
    return { valid: true, error: null };

  const held = new Set(await Role.permissionsForUser(actor));
  const overreach = requestedPermissions.filter(
    (permission) => !held.has(permission)
  );
  if (overreach.length > 0)
    return {
      valid: false,
      error: `You cannot grant permissions you do not hold yourself: ${overreach.join(", ")}`,
    };
  return { valid: true, error: null };
}

/**
 * The workspace-scope counterpart of `canGrantPermissions`: a role defined inside a
 * workspace may never grant more than its author already holds *in that workspace*,
 * otherwise a workspace manager could mint themselves powers they were not given.
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {number} workspaceId
 * @param {string[]} requestedPermissions
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function canGrantWorkspacePermissions(
  request,
  response,
  workspaceId,
  requestedPermissions
) {
  const actor = await userFromSession(request, response);
  const held = new Set(
    await WorkspaceRole.permissionsForUserInWorkspace(actor, workspaceId)
  );
  const overreach = requestedPermissions.filter(
    (permission) => !held.has(permission)
  );
  if (overreach.length > 0)
    return {
      valid: false,
      error: `You cannot grant permissions you do not hold in this workspace: ${overreach.join(", ")}`,
    };
  return { valid: true, error: null };
}

function roleEndpoints(app) {
  if (!app) return;

  /**
   * The permission catalog, grouped for the management UI. Defaults to the system
   * scope; pass `?scope=workspace` for the permissions a workspace role can grant.
   */
  app.get(
    "/roles/permissions",
    [
      validatedRequest,
      userPermissionValid([
        PERMISSIONS.ROLES_MANAGE,
        PERMISSIONS.WORKSPACE_ROLES_MANAGE,
        PERMISSIONS.USERS_ASSIGN_ROLES,
      ]),
    ],
    async (request, response) => {
      try {
        const scope =
          request.query?.scope === SCOPES.WORKSPACE
            ? SCOPES.WORKSPACE
            : SCOPES.SYSTEM;
        const categories = Object.entries(PERMISSION_CATEGORIES)
          .filter(([, category]) => category.scope === scope)
          .sort(([, a], [, b]) => a.order - b.order)
          .map(([key, category]) => ({
            key,
            label: category.label,
            permissions: PERMISSION_CATALOG.filter(
              (permission) => permission.category === key
            ).sort((a, b) => a.order - b.order),
          }))
          .filter((category) => category.permissions.length > 0);
        response.status(200).json({ scope, categories, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * Roles are readable by anyone who can assign them, since the user edit modal needs
   * the list to populate its dropdown.
   */
  app.get(
    "/roles",
    [
      validatedRequest,
      userPermissionValid([
        PERMISSIONS.ROLES_MANAGE,
        PERMISSIONS.USERS_ASSIGN_ROLES,
        PERMISSIONS.USERS_VIEW,
      ]),
    ],
    async (_request, response) => {
      try {
        const roles = await Role.where();
        const counts = await Role.userCounts();
        response.status(200).json({
          roles: roles.map((role) => ({
            ...role,
            userCount: counts[role.name] ?? 0,
          })),
          error: null,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/roles/new",
    [validatedRequest, userPermissionValid([PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const {
          name,
          displayName,
          description = "",
          permissions = [],
        } = reqBody(request);

        const grantCheck = await canGrantPermissions(
          request,
          response,
          Role.validations.permissions(permissions)
        );
        if (!grantCheck.valid)
          return response
            .status(200)
            .json({ role: null, error: grantCheck.error });

        const { role, error } = await Role.create({
          name,
          displayName,
          description,
          permissions,
        });
        if (role)
          await EventLogs.logEvent(
            "role_created",
            { roleName: role.name, createdBy: response.locals?.user?.username },
            response.locals?.user?.id
          );
        response.status(200).json({ role, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/roles/:id",
    [validatedRequest, userPermissionValid([PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const updates = reqBody(request);

        if (updates.hasOwnProperty("permissions")) {
          const existing = await Role.get({ id: Number(id) });
          if (!existing)
            return response
              .status(200)
              .json({ role: null, error: "Role not found" });

          // Both the newly ticked and the newly unticked boxes have to be within the
          // editor's own reach, so a limited role-manager cannot strip an admin's grants.
          const requested = Role.validations.permissions(updates.permissions);
          const changed = [
            ...requested.filter(
              (permission) => !existing.permissions.includes(permission)
            ),
            ...existing.permissions.filter(
              (permission) => !requested.includes(permission)
            ),
          ];
          const grantCheck = await canGrantPermissions(
            request,
            response,
            changed
          );
          if (!grantCheck.valid)
            return response
              .status(200)
              .json({ role: null, error: grantCheck.error });
        }

        const { role, error } = await Role.update(Number(id), updates);
        if (role)
          await EventLogs.logEvent(
            "role_updated",
            { roleName: role.name, updatedBy: response.locals?.user?.username },
            response.locals?.user?.id
          );
        response.status(200).json({ role, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/roles/:id",
    [validatedRequest, userPermissionValid([PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const existing = await Role.get({ id: Number(id) });
        if (!existing)
          return response
            .status(200)
            .json({ success: false, error: "Role not found" });

        const grantCheck = await canGrantPermissions(
          request,
          response,
          existing.permissions
        );
        if (!grantCheck.valid)
          return response
            .status(200)
            .json({ success: false, error: grantCheck.error });

        const { success, error, reassigned } = await Role.delete(Number(id));
        if (success)
          await EventLogs.logEvent(
            "role_deleted",
            {
              roleName: existing.name,
              reassignedUsers: reassigned,
              deletedBy: response.locals?.user?.username,
            },
            response.locals?.user?.id
          );
        response.status(200).json({ success, error, reassigned });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * The permissions the requesting user holds. The frontend caches this so it can hide
   * controls the user's role does not unlock.
   */
  app.get(
    "/roles/me/permissions",
    [validatedRequest, userPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const role = user?.role ? await Role.get({ name: user.role }) : null;

        // What they can do inside each workspace they can reach, keyed by slug because
        // that is how the client addresses workspaces, so it can gate workspace
        // controls without a round trip per workspace.
        const workspacePermissions = {};
        for (const workspace of await Workspace.whereWithUser(user)) {
          workspacePermissions[workspace.slug] =
            await WorkspaceRole.permissionsForUserInWorkspace(
              user,
              workspace.id
            );
        }

        response.status(200).json({
          permissions: await Role.permissionsForUser(user),
          workspacePermissions,
          role: user?.role ?? null,
          roleDisplayName: role?.displayName ?? user?.role ?? null,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  // ------------------------------------------------------------ workspace roles

  /**
   * The reusable workspace roles. Readable by anyone who can assign them, since the
   * workspace members table needs the list to populate its dropdown.
   */
  app.get(
    "/workspace-roles",
    [
      validatedRequest,
      userPermissionValid([
        PERMISSIONS.WORKSPACE_ROLES_MANAGE,
        PERMISSIONS.WORKSPACES_VIEW_ALL,
        PERMISSIONS.WORKSPACES_MANAGE_ALL,
        PERMISSIONS.USERS_VIEW,
      ]),
    ],
    async (_request, response) => {
      try {
        const roles = await WorkspaceRole.where();
        const counts = await WorkspaceRole.memberCounts();
        response.status(200).json({
          roles: roles.map((role) => ({
            ...role,
            memberCount: counts[role.id] ?? 0,
          })),
          error: null,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace-roles/new",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.WORKSPACE_ROLES_MANAGE]),
    ],
    async (request, response) => {
      try {
        const {
          name,
          displayName,
          description = "",
          permissions = [],
        } = reqBody(request);
        const { role, error } = await WorkspaceRole.create({
          name,
          displayName,
          description,
          permissions,
        });
        if (role)
          await EventLogs.logEvent(
            "workspace_role_created",
            { roleName: role.name, createdBy: response.locals?.user?.username },
            response.locals?.user?.id
          );
        response.status(200).json({ role, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace-roles/:id",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.WORKSPACE_ROLES_MANAGE]),
    ],
    async (request, response) => {
      try {
        const { role, error } = await WorkspaceRole.update(
          Number(request.params.id),
          reqBody(request)
        );
        if (role)
          await EventLogs.logEvent(
            "workspace_role_updated",
            { roleName: role.name, updatedBy: response.locals?.user?.username },
            response.locals?.user?.id
          );
        response.status(200).json({ role, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace-roles/:id",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.WORKSPACE_ROLES_MANAGE]),
    ],
    async (request, response) => {
      try {
        const existing = await WorkspaceRole.get({
          id: Number(request.params.id),
        });
        if (!existing)
          return response
            .status(200)
            .json({ success: false, error: "Role not found" });

        const { success, error, reassigned } = await WorkspaceRole.delete(
          Number(request.params.id)
        );
        if (success)
          await EventLogs.logEvent(
            "workspace_role_deleted",
            {
              roleName: existing.name,
              reassignedMembers: reassigned,
              deletedBy: response.locals?.user?.username,
            },
            response.locals?.user?.id
          );
        response.status(200).json({ success, error, reassigned });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * Sets the workspace role one member holds in one workspace. Gated on managing
   * members *of that workspace*, so a workspace manager can run their own membership
   * without any instance-wide power.
   */
  app.post(
    "/workspace/:slug/members/:userId/role",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.MEMBERS_MANAGE]),
    ],
    async (request, response) => {
      try {
        const { userId } = request.params;
        const { workspaceRoleId } = reqBody(request);
        const workspace = response.locals.workspace;

        const { success, error } = await WorkspaceUser.setRole(
          Number(userId),
          workspace.id,
          Number(workspaceRoleId)
        );
        if (success)
          await EventLogs.logEvent(
            "workspace_member_role_changed",
            {
              workspace: workspace.slug,
              userId: Number(userId),
              changedBy: response.locals?.user?.username,
            },
            response.locals?.user?.id
          );
        response.status(200).json({ success, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /**
   * The roles assignable inside one workspace - the shared ones plus any this workspace
   * defined for itself - along with the workspace-scope catalog to tick from.
   */
  app.get(
    "/workspace/:slug/roles",
    [
      validatedRequest,
      workspacePermissionValid([
        WS_PERMISSIONS.ROLES_MANAGE,
        WS_PERMISSIONS.MEMBERS_MANAGE,
      ]),
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const roles = await WorkspaceRole.availableFor(workspace.id);
        const counts = await WorkspaceRole.memberCounts();
        response.status(200).json({
          roles: roles.map((role) => ({
            ...role,
            memberCount: counts[role.id] ?? 0,
            // Shared roles are defined instance-wide, so this workspace may assign
            // them but never edit them.
            editableHere: role.workspace_id === workspace.id,
          })),
          canDefineRoles: await WorkspaceRole.userCanInWorkspace(
            await userFromSession(request, response),
            workspace.id,
            WS_PERMISSIONS.ROLES_MANAGE
          ),
          error: null,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/roles/new",
    [validatedRequest, workspacePermissionValid([WS_PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const {
          name,
          displayName,
          description = "",
          permissions = [],
        } = reqBody(request);

        const grantCheck = await canGrantWorkspacePermissions(
          request,
          response,
          workspace.id,
          WorkspaceRole.validations.permissions(permissions)
        );
        if (!grantCheck.valid)
          return response
            .status(200)
            .json({ role: null, error: grantCheck.error });

        const { role, error } = await WorkspaceRole.create({
          name,
          displayName,
          description,
          permissions,
          workspaceId: workspace.id,
        });
        if (role)
          await EventLogs.logEvent(
            "workspace_role_created",
            {
              roleName: role.name,
              workspace: workspace.slug,
              createdBy: response.locals?.user?.username,
            },
            response.locals?.user?.id
          );
        response.status(200).json({ role, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/roles/:id",
    [validatedRequest, workspacePermissionValid([WS_PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const updates = reqBody(request);

        if (updates.hasOwnProperty("permissions")) {
          const grantCheck = await canGrantWorkspacePermissions(
            request,
            response,
            workspace.id,
            WorkspaceRole.validations.permissions(updates.permissions)
          );
          if (!grantCheck.valid)
            return response
              .status(200)
              .json({ role: null, error: grantCheck.error });
        }
        // Promoting a role to the instance-wide default is not a workspace decision.
        delete updates.isDefault;

        const { role, error } = await WorkspaceRole.update(
          Number(request.params.id),
          updates,
          workspace.id
        );
        response.status(200).json({ role, error });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/roles/:id",
    [validatedRequest, workspacePermissionValid([WS_PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const { success, error, reassigned } = await WorkspaceRole.delete(
          Number(request.params.id),
          response.locals.workspace.id
        );
        response.status(200).json({ success, error, reassigned });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );

  /** The members of a workspace along with the workspace role each one holds. */
  app.get(
    "/workspace/:slug/members",
    [
      validatedRequest,
      workspacePermissionValid([WS_PERMISSIONS.MEMBERS_MANAGE]),
    ],
    async (_request, response) => {
      try {
        const members = await WorkspaceUser.membersWithRoles(
          response.locals.workspace.id
        );
        response.status(200).json({ members, error: null });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );
}

module.exports = { roleEndpoints, canGrantPermissions };
