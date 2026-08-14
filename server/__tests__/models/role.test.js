const {
  PERMISSIONS,
  SYSTEM_PERMISSION_KEYS,
  WORKSPACE_PERMISSIONS,
} = require("../../utils/permissions");

// An in-memory stand-in for the tables the Role model touches, so the permission
// resolution and privilege-escalation rules can be exercised without a database.
const mockDb = { permissions: [], roles: [], grants: [], users: [] };
let mockNextId = { permissions: 1, roles: 1, grants: 1 };

function mockReset() {
  mockDb.permissions = [];
  mockDb.roles = [];
  mockDb.grants = [];
  mockDb.users = [];
  mockNextId = { permissions: 1, roles: 1, grants: 1 };
}

function mockGrantsFor(roleId) {
  return mockDb.grants
    .filter((grant) => grant.role_id === roleId)
    .map((grant) => ({
      permission: mockDb.permissions.find((p) => p.id === grant.permission_id),
    }));
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
    update: async ({ where, data }) => {
      const row = mockDb.roles.find((r) => r.id === where.id);
      return Object.assign(row, data);
    },
    delete: async ({ where }) => {
      mockDb.roles = mockDb.roles.filter((r) => r.id !== where.id);
      mockDb.grants = mockDb.grants.filter((g) => g.role_id !== where.id);
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
  $transaction: async (operations) => Promise.all(operations),
  users: {
    updateMany: async ({ where, data }) => {
      const matches = mockDb.users.filter((u) => u.role === where.role);
      for (const user of matches) user.role = data.role;
      return { count: matches.length };
    },
    count: async ({ where }) =>
      mockDb.users.filter((u) => where.role.in.includes(u.role)).length,
    groupBy: async () =>
      Object.entries(
        mockDb.users.reduce((counts, user) => {
          counts[user.role] = (counts[user.role] ?? 0) + 1;
          return counts;
        }, {})
      ).map(([role, count]) => ({ role, _count: { role: count } })),
  },
}));

jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: jest.fn() },
}));

const { Role } = require("../../models/role");
const {
  validRoleSelection,
  validCanModify,
  canModifyAdmin,
} = require("../../utils/helpers/admin");

beforeEach(async () => {
  mockReset();
  Role.flushCache();
  await Role.seed();
});

describe("Role.seed", () => {
  it("creates the built-in roles and mirrors the permission catalog", async () => {
    const roles = await Role.where();
    expect(roles.map((role) => role.name).sort()).toEqual([
      "admin",
      "default",
      "manager",
    ]);
    expect(roles.every((role) => role.isSystem)).toBe(true);
    expect(mockDb.permissions.length).toBeGreaterThan(0);
  });

  it("is idempotent and does not clobber operator edits", async () => {
    const manager = await Role.get({ name: "manager" });
    await Role.update(manager.id, { permissions: [PERMISSIONS.USERS_VIEW] });

    await Role.seed();

    const after = await Role.get({ name: "manager" });
    expect(after.permissions).toEqual([PERMISSIONS.USERS_VIEW]);
    expect((await Role.where()).length).toBe(3);
  });
});

describe("permission resolution", () => {
  it("treats the super-admin grant as a wildcard", async () => {
    const admin = { role: "admin" };
    expect(await Role.userCan(admin, PERMISSIONS.EMBEDS_MANAGE)).toBe(true);
    expect(await Role.userCan(admin, PERMISSIONS.SYSTEM_SETTINGS)).toBe(true);
    expect((await Role.permissionsFor("admin")).sort()).toEqual(
      [...SYSTEM_PERMISSION_KEYS].sort()
    );
  });

  it("reproduces the legacy manager and default boundaries", async () => {
    const manager = { role: "manager" };
    expect(await Role.userCan(manager, PERMISSIONS.WORKSPACES_CREATE)).toBe(
      true
    );
    expect(await Role.userCan(manager, PERMISSIONS.WORKSPACES_MANAGE_ALL)).toBe(
      true
    );
    expect(await Role.userCan(manager, PERMISSIONS.CHATS_VIEW_ALL)).toBe(true);
    expect(await Role.userCan(manager, PERMISSIONS.SYSTEM_SETTINGS)).toBe(
      false
    );

    // A plain member holds nothing instance-wide now - their abilities come from the
    // workspace role they hold in each workspace.
    const member = { role: "default" };
    expect(await Role.userCan(member, PERMISSIONS.WORKSPACES_CREATE)).toBe(
      false
    );
    expect(await Role.permissionsFor("default")).toEqual([]);
  });

  it("grants nothing to an unknown or missing role", async () => {
    expect(
      await Role.userCan({ role: "ghost" }, PERMISSIONS.WORKSPACES_CREATE)
    ).toBe(false);
    expect(await Role.userCan(null, PERMISSIONS.WORKSPACES_CREATE)).toBe(false);
  });

  it("requires all permissions for userCanAll and any for userCanAny", async () => {
    const manager = { role: "manager" };
    const pair = [PERMISSIONS.WORKSPACES_CREATE, PERMISSIONS.SYSTEM_SETTINGS];
    expect(await Role.userCanAll(manager, pair)).toBe(false);
    expect(await Role.userCanAny(manager, pair)).toBe(true);
    expect(await Role.userCanAny(manager, [])).toBe(false);
  });
});

describe("custom roles", () => {
  it("creates a role with only the permissions that were ticked", async () => {
    const { role, error } = await Role.create({
      name: "editor",
      displayName: "Content Editor",
      permissions: [
        PERMISSIONS.DOCUMENTS_MANAGE,
        PERMISSIONS.USERS_VIEW,
        "not.a.real.permission",
        // a workspace-scope key must be rejected by a system role
        WORKSPACE_PERMISSIONS.CHAT,
      ],
    });

    expect(error).toBeNull();
    expect(role.permissions.sort()).toEqual(
      [PERMISSIONS.DOCUMENTS_MANAGE, PERMISSIONS.USERS_VIEW].sort()
    );
    expect(role.permissions).not.toContain(WORKSPACE_PERMISSIONS.CHAT);
    expect(
      await Role.userCan({ role: "editor" }, PERMISSIONS.DOCUMENTS_MANAGE)
    ).toBe(true);
    expect(
      await Role.userCan({ role: "editor" }, PERMISSIONS.SYSTEM_SETTINGS)
    ).toBe(false);
  });

  it("rejects malformed role names", async () => {
    const { error } = await Role.create({
      name: "Not A Slug!",
      displayName: "Bad",
    });
    expect(error).toBeTruthy();
  });

  it("applies permission changes without needing a restart", async () => {
    const { role } = await Role.create({
      name: "editor",
      displayName: "Content Editor",
      permissions: [PERMISSIONS.DOCUMENTS_MANAGE],
    });
    expect(
      await Role.userCan({ role: "editor" }, PERMISSIONS.DOCUMENTS_MANAGE)
    ).toBe(true);

    await Role.update(role.id, { permissions: [PERMISSIONS.USERS_VIEW] });
    expect(
      await Role.userCan({ role: "editor" }, PERMISSIONS.DOCUMENTS_MANAGE)
    ).toBe(false);
    expect(await Role.userCan({ role: "editor" }, PERMISSIONS.USERS_VIEW)).toBe(
      true
    );
  });

  it("moves members of a deleted role onto the fallback role", async () => {
    const { role } = await Role.create({
      name: "editor",
      displayName: "Content Editor",
      permissions: [PERMISSIONS.USERS_VIEW],
    });
    mockDb.users.push({ id: 1, role: "editor" }, { id: 2, role: "editor" });

    const { success, reassigned } = await Role.delete(role.id);
    expect(success).toBe(true);
    expect(reassigned).toBe(2);
    expect(mockDb.users.every((user) => user.role === "default")).toBe(true);
  });
});

describe("built-in role protection", () => {
  it("refuses to delete a built-in role", async () => {
    const admin = await Role.get({ name: "admin" });
    const { success, error } = await Role.delete(admin.id);
    expect(success).toBe(false);
    expect(error).toMatch(/cannot be deleted/i);
  });

  it("keeps the super-admin grant even if it is unticked", async () => {
    const admin = await Role.get({ name: "admin" });
    await Role.update(admin.id, { permissions: [PERMISSIONS.USERS_VIEW] });
    expect(await Role.userCan({ role: "admin" }, PERMISSIONS.SUPER_ADMIN)).toBe(
      true
    );
  });
});

describe("privilege escalation guards", () => {
  // Whoever assigns a role also sets that user's initial password, so handing out a
  // role you do not hold yourself is a real escalation path.
  beforeEach(async () => {
    await Role.create({
      name: "useradmin",
      displayName: "User Admin",
      permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.USERS_ASSIGN_ROLES],
    });
  });

  it("blocks assigning a role that grants more than the assigner holds", async () => {
    const actor = { role: "useradmin" };
    expect((await validRoleSelection(actor, { role: "admin" })).valid).toBe(
      false
    );
    expect((await validRoleSelection(actor, { role: "manager" })).valid).toBe(
      false
    );
    expect((await validRoleSelection(actor, { role: "default" })).valid).toBe(
      true
    );
  });

  it("blocks assigning a role that does not exist", async () => {
    expect(
      (await validRoleSelection({ role: "admin" }, { role: "ghost" })).valid
    ).toBe(false);
  });

  it("lets a super-admin assign anything and skips the check when role is unchanged", async () => {
    const admin = { role: "admin" };
    expect((await validRoleSelection(admin, { role: "admin" })).valid).toBe(
      true
    );
    expect((await validRoleSelection(admin, { username: "x" })).valid).toBe(
      true
    );
  });

  it("requires the assign-roles permission", async () => {
    expect(
      (await validRoleSelection({ role: "default" }, { role: "default" })).valid
    ).toBe(false);
  });

  it("stops a limited user-manager from editing someone who outranks them", async () => {
    const actor = { role: "useradmin" };
    expect((await validCanModify(actor, { role: "admin" })).valid).toBe(false);
    expect((await validCanModify(actor, { role: "default" })).valid).toBe(true);
    expect((await validCanModify(actor, { role: "useradmin" })).valid).toBe(
      true
    );
    expect(
      (await validCanModify({ role: "default" }, { role: "default" })).valid
    ).toBe(false);
  });
});

describe("last administrator guard", () => {
  it("refuses to demote the only user holding a super-admin role", async () => {
    mockDb.users.push({ id: 1, role: "admin" });
    expect(
      (await canModifyAdmin({ id: 1, role: "admin" }, { role: "default" }))
        .valid
    ).toBe(false);

    mockDb.users.push({ id: 2, role: "admin" });
    expect(
      (await canModifyAdmin({ id: 1, role: "admin" }, { role: "default" }))
        .valid
    ).toBe(true);
  });

  it("counts every role carrying the super-admin grant, not just the built-in one", async () => {
    mockDb.users.push({ id: 1, role: "admin" });
    await Role.create({
      name: "owner",
      displayName: "Owner",
      permissions: [PERMISSIONS.SUPER_ADMIN],
    });
    mockDb.users.push({ id: 2, role: "owner" });

    expect(
      (await canModifyAdmin({ id: 1, role: "admin" }, { role: "default" }))
        .valid
    ).toBe(true);
  });

  it("skips the guard when the role is not changing", async () => {
    mockDb.users.push({ id: 1, role: "admin" });
    expect(
      (await canModifyAdmin({ id: 1, role: "admin" }, { username: "x" })).valid
    ).toBe(true);
    expect(
      (await canModifyAdmin({ id: 1, role: "admin" }, { role: "admin" })).valid
    ).toBe(true);
  });
});
