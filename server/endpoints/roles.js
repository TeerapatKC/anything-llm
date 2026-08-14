const { Role } = require("../models/role");
const { EventLogs } = require("../models/eventLogs");
const { reqBody, userFromSession, multiUserMode } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserPermissionValid,
} = require("../utils/middleware/multiUserProtected");
const {
  PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  ALL_PERMISSION_KEYS,
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
  if (!multiUserMode(response)) return { valid: true, error: null };
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

function roleEndpoints(app) {
  if (!app) return;

  /** The permission catalog, grouped for the management UI. */
  app.get(
    "/roles/permissions",
    [
      validatedRequest,
      flexUserPermissionValid([
        PERMISSIONS.ROLES_MANAGE,
        PERMISSIONS.USERS_ASSIGN_ROLES,
      ]),
    ],
    async (_request, response) => {
      try {
        const categories = Object.entries(PERMISSION_CATEGORIES)
          .sort(([, a], [, b]) => a.order - b.order)
          .map(([key, category]) => ({
            key,
            label: category.label,
            permissions: PERMISSION_CATALOG.filter(
              (permission) => permission.category === key
            ).sort((a, b) => a.order - b.order),
          }))
          .filter((category) => category.permissions.length > 0);
        response.status(200).json({ categories, error: null });
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
      flexUserPermissionValid([
        PERMISSIONS.ROLES_MANAGE,
        PERMISSIONS.USERS_ASSIGN_ROLES,
        PERMISSIONS.USERS_VIEW,
        PERMISSIONS.WORKSPACES_MANAGE_MEMBERS,
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
    [validatedRequest, flexUserPermissionValid([PERMISSIONS.ROLES_MANAGE])],
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
    [validatedRequest, flexUserPermissionValid([PERMISSIONS.ROLES_MANAGE])],
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
    [validatedRequest, flexUserPermissionValid([PERMISSIONS.ROLES_MANAGE])],
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
   * controls the user's role does not unlock. Single-user mode has one operator who
   * implicitly holds everything.
   */
  app.get(
    "/roles/me/permissions",
    [validatedRequest, flexUserPermissionValid([PERMISSIONS.ANY])],
    async (request, response) => {
      try {
        if (!multiUserMode(response))
          return response.status(200).json({
            permissions: ALL_PERMISSION_KEYS,
            role: null,
            multiUserMode: false,
          });

        const user = await userFromSession(request, response);
        response.status(200).json({
          permissions: await Role.permissionsForUser(user),
          role: user?.role ?? null,
          multiUserMode: true,
        });
      } catch (e) {
        console.error(e);
        response.sendStatus(500).end();
      }
    }
  );
}

module.exports = { roleEndpoints, canGrantPermissions };
