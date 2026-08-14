const {
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  WORKSPACE_PERMISSION_KEYS,
} = require("../../utils/permissions");

// In-memory stand-in for the tables the two role models touch, so per-workspace
// resolution can be exercised without a database.
const mockDb = {
  permissions: [],
  roles: [],
  grants: [],
  wsRoles: [],
  wsGrants: [],
  members: [],
  users: [],
};
let mockNextId = {
  permissions: 1,
  roles: 1,
  grants: 1,
  wsRoles: 1,
  wsGrants: 1,
};

function mockReset() {
  mockDb.permissions = [];
  mockDb.roles = [];
  mockDb.grants = [];
  mockDb.wsRoles = [];
  mockDb.wsGrants = [];
  mockDb.members = [];
  mockDb.users = [];
  mockNextId = {
    permissions: 1,
    roles: 1,
    grants: 1,
    wsRoles: 1,
    wsGrants: 1,
  };
}

const mockKeyOf = (permissionId) =>
  mockDb.permissions.find((p) => p.id === permissionId);

function mockWsGrantsFor(roleId) {
  return mockDb.wsGrants
    .filter((g) => g.workspace_role_id === roleId)
    .map((g) => ({ permission: mockKeyOf(g.permission_id) }));
}

function mockGrantsFor(roleId) {
  return mockDb.grants
    .filter((g) => g.role_id === roleId)
    .map((g) => ({ permission: mockKeyOf(g.permission_id) }));
}

jest.mock("../../utils/prisma", () => ({
  permissions: {
    upsert: async ({ where, create }) => {
      const existing = mockDb.permissions.find((p) => p.key === where.key);
      if (existing) return Object.assign(existing, create);
      const row = { id: mockNextId.permissions++, ...create };
      mockDb.permissions.push(row);
      return row;
    },
    deleteMany: async ({ where }) => {
      mockDb.permissions = mockDb.permissions.filter((p) =>
        where.key.notIn.includes(p.key)
      );
    },
    findMany: async ({ where }) =>
      mockDb.permissions.filter((p) => where.key.in.includes(p.key)),
  },
  roles: {
    findUnique: async ({ where }) =>
      mockDb.roles.find((r) =>
        where.name !== undefined ? r.name === where.name : r.id === where.id
      ) ?? null,
    findFirst: async ({ where }) => {
      const row = mockDb.roles.find((r) =>
        where.id !== undefined ? r.id === where.id : r.name === where.name
      );
      return row ? { ...row, permissions: mockGrantsFor(row.id) } : null;
    },
    findMany: async () =>
      mockDb.roles.map((r) => ({ ...r, permissions: mockGrantsFor(r.id) })),
    create: async ({ data }) => {
      const row = { id: mockNextId.roles++, ...data };
      mockDb.roles.push(row);
      return row;
    },
    update: async ({ where, data }) =>
      Object.assign(
        mockDb.roles.find((r) => r.id === where.id),
        data
      ),
    delete: async ({ where }) => {
      mockDb.roles = mockDb.roles.filter((r) => r.id !== where.id);
    },
  },
  role_permissions: {
    deleteMany: async ({ where }) => {
      mockDb.grants = mockDb.grants.filter((g) => g.role_id !== where.role_id);
    },
    create: async ({ data }) => {
      const row = { id: mockNextId.grants++, ...data };
      mockDb.grants.push(row);
      return row;
    },
    findMany: async ({ where }) => mockGrantsFor(where.role_id),
  },
  workspace_roles: {
    findUnique: async ({ where }) =>
      mockDb.wsRoles.find((r) =>
        where.name !== undefined ? r.name === where.name : r.id === where.id
      ) ?? null,
    findFirst: async ({ where }) => {
      const row = mockDb.wsRoles.find((r) => {
        if (where.id !== undefined) return r.id === where.id;
        const nameOk = where.name === undefined || r.name === where.name;
        const defaultOk =
          where.isDefault === undefined || r.isDefault === where.isDefault;
        const wsOk =
          where.workspace_id === undefined ||
          (r.workspace_id ?? null) === where.workspace_id;
        return nameOk && defaultOk && wsOk && (nameOk || defaultOk);
      });
      return row
        ? {
            ...row,
            permissions: mockWsGrantsFor(row.id),
            workspace: row.workspace_id
              ? {
                  id: row.workspace_id,
                  name: `Workspace ${row.workspace_id}`,
                  slug: `workspace-${row.workspace_id}`,
                }
              : null,
          }
        : null;
    },
    findMany: async ({ where } = {}) =>
      mockDb.wsRoles
        .filter((r) => {
          if (!where?.OR) return true;
          return where.OR.some(
            (clause) =>
              (r.workspace_id ?? null) === (clause.workspace_id ?? null)
          );
        })
        .map((r) => ({
          ...r,
          permissions: mockWsGrantsFor(r.id),
          workspace: r.workspace_id
            ? {
                id: r.workspace_id,
                name: `Workspace ${r.workspace_id}`,
                slug: `workspace-${r.workspace_id}`,
              }
            : null,
        })),
    create: async ({ data }) => {
      const row = {
        workspace_id: null,
        id: mockNextId.wsRoles++,
        ...data,
      };
      // mirrors the unique index on (workspace_id, name)
      if (
        mockDb.wsRoles.some(
          (r) =>
            r.name === row.name &&
            (r.workspace_id ?? null) === (row.workspace_id ?? null)
        )
      )
        throw new Error("Unique constraint failed");
      mockDb.wsRoles.push(row);
      return row;
    },
    update: async ({ where, data }) =>
      Object.assign(
        mockDb.wsRoles.find((r) => r.id === where.id),
        data
      ),
    updateMany: async ({ where, data }) => {
      const matches = mockDb.wsRoles.filter(
        (r) => r.isDefault === where.isDefault
      );
      matches.forEach((r) => Object.assign(r, data));
      return { count: matches.length };
    },
    delete: async ({ where }) => {
      mockDb.wsRoles = mockDb.wsRoles.filter((r) => r.id !== where.id);
    },
  },
  workspace_role_permissions: {
    deleteMany: async ({ where }) => {
      mockDb.wsGrants = mockDb.wsGrants.filter(
        (g) => g.workspace_role_id !== where.workspace_role_id
      );
    },
    create: async ({ data }) => {
      const row = { id: mockNextId.wsGrants++, ...data };
      mockDb.wsGrants.push(row);
      return row;
    },
  },
  workspace_users: {
    findFirst: async ({ where }) =>
      mockDb.members.find(
        (m) =>
          m.user_id === where.user_id && m.workspace_id === where.workspace_id
      ) ?? null,
    findMany: async ({ where }) =>
      mockDb.members.filter((m) => m.user_id === where.user_id),
    updateMany: async ({ where, data }) => {
      const matches = mockDb.members.filter((m) =>
        where.workspace_role_id === null
          ? m.workspace_role_id == null
          : m.workspace_role_id === where.workspace_role_id
      );
      matches.forEach((m) => Object.assign(m, data));
      return { count: matches.length };
    },
    groupBy: async () =>
      Object.entries(
        mockDb.members.reduce((counts, m) => {
          counts[m.workspace_role_id] = (counts[m.workspace_role_id] ?? 0) + 1;
          return counts;
        }, {})
      ).map(([id, count]) => ({
        workspace_role_id: Number(id),
        _count: { workspace_role_id: count },
      })),
  },
  users: {
    updateMany: async () => ({ count: 0 }),
    count: async () => 0,
    groupBy: async () => [],
  },
  $transaction: async (operations) => Promise.all(operations),
}));

jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: jest.fn() },
}));

const { Role } = require("../../models/role");
const { WorkspaceRole } = require("../../models/workspaceRole");

const ALPHA = 1;
const BETA = 2;

/** Puts a user in a workspace holding the named workspace role. */
async function join(userId, workspaceId, roleName) {
  const role = await WorkspaceRole.get({ name: roleName });
  mockDb.members.push({
    user_id: userId,
    workspace_id: workspaceId,
    workspace_role_id: role?.id ?? null,
  });
}

beforeEach(async () => {
  mockReset();
  Role.flushCache();
  WorkspaceRole.flushCache();
  await Role.seed();
  await WorkspaceRole.seed();
});

describe("WorkspaceRole.seed", () => {
  it("creates the built-in workspace roles with one default", async () => {
    const roles = await WorkspaceRole.where();
    expect(roles.map((r) => r.name).sort()).toEqual([
      "contributor",
      "member",
      "viewer",
      "workspace-manager",
    ]);
    expect(roles.filter((r) => r.isDefault)).toHaveLength(1);
    expect((await WorkspaceRole.defaultRole()).name).toBe("member");
  });

  it("only ever grants workspace-scope permissions", async () => {
    for (const role of await WorkspaceRole.where())
      for (const permission of role.permissions)
        expect(WORKSPACE_PERMISSION_KEYS).toContain(permission);
  });

  it("puts pre-existing memberships onto the default role", async () => {
    mockDb.members.push({
      user_id: 9,
      workspace_id: ALPHA,
      workspace_role_id: null,
    });
    const moved = await WorkspaceRole.backfillMemberships();
    expect(moved).toBe(1);
    expect(
      await WorkspaceRole.userCanInWorkspace(
        { id: 9 },
        ALPHA,
        WORKSPACE_PERMISSIONS.CHAT
      )
    ).toBe(true);
  });
});

describe("per-workspace resolution", () => {
  it("gives the same account different powers in different workspaces", async () => {
    const user = { id: 7, role: "default" };
    await join(7, ALPHA, "workspace-manager");
    await join(7, BETA, "viewer");

    // Manager of alpha
    expect(
      await WorkspaceRole.userCanInWorkspace(
        user,
        ALPHA,
        WORKSPACE_PERMISSIONS.MEMBERS_MANAGE
      )
    ).toBe(true);
    expect(
      await WorkspaceRole.userCanInWorkspace(
        user,
        ALPHA,
        WORKSPACE_PERMISSIONS.CHAT
      )
    ).toBe(true);

    // Read-only in beta
    expect(
      await WorkspaceRole.userCanInWorkspace(
        user,
        BETA,
        WORKSPACE_PERMISSIONS.VIEW
      )
    ).toBe(true);
    expect(
      await WorkspaceRole.userCanInWorkspace(
        user,
        BETA,
        WORKSPACE_PERMISSIONS.CHAT
      )
    ).toBe(false);
    expect(
      await WorkspaceRole.userCanInWorkspace(
        user,
        BETA,
        WORKSPACE_PERMISSIONS.MEMBERS_MANAGE
      )
    ).toBe(false);
  });

  it("grants nothing in a workspace the user is not a member of", async () => {
    const user = { id: 7, role: "default" };
    await join(7, ALPHA, "workspace-manager");
    expect(
      await WorkspaceRole.permissionsForUserInWorkspace(user, BETA)
    ).toEqual([]);
  });

  it("grants nothing without a user or a workspace", async () => {
    expect(
      await WorkspaceRole.permissionsForUserInWorkspace(null, ALPHA)
    ).toEqual([]);
    expect(
      await WorkspaceRole.permissionsForUserInWorkspace({ id: 7 }, null)
    ).toEqual([]);
  });

  it("treats a membership whose role was removed as the default role", async () => {
    mockDb.members.push({
      user_id: 7,
      workspace_id: ALPHA,
      workspace_role_id: null,
    });
    expect(
      await WorkspaceRole.userCanInWorkspace(
        { id: 7 },
        ALPHA,
        WORKSPACE_PERMISSIONS.CHAT
      )
    ).toBe(true);
  });
});

describe("instance-wide overrides", () => {
  it("lets a super-admin do anything in any workspace without membership", async () => {
    const admin = { id: 1, role: "admin" };
    expect(
      await WorkspaceRole.permissionsForUserInWorkspace(admin, BETA)
    ).toEqual(expect.arrayContaining(WORKSPACE_PERMISSION_KEYS));
  });

  it("lets workspaces.manage_all do the same", async () => {
    const manager = { id: 2, role: "manager" };
    expect(await Role.userCan(manager, PERMISSIONS.WORKSPACES_MANAGE_ALL)).toBe(
      true
    );
    expect(
      await WorkspaceRole.userCanInWorkspace(
        manager,
        BETA,
        WORKSPACE_PERMISSIONS.DELETE
      )
    ).toBe(true);
  });

  it("does not let an ordinary system role reach into workspaces", async () => {
    const member = { id: 3, role: "default" };
    expect(
      await WorkspaceRole.userCanInWorkspace(
        member,
        ALPHA,
        WORKSPACE_PERMISSIONS.VIEW
      )
    ).toBe(false);
  });
});

describe("userCanInAnyWorkspace", () => {
  it("is true when the permission is held in at least one workspace", async () => {
    const user = { id: 7, role: "default" };
    await join(7, ALPHA, "viewer");
    await join(7, BETA, "contributor");

    expect(
      await WorkspaceRole.userCanInAnyWorkspace(
        user,
        WORKSPACE_PERMISSIONS.DATA_CONNECTORS
      )
    ).toBe(true);
    expect(
      await WorkspaceRole.userCanInAnyWorkspace(
        user,
        WORKSPACE_PERMISSIONS.MEMBERS_MANAGE
      )
    ).toBe(false);
  });

  it("is false for someone in no workspaces", async () => {
    expect(
      await WorkspaceRole.userCanInAnyWorkspace(
        { id: 42, role: "default" },
        WORKSPACE_PERMISSIONS.VIEW
      )
    ).toBe(false);
  });
});

describe("custom workspace roles", () => {
  it("keeps only workspace-scope permissions that were ticked", async () => {
    const { role, error } = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer",
      permissions: [
        WORKSPACE_PERMISSIONS.VIEW,
        WORKSPACE_PERMISSIONS.CHATS_VIEW_ALL,
        // a system-scope key must be rejected by a workspace role
        PERMISSIONS.SYSTEM_SETTINGS,
        "not.a.real.permission",
      ],
    });

    expect(error).toBeNull();
    expect(role.permissions.sort()).toEqual(
      [WORKSPACE_PERMISSIONS.VIEW, WORKSPACE_PERMISSIONS.CHATS_VIEW_ALL].sort()
    );
    expect(role.permissions).not.toContain(PERMISSIONS.SYSTEM_SETTINGS);
  });

  it("applies permission changes without a restart", async () => {
    const { role } = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer",
      permissions: [WORKSPACE_PERMISSIONS.VIEW],
    });
    await join(7, ALPHA, "reviewer");

    expect(
      await WorkspaceRole.userCanInWorkspace(
        { id: 7 },
        ALPHA,
        WORKSPACE_PERMISSIONS.CHAT
      )
    ).toBe(false);

    await WorkspaceRole.update(role.id, {
      permissions: [WORKSPACE_PERMISSIONS.VIEW, WORKSPACE_PERMISSIONS.CHAT],
    });

    expect(
      await WorkspaceRole.userCanInWorkspace(
        { id: 7 },
        ALPHA,
        WORKSPACE_PERMISSIONS.CHAT
      )
    ).toBe(true);
  });

  it("refuses to delete built-in or default roles", async () => {
    const builtIn = await WorkspaceRole.get({ name: "viewer" });
    expect((await WorkspaceRole.delete(builtIn.id)).success).toBe(false);

    const fallback = await WorkspaceRole.get({ name: "member" });
    const attempt = await WorkspaceRole.delete(fallback.id);
    expect(attempt.success).toBe(false);
  });

  it("moves members of a deleted role onto the default role", async () => {
    const { role } = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer",
      permissions: [WORKSPACE_PERMISSIONS.VIEW],
    });
    await join(7, ALPHA, "reviewer");

    const { success, reassigned } = await WorkspaceRole.delete(role.id);
    expect(success).toBe(true);
    expect(reassigned).toBe(1);

    // They keep their membership and land on the default role's abilities.
    expect(
      await WorkspaceRole.userCanInWorkspace(
        { id: 7 },
        ALPHA,
        WORKSPACE_PERMISSIONS.CHAT
      )
    ).toBe(true);
  });

  it("keeps exactly one default when another is promoted", async () => {
    const contributor = await WorkspaceRole.get({ name: "contributor" });
    await WorkspaceRole.update(contributor.id, { isDefault: true });

    const roles = await WorkspaceRole.where();
    expect(roles.filter((r) => r.isDefault).map((r) => r.name)).toEqual([
      "contributor",
    ]);
  });
});

describe("workspace-owned roles", () => {
  it("keeps the built-ins shared across every workspace", async () => {
    for (const role of await WorkspaceRole.where())
      expect(role.workspace_id ?? null).toBeNull();

    // Shared roles show up in every workspace's list.
    const inAlpha = await WorkspaceRole.availableFor(ALPHA);
    const inBeta = await WorkspaceRole.availableFor(BETA);
    expect(inAlpha.map((r) => r.name).sort()).toEqual(
      inBeta.map((r) => r.name).sort()
    );
  });

  it("keeps a workspace's own role out of other workspaces", async () => {
    const { role } = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer",
      permissions: [WORKSPACE_PERMISSIONS.VIEW],
      workspaceId: ALPHA,
    });
    expect(role.workspace_id).toBe(ALPHA);
    expect(role.workspace).toEqual({
      id: ALPHA,
      name: `Workspace ${ALPHA}`,
      slug: `workspace-${ALPHA}`,
    });

    const alphaNames = (await WorkspaceRole.availableFor(ALPHA)).map(
      (r) => r.name
    );
    const betaNames = (await WorkspaceRole.availableFor(BETA)).map(
      (r) => r.name
    );
    expect(alphaNames).toContain("reviewer");
    expect(betaNames).not.toContain("reviewer");
  });

  it("lets two workspaces each define the same role name", async () => {
    const a = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer A",
      permissions: [],
      workspaceId: ALPHA,
    });
    const b = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer B",
      permissions: [],
      workspaceId: BETA,
    });
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();

    // ...but not twice within the same workspace
    const dupe = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Dupe",
      permissions: [],
      workspaceId: ALPHA,
    });
    expect(dupe.error).toBeTruthy();
  });

  it("only allows a role to be assigned in the workspace that owns it", async () => {
    const { role } = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer",
      permissions: [],
      workspaceId: ALPHA,
    });
    expect(await WorkspaceRole.assignableIn(role.id, ALPHA)).toBe(true);
    expect(await WorkspaceRole.assignableIn(role.id, BETA)).toBe(false);

    // shared roles stay assignable everywhere
    const shared = await WorkspaceRole.get({ name: "member" });
    expect(await WorkspaceRole.assignableIn(shared.id, ALPHA)).toBe(true);
    expect(await WorkspaceRole.assignableIn(shared.id, BETA)).toBe(true);
  });

  it("refuses to edit or delete a shared role from inside a workspace", async () => {
    const shared = await WorkspaceRole.get({ name: "contributor" });

    const edit = await WorkspaceRole.update(
      shared.id,
      { displayName: "Hijacked" },
      ALPHA
    );
    expect(edit.error).toMatch(/instance-wide/i);

    const removal = await WorkspaceRole.delete(shared.id, ALPHA);
    expect(removal.success).toBe(false);

    // untouched
    expect((await WorkspaceRole.get({ id: shared.id })).displayName).toBe(
      "Contributor"
    );
  });

  it("refuses to touch another workspace's role", async () => {
    const { role } = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer",
      permissions: [],
      workspaceId: BETA,
    });

    const edit = await WorkspaceRole.update(
      role.id,
      { displayName: "Cross" },
      ALPHA
    );
    expect(edit.error).toMatch(/different workspace/i);
    expect((await WorkspaceRole.delete(role.id, ALPHA)).success).toBe(false);

    // its owner may
    expect(
      (await WorkspaceRole.update(role.id, { displayName: "Renamed" }, BETA))
        .error
    ).toBeNull();
  });

  it("still resolves permissions from a workspace-owned role", async () => {
    const { role } = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer",
      permissions: [
        WORKSPACE_PERMISSIONS.VIEW,
        WORKSPACE_PERMISSIONS.CHATS_VIEW_ALL,
      ],
      workspaceId: ALPHA,
    });
    mockDb.members.push({
      user_id: 7,
      workspace_id: ALPHA,
      workspace_role_id: role.id,
    });

    expect(
      await WorkspaceRole.userCanInWorkspace(
        { id: 7 },
        ALPHA,
        WORKSPACE_PERMISSIONS.CHATS_VIEW_ALL
      )
    ).toBe(true);
    expect(
      await WorkspaceRole.userCanInWorkspace(
        { id: 7 },
        ALPHA,
        WORKSPACE_PERMISSIONS.DELETE
      )
    ).toBe(false);
  });

  it("never lets a workspace-owned role become the instance default", async () => {
    const { role } = await WorkspaceRole.create({
      name: "reviewer",
      displayName: "Reviewer",
      permissions: [],
      workspaceId: ALPHA,
    });
    // defaultRole only ever considers shared roles
    await WorkspaceRole.update(role.id, { isDefault: true }, null);
    expect((await WorkspaceRole.defaultRole()).workspace_id ?? null).toBeNull();
  });
});
