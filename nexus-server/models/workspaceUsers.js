const { Prisma } = require("@prisma/client");
const prisma = require("../utils/prisma");
const { WorkspaceRole } = require("./workspaceRole");
const { WORKSPACE_PERMISSIONS } = require("../utils/permissions");

function isUniqueConstraintError(error) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Resolves a role NAME (shared, e.g. "admin"/"member", or private to this
 * workspace) to its workspace_roles row. Kept name-based (not id-based) at
 * this layer so every existing caller across the app - which all pass a
 * plain string like "admin" or "member" - keeps working unchanged even
 * though storage underneath is now an FK (workspace_role_id).
 * @param {string} roleName
 * @param {number} workspaceId
 */
async function resolveRoleByName(roleName, workspaceId) {
  return WorkspaceRole.get({
    name: String(roleName || "").toLowerCase(),
    OR: [{ workspace_id: null }, { workspace_id: Number(workspaceId) }],
  });
}

const WorkspaceUser = {
  createMany: async function (userId, workspaceIds = []) {
    if (workspaceIds.length === 0) return;
    try {
      const defaultRole = await WorkspaceRole.defaultRole();
      await prisma.$transaction(
        workspaceIds.map((workspaceId) =>
          prisma.workspace_users.create({
            data: {
              user_id: userId,
              workspace_id: workspaceId,
              workspace_role_id: defaultRole?.id ?? null,
            },
          })
        )
      );
    } catch (error) {
      console.error(error.message);
    }
    return;
  },

  /**
   * Create many workspace users.
   * @param {Array<number>} userIds - An array of user IDs to create workspace users for.
   * @param {number} workspaceId - The ID of the workspace to create workspace users for.
   * @returns {Promise<void>} A promise that resolves when the workspace users are created.
   */
  createManyUsers: async function (userIds = [], workspaceId) {
    if (userIds.length === 0) return;
    try {
      const defaultRole = await WorkspaceRole.defaultRole();
      await prisma.$transaction(
        userIds.map((userId) =>
          prisma.workspace_users.create({
            data: {
              user_id: Number(userId),
              workspace_id: Number(workspaceId),
              workspace_role_id: defaultRole?.id ?? null,
            },
          })
        )
      );
    } catch (error) {
      console.error(error.message);
    }
    return;
  },

  /**
   * @returns {Promise<true|false|"conflict"|"invalid-role">} "conflict" means
   *   a row for this (user_id, workspace_id) pair already exists (unique
   *   constraint) - distinct from `false` (a genuine failure) so callers can
   *   react differently (e.g. addUser() below falls back to setRole on
   *   conflict). "invalid-role" means the given role name doesn't resolve to
   *   any role assignable in this workspace.
   */
  create: async function (userId = 0, workspaceId = 0, role = "member") {
    try {
      const resolvedRole = await resolveRoleByName(role, workspaceId);
      if (!resolvedRole) return "invalid-role";

      await prisma.workspace_users.create({
        data: {
          user_id: Number(userId),
          workspace_id: Number(workspaceId),
          workspace_role_id: resolvedRole.id,
        },
      });
      return true;
    } catch (error) {
      if (isUniqueConstraintError(error)) return "conflict";
      console.error(
        "FAILED TO CREATE WORKSPACE_USER RELATIONSHIP.",
        error.message
      );
      return false;
    }
  },

  /**
   * Add a single existing user to a workspace without disturbing existing members
   * (unlike Workspace.updateUsers, which wholesale-replaces the member list).
   *
   * Attempts the insert directly and lets the DB-level unique constraint on
   * (user_id, workspace_id) be the source of truth for "already a member",
   * rather than a separate check-then-create (which raced: two concurrent
   * calls could both see "no existing row" and both insert, producing
   * duplicate rows that inflate WorkspaceUser.countAdmins()'s row count and
   * let the last-admin-lockout guard pass while the workspace actually ends
   * up with fewer admins than it thinks).
   * @param {number} userId
   * @param {number} workspaceId
   * @param {string} role - a role name, shared or private to this workspace
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  addUser: async function (userId = 0, workspaceId = 0, role = "member") {
    try {
      const created = await this.create(userId, workspaceId, role);
      if (created === "invalid-role")
        return { success: false, error: `Invalid role: ${role}` };
      if (created === "conflict") {
        // Already a member (created concurrently, or pre-existing) - just
        // make sure the role matches what was requested.
        return await this.setRole(userId, workspaceId, role);
      }
      if (!created) return { success: false, error: "Failed to add member." };
      return { success: true, error: null };
    } catch (error) {
      console.error(error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Whether a workspace_roles row grants workspace-management power, for the
   * last-admin-lockout checks below. Generalizes "is this the admin role" to
   * "does this role grant the permission that matters" so a renamed or
   * custom equally-powerful role is still recognized correctly.
   * @param {number|null} workspaceRoleId
   * @returns {Promise<boolean>}
   */
  _grantsMembersManage: async function (workspaceRoleId) {
    if (!workspaceRoleId) return false;
    const role = await WorkspaceRole.get({ id: Number(workspaceRoleId) });
    return !!role?.permissions?.includes(WORKSPACE_PERMISSIONS.MEMBERS_MANAGE);
  },

  /**
   * Remove a single member from a workspace. Centralizes the "don't strand a
   * workspace with zero admins" guard here (rather than in the calling
   * endpoint) so every future caller gets the same protection automatically.
   * @param {number} userId
   * @param {number} workspaceId
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  removeUser: async function (userId = 0, workspaceId = 0) {
    const membership = await this.get({
      user_id: Number(userId),
      workspace_id: Number(workspaceId),
    });
    if (!membership)
      return { success: false, error: "Not a member of this workspace." };

    if (await this._grantsMembersManage(membership.workspace_role_id)) {
      const adminCount = await this.countAdmins(workspaceId);
      if (adminCount <= 1)
        return {
          success: false,
          error: "Cannot remove the last remaining admin of this workspace.",
        };
    }

    await this.delete({
      user_id: Number(userId),
      workspace_id: Number(workspaceId),
    });
    return { success: true, error: null };
  },

  /**
   * Change a member's workspace-scoped role. Centralizes the same last-admin
   * lockout guard as removeUser() - see that method's comment.
   * @param {number} userId
   * @param {number} workspaceId
   * @param {string} role - a role name, shared or private to this workspace
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  setRole: async function (userId = 0, workspaceId = 0, role = "member") {
    const resolvedRole = await resolveRoleByName(role, workspaceId);
    if (!resolvedRole) return { success: false, error: `Invalid role: ${role}` };

    const membership = await this.get({
      user_id: Number(userId),
      workspace_id: Number(workspaceId),
    });
    if (!membership)
      return { success: false, error: "Not a member of this workspace." };

    const wasAdmin = await this._grantsMembersManage(membership.workspace_role_id);
    const willBeAdmin = await this._grantsMembersManage(resolvedRole.id);
    if (wasAdmin && !willBeAdmin) {
      const adminCount = await this.countAdmins(workspaceId);
      if (adminCount <= 1)
        return {
          success: false,
          error: "Cannot demote the last remaining admin of this workspace.",
        };
    }

    try {
      await prisma.workspace_users.updateMany({
        where: { user_id: Number(userId), workspace_id: Number(workspaceId) },
        data: { workspace_role_id: resolvedRole.id, lastUpdatedAt: new Date() },
      });
      return { success: true, error: null };
    } catch (error) {
      console.error(error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Count how many members of a workspace currently hold a role that grants
   * workspace-management power. Used to prevent removing/demoting the last
   * one remaining.
   * @param {number} workspaceId
   * @returns {Promise<number>}
   */
  countAdmins: async function (workspaceId = 0) {
    const members = await this.where({ workspace_id: Number(workspaceId) });
    let count = 0;
    for (const m of members) {
      if (await this._grantsMembersManage(m.workspace_role_id)) count++;
    }
    return count;
  },

  /**
   * The members of a workspace with their resolved role name/displayName -
   * what the members-management UI reads. Distinct from the raw `where()`
   * below, which just returns workspace_users rows as-is.
   * @param {number} workspaceId
   */
  membersWithRoles: async function (workspaceId) {
    try {
      const rows = await prisma.workspace_users.findMany({
        where: { workspace_id: Number(workspaceId) },
        include: { users: true, workspaceRole: true },
      });
      const defaultRole = await WorkspaceRole.defaultRole();
      return rows.map((row) => ({
        user_id: row.user_id,
        username: row.users?.username ?? null,
        systemRole: row.users?.role ?? null,
        workspaceRole: row.workspaceRole
          ? { id: row.workspaceRole.id, name: row.workspaceRole.name, displayName: row.workspaceRole.displayName }
          : defaultRole
            ? { id: defaultRole.id, name: defaultRole.name, displayName: defaultRole.displayName }
            : null,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  get: async function (clause = {}) {
    try {
      const result = await prisma.workspace_users.findFirst({ where: clause });
      return result || null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  where: async function (clause = {}, limit = null) {
    try {
      const results = await prisma.workspace_users.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
      });
      return results;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.workspace_users.count({ where: clause });
      return count;
    } catch (error) {
      console.error(error.message);
      return 0;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.workspace_users.deleteMany({ where: clause });
    } catch (error) {
      console.error(error.message);
    }
    return;
  },
};

module.exports.WorkspaceUser = WorkspaceUser;
