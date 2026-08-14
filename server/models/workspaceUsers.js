const prisma = require("../utils/prisma");
const { WorkspaceRole } = require("./workspaceRole");

/**
 * New memberships land on the default workspace role unless one is given explicitly.
 * @param {number|null} workspaceRoleId
 * @returns {Promise<number|null>}
 */
async function resolveWorkspaceRoleId(workspaceRoleId = null) {
  if (workspaceRoleId) return Number(workspaceRoleId);
  const fallback = await WorkspaceRole.defaultRole();
  return fallback?.id ?? null;
}

const WorkspaceUser = {
  createMany: async function (
    userId,
    workspaceIds = [],
    workspaceRoleId = null
  ) {
    if (workspaceIds.length === 0) return;
    try {
      const roleId = await resolveWorkspaceRoleId(workspaceRoleId);
      await prisma.$transaction(
        workspaceIds.map((workspaceId) =>
          prisma.workspace_users.create({
            data: {
              user_id: userId,
              workspace_id: workspaceId,
              workspace_role_id: roleId,
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
  createManyUsers: async function (
    userIds = [],
    workspaceId,
    workspaceRoleId = null
  ) {
    if (userIds.length === 0) return;
    try {
      const roleId = await resolveWorkspaceRoleId(workspaceRoleId);
      await prisma.$transaction(
        userIds.map((userId) =>
          prisma.workspace_users.create({
            data: {
              user_id: Number(userId),
              workspace_id: Number(workspaceId),
              workspace_role_id: roleId,
            },
          })
        )
      );
    } catch (error) {
      console.error(error.message);
    }
    return;
  },

  create: async function (userId = 0, workspaceId = 0, workspaceRoleId = null) {
    try {
      await prisma.workspace_users.create({
        data: {
          user_id: Number(userId),
          workspace_id: Number(workspaceId),
          workspace_role_id: await resolveWorkspaceRoleId(workspaceRoleId),
        },
      });
      return true;
    } catch (error) {
      console.error(
        "FAILED TO CREATE WORKSPACE_USER RELATIONSHIP.",
        error.message
      );
      return false;
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

  /**
   * The members of a workspace with the workspace role each one holds.
   * @param {number} workspaceId
   * @returns {Promise<Array<{user_id: number, username: string, workspaceRole: Object|null}>>}
   */
  membersWithRoles: async function (workspaceId) {
    try {
      const rows = await prisma.workspace_users.findMany({
        where: { workspace_id: Number(workspaceId) },
        include: {
          users: { select: { id: true, username: true, role: true } },
          workspaceRole: {
            select: { id: true, name: true, displayName: true },
          },
        },
      });
      return rows.map((row) => ({
        user_id: row.user_id,
        username: row.users?.username ?? null,
        systemRole: row.users?.role ?? null,
        workspaceRole: row.workspaceRole ?? null,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  /**
   * Changes the workspace role a member holds in one workspace.
   * @param {number} userId
   * @param {number} workspaceId
   * @param {number} workspaceRoleId
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  setRole: async function (userId, workspaceId, workspaceRoleId) {
    try {
      const role = await WorkspaceRole.get({ id: Number(workspaceRoleId) });
      if (!role) return { success: false, error: "Workspace role not found" };

      // A role private to another workspace must never leak across.
      if (!(await WorkspaceRole.assignableIn(role.id, workspaceId)))
        return {
          success: false,
          error: "That role belongs to a different workspace.",
        };

      const { count } = await prisma.workspace_users.updateMany({
        where: {
          user_id: Number(userId),
          workspace_id: Number(workspaceId),
        },
        data: { workspace_role_id: role.id },
      });
      if (count === 0)
        return { success: false, error: "That user is not in this workspace" };
      return { success: true, error: null };
    } catch (error) {
      console.error(error.message);
      return { success: false, error: error.message };
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
