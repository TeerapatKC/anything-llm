const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { userPermissionValid, workspacePermissionValid } = require("../utils/middleware/authorizedRequest");
const { userFromSession } = require("../utils/http");
const { Role } = require("../models/role");
const { WorkspaceRole } = require("../models/workspaceRole");
const { Workspace } = require("../models/workspace");
const { EventLogs } = require("../models/eventLogs");
const {
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
} = require("../utils/permissions");

/**
 * Prevents privilege escalation via role creation/editing: a caller may only
 * grant permissions they hold themselves. Super-admins bypass (they hold
 * everything already). Not middleware - called inline since it needs the
 * specific permission list being requested, not a fixed one known up front.
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function canGrantPermissions(request, response, requestedPermissions = []) {
  const user = response.locals?.user ?? (await userFromSession(request, response));
  if (await Role.userCan(user, PERMISSIONS.SUPER_ADMIN)) return { valid: true, error: null };

  const held = await Role.permissionsForUser(user);
  const overreach = requestedPermissions.filter((p) => !held.includes(p));
  if (overreach.length > 0)
    return {
      valid: false,
      error: `You cannot grant permissions you do not hold yourself: ${overreach.join(", ")}`,
    };
  return { valid: true, error: null };
}

async function canGrantWorkspacePermissions(request, response, workspaceId, requestedPermissions = []) {
  const user = response.locals?.user ?? (await userFromSession(request, response));
  const held = await WorkspaceRole.permissionsForUserInWorkspace(user, workspaceId);
  const overreach = requestedPermissions.filter((p) => !held.includes(p));
  if (overreach.length > 0)
    return {
      valid: false,
      error: `You cannot grant permissions you do not hold yourself in this workspace: ${overreach.join(", ")}`,
    };
  return { valid: true, error: null };
}

function roleEndpoints(app) {
  if (!app) return;

  app.get(
    "/roles/permissions",
    [
      validatedRequest,
      userPermissionValid([PERMISSIONS.ROLES_MANAGE, PERMISSIONS.WORKSPACE_ROLES_MANAGE, PERMISSIONS.USERS_ASSIGN_ROLES]),
    ],
    async (request, response) => {
      try {
        const scope = request.query.scope === "workspace" ? "workspace" : "system";
        const catalogForScope = PERMISSION_CATALOG.filter((p) => p.scope === scope);
        const categoriesInScope = [
          ...new Set(catalogForScope.map((p) => p.category)),
        ].sort((a, b) => (PERMISSION_CATEGORIES[a]?.order ?? 99) - (PERMISSION_CATEGORIES[b]?.order ?? 99));

        const categories = categoriesInScope.map((key) => ({
          key,
          label: PERMISSION_CATEGORIES[key]?.label ?? key,
          permissions: catalogForScope
            .filter((p) => p.category === key)
            .sort((a, b) => a.order - b.order),
        }));

        response.status(200).json({ scope, categories, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ scope: null, categories: [], error: e.message });
      }
    }
  );

  app.get(
    "/roles",
    [validatedRequest, userPermissionValid([PERMISSIONS.ROLES_MANAGE, PERMISSIONS.USERS_ASSIGN_ROLES, PERMISSIONS.USERS_VIEW])],
    async (_request, response) => {
      try {
        const roles = await Role.where();
        const counts = await Role.userCounts();
        response.status(200).json({
          roles: roles.map((r) => ({ ...r, userCount: counts[r.name] || 0 })),
          error: null,
        });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ roles: [], error: e.message });
      }
    }
  );

  app.post(
    "/roles/new",
    [validatedRequest, userPermissionValid([PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name, displayName, description, permissions = [] } = request.body || {};

        const grantCheck = await canGrantPermissions(request, response, permissions);
        if (!grantCheck.valid) {
          response.status(200).json({ role: null, error: grantCheck.error });
          return;
        }

        const { role, error } = await Role.create({ name, displayName, description, permissions });
        if (role) {
          await EventLogs.logEvent("role_created", { roleName: role.name }, user?.id);
        }
        response.status(error ? 200 : 201).json({ role, error });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ role: null, error: e.message });
      }
    }
  );

  app.post(
    "/roles/:id",
    [validatedRequest, userPermissionValid([PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { id } = request.params;
        const { displayName, description, permissions } = request.body || {};

        if (permissions !== undefined) {
          const grantCheck = await canGrantPermissions(request, response, permissions);
          if (!grantCheck.valid) {
            response.status(200).json({ role: null, error: grantCheck.error });
            return;
          }
        }

        const { role, error } = await Role.update(id, { displayName, description, permissions });
        if (role) await EventLogs.logEvent("role_updated", { roleName: role.name }, user?.id);
        response.status(200).json({ role, error });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ role: null, error: e.message });
      }
    }
  );

  app.delete(
    "/roles/:id",
    [validatedRequest, userPermissionValid([PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { id } = request.params;
        const existing = await Role.get({ id: Number(id) });
        if (!existing) {
          response.status(404).json({ success: false, error: "Role not found." });
          return;
        }

        const grantCheck = await canGrantPermissions(request, response, existing.permissions);
        if (!grantCheck.valid) {
          response.status(200).json({ success: false, error: grantCheck.error });
          return;
        }

        const { success, error, reassigned } = await Role.delete(id);
        if (success)
          await EventLogs.logEvent("role_deleted", { roleName: existing.name, reassignedUsers: reassigned }, user?.id);
        response.status(200).json({ success, error, reassigned });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ success: false, error: e.message });
      }
    }
  );

  app.get("/roles/me/permissions", [validatedRequest], async (request, response) => {
    try {
      // Single-user mode has no per-account session at all (see
      // validatedRequest.js) - the sole operator has full control by
      // definition, same bypass every other role check in the app already
      // gives them (flexUserRoleValid/isElevatedRole).
      if (!response.locals?.multiUserMode) {
        response.status(200).json({
          permissions: [PERMISSIONS.SUPER_ADMIN],
          workspacePermissions: {},
          role: "admin",
          roleDisplayName: "Admin",
        });
        return;
      }

      const user = await userFromSession(request, response);
      const permissions = await Role.permissionsForUser(user);
      const roleRecord = await Role.get({ name: user?.role });

      const workspaces = await Workspace.whereWithUser(user);
      const workspacePermissions = {};
      for (const workspace of workspaces) {
        workspacePermissions[workspace.slug] = await WorkspaceRole.permissionsForUserInWorkspace(user, workspace.id);
      }

      response.status(200).json({
        permissions,
        workspacePermissions,
        role: user?.role ?? null,
        roleDisplayName: roleRecord?.displayName ?? user?.role ?? null,
      });
    } catch (e) {
      console.error(e.message, e);
      response.status(200).json({ permissions: [], workspacePermissions: {}, role: null, roleDisplayName: null });
    }
  });

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
        const roles = await WorkspaceRole.where({ workspace_id: null });
        const counts = await WorkspaceRole.memberCounts();
        response.status(200).json({
          roles: roles.map((r) => ({ ...r, memberCount: counts[r.id] || 0 })),
          error: null,
        });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ roles: [], error: e.message });
      }
    }
  );

  app.post(
    "/workspace-roles/new",
    [validatedRequest, userPermissionValid([PERMISSIONS.WORKSPACE_ROLES_MANAGE])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name, displayName, description, permissions = [] } = request.body || {};
        const { role, error } = await WorkspaceRole.create({ name, displayName, description, permissions });
        if (role) await EventLogs.logEvent("workspace_role_created", { roleName: role.name }, user?.id);
        response.status(error ? 200 : 201).json({ role, error });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ role: null, error: e.message });
      }
    }
  );

  app.post(
    "/workspace-roles/:id",
    [validatedRequest, userPermissionValid([PERMISSIONS.WORKSPACE_ROLES_MANAGE])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { id } = request.params;
        const { role, error } = await WorkspaceRole.update(id, request.body || {}, null);
        if (role) await EventLogs.logEvent("workspace_role_updated", { roleName: role.name }, user?.id);
        response.status(200).json({ role, error });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ role: null, error: e.message });
      }
    }
  );

  app.delete(
    "/workspace-roles/:id",
    [validatedRequest, userPermissionValid([PERMISSIONS.WORKSPACE_ROLES_MANAGE])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { id } = request.params;
        const existing = await WorkspaceRole.get({ id: Number(id) });
        if (!existing) {
          response.status(404).json({ success: false, error: "Role not found." });
          return;
        }
        const { success, error, reassigned } = await WorkspaceRole.delete(id, null);
        if (success)
          await EventLogs.logEvent("workspace_role_deleted", { roleName: existing.name, reassignedMembers: reassigned }, user?.id);
        response.status(200).json({ success, error, reassigned });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ success: false, error: e.message });
      }
    }
  );

  app.get(
    "/workspace/:slug/roles",
    [validatedRequest, workspacePermissionValid([WORKSPACE_PERMISSIONS.ROLES_MANAGE, WORKSPACE_PERMISSIONS.MEMBERS_MANAGE])],
    async (_request, response) => {
      try {
        const workspace = response.locals.workspace;
        const roles = await WorkspaceRole.availableFor(workspace.id);
        const counts = await WorkspaceRole.memberCounts();
        const user = response.locals.user;
        const canDefineRoles = await WorkspaceRole.userCanAnyInWorkspace(user, workspace.id, [
          WORKSPACE_PERMISSIONS.ROLES_MANAGE,
        ]);

        response.status(200).json({
          roles: roles.map((r) => ({
            ...r,
            memberCount: counts[r.id] || 0,
            editableHere: r.workspace_id === workspace.id,
          })),
          canDefineRoles,
          error: null,
        });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ roles: [], canDefineRoles: false, error: e.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/roles/new",
    [validatedRequest, workspacePermissionValid([WORKSPACE_PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const user = response.locals.user;
        const { name, displayName, description, permissions = [] } = request.body || {};

        const grantCheck = await canGrantWorkspacePermissions(request, response, workspace.id, permissions);
        if (!grantCheck.valid) {
          response.status(200).json({ role: null, error: grantCheck.error });
          return;
        }

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
            { roleName: role.name, workspaceSlug: workspace.slug },
            user?.id
          );
        response.status(error ? 200 : 201).json({ role, error });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ role: null, error: e.message });
      }
    }
  );

  app.post(
    "/workspace/:slug/roles/:id",
    [validatedRequest, workspacePermissionValid([WORKSPACE_PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const user = response.locals.user;
        const { id } = request.params;
        const updates = { ...(request.body || {}) };
        // Promoting a role to the instance-wide default is not a decision one
        // workspace gets to make on its own.
        delete updates.isDefault;

        if (updates.permissions !== undefined) {
          const grantCheck = await canGrantWorkspacePermissions(request, response, workspace.id, updates.permissions);
          if (!grantCheck.valid) {
            response.status(200).json({ role: null, error: grantCheck.error });
            return;
          }
        }

        const { role, error } = await WorkspaceRole.update(id, updates, workspace.id);
        if (role)
          await EventLogs.logEvent(
            "workspace_role_updated",
            { roleName: role.name, workspaceSlug: workspace.slug },
            user?.id
          );
        response.status(200).json({ role, error });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ role: null, error: e.message });
      }
    }
  );

  app.delete(
    "/workspace/:slug/roles/:id",
    [validatedRequest, workspacePermissionValid([WORKSPACE_PERMISSIONS.ROLES_MANAGE])],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const user = response.locals.user;
        const { id } = request.params;
        const existing = await WorkspaceRole.get({ id: Number(id) });
        if (!existing) {
          response.status(404).json({ success: false, error: "Role not found." });
          return;
        }

        const { success, error, reassigned } = await WorkspaceRole.delete(id, workspace.id);
        if (success)
          await EventLogs.logEvent(
            "workspace_role_deleted",
            { roleName: existing.name, workspaceSlug: workspace.slug, reassignedMembers: reassigned },
            user?.id
          );
        response.status(200).json({ success, error, reassigned });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ success: false, error: e.message });
      }
    }
  );
}

module.exports = { roleEndpoints, canGrantPermissions, canGrantWorkspacePermissions };
