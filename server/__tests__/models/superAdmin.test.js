const { PERMISSIONS, SUPER_ADMIN_ROLE } = require("../../utils/permissions");

/**
 * The owner guarantees, exercised end to end against an in-memory database.
 *
 * These are model-level tests on purpose. The rules they cover are enforced in the
 * models rather than in the endpoints precisely because the admin console, the invite
 * flow and the developer API all reach the database through here while only one of them
 * walks the endpoint helpers - so this is the layer that has to hold.
 */

const mockDb = { permissions: [], roles: [], grants: [], users: [] };
let mockNextId = { permissions: 1, roles: 1, grants: 1, users: 1 };

function mockReset() {
  mockDb.permissions = [];
  mockDb.roles = [];
  mockDb.grants = [];
  mockDb.users = [];
  mockNextId = { permissions: 1, roles: 1, grants: 1, users: 1 };
}

function mockGrantsFor(roleId) {
  return mockDb.grants
    .filter((grant) => grant.role_id === roleId)
    .map((grant) => ({
      permission: mockDb.permissions.find((p) => p.id === grant.permission_id),
    }));
}

/** Handles the small slice of Prisma's `where` grammar these models actually emit. */
function mockMatches(row, where = {}) {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "AND")
      return condition.every((clause) => mockMatches(row, clause));
    if (condition !== null && typeof condition === "object") {
      if ("in" in condition) return condition.in.includes(row[key]);
      if ("notIn" in condition) return !condition.notIn.includes(row[key]);
      if ("not" in condition) return row[key] !== condition.not;
    }
    return row[key] === condition;
  });
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
      const row = mockDb.roles.find((r) => mockMatches(r, where));
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
  users: {
    findFirst: async ({ where }) =>
      mockDb.users.find((u) => mockMatches(u, where)) ?? null,
    findUnique: async ({ where }) =>
      mockDb.users.find((u) => u.id === where.id) ?? null,
    findMany: async ({ where = {}, take } = {}) => {
      const rows = mockDb.users.filter((u) => mockMatches(u, where));
      return take ? rows.slice(0, take) : rows;
    },
    create: async ({ data }) => {
      const row = { id: mockNextId.users++, suspended: 0, ...data };
      mockDb.users.push(row);
      return row;
    },
    update: async ({ where, data }) =>
      Object.assign(
        mockDb.users.find((u) => u.id === where.id),
        data
      ),
    updateMany: async ({ where, data }) => {
      const rows = mockDb.users.filter((u) => mockMatches(u, where));
      for (const row of rows) Object.assign(row, data);
      return { count: rows.length };
    },
    deleteMany: async ({ where }) => {
      const before = mockDb.users.length;
      mockDb.users = mockDb.users.filter((u) => !mockMatches(u, where));
      return { count: before - mockDb.users.length };
    },
    count: async ({ where = {} } = {}) =>
      mockDb.users.filter((u) => mockMatches(u, where)).length,
    groupBy: async () =>
      Object.entries(
        mockDb.users.reduce((counts, user) => {
          counts[user.role] = (counts[user.role] ?? 0) + 1;
          return counts;
        }, {})
      ).map(([role, count]) => ({ role, _count: { role: count } })),
  },
  $transaction: async (operations) => Promise.all(operations),
}));

jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: jest.fn() },
}));

const { Role } = require("../../models/role");
const { User } = require("../../models/user");
const {
  validRoleSelection,
  validCanModify,
  canModifyAdmin,
} = require("../../utils/helpers/admin");

const PASSWORD = "hunter2hunter2";

/** The instance as it looks after onboarding: one owner, one ordinary admin. */
async function seedInstance() {
  const { user: owner } = await User.createSuperAdmin({
    username: "owner",
    email: "owner@example.com",
    password: PASSWORD,
  });
  const { user: admin } = await User.create({
    username: "second-admin",
    email: "admin@example.com",
    password: PASSWORD,
    role: "admin",
  });
  return { owner, admin };
}

beforeEach(async () => {
  mockReset();
  Role.flushCache();
  await Role.seed();
});

describe("the owner role", () => {
  it("is seeded as a singleton that cannot be edited or handed out", async () => {
    const role = await Role.get({ name: SUPER_ADMIN_ROLE });
    expect(role.isSystem).toBe(true);
    expect(role.isSingleton).toBe(true);
    expect(role.isImmutable).toBe(true);
    expect(role.isAssignable).toBe(false);
    expect(role.permissions).toContain(PERMISSIONS.SYSTEM_ADMIN);
  });

  it("refuses edits to its permission set", async () => {
    const role = await Role.get({ name: SUPER_ADMIN_ROLE });
    const { role: updated, error } = await Role.update(role.id, {
      permissions: [PERMISSIONS.USERS_VIEW],
      displayName: "Something else",
    });

    expect(updated).toBeNull();
    expect(error).toMatch(/cannot be edited/i);
    expect((await Role.get({ name: SUPER_ADMIN_ROLE })).displayName).toBe(
      "Super Admin"
    );
  });

  it("cannot be deleted", async () => {
    const role = await Role.get({ name: SUPER_ADMIN_ROLE });
    const { success, error } = await Role.delete(role.id);
    expect(success).toBe(false);
    expect(error).toMatch(/cannot be deleted/i);
  });
});

describe("creating the owner", () => {
  it("is the only way an account reaches the owner role", async () => {
    const { user, error } = await User.create({
      username: "sneaky",
      email: "sneaky@example.com",
      password: PASSWORD,
      role: SUPER_ADMIN_ROLE,
    });

    expect(user).toBeNull();
    expect(error).toMatch(/cannot be assigned/i);
    expect(await Role.currentSuperAdmin()).toBeNull();
  });

  it("refuses a second owner", async () => {
    await seedInstance();
    const { user, error } = await User.createSuperAdmin({
      username: "usurper",
      email: "usurper@example.com",
      password: PASSWORD,
    });

    expect(user).toBeNull();
    expect(error).toMatch(/already has an owner/i);
    expect(await User.count({ role: SUPER_ADMIN_ROLE })).toBe(1);
  });
});

describe("protecting the owner account", () => {
  it("refuses to delete it, even through a broad clause", async () => {
    const { owner } = await seedInstance();

    expect(await User.delete({ id: owner.id })).toBe(false);
    // A `deleteMany` that happens to sweep the owner up is refused outright rather
    // than quietly skipping the row.
    expect(
      await User.delete({ role: { in: ["admin", SUPER_ADMIN_ROLE] } })
    ).toBe(false);
    expect(await User.count({ role: SUPER_ADMIN_ROLE })).toBe(1);
  });

  it("still deletes everyone else", async () => {
    const { admin } = await seedInstance();
    expect(await User.delete({ id: admin.id })).toBe(true);
    expect(await User.count({ role: "admin" })).toBe(0);
  });

  it("refuses to demote or suspend it", async () => {
    const { owner } = await seedInstance();

    const demoted = await User.update(owner.id, { role: "default" });
    expect(demoted.success).toBe(false);
    expect(demoted.error).toMatch(/transfer ownership/i);

    const suspended = await User.update(owner.id, { suspended: 1 });
    expect(suspended.success).toBe(false);
    expect(suspended.error).toMatch(/cannot be suspended/i);
  });

  it("refuses the same through the direct-update escape hatch", async () => {
    const { owner } = await seedInstance();
    const { user, message } = await User._update(owner.id, { suspended: 1 });
    expect(user).toBeNull();
    expect(message).toMatch(/cannot be suspended/i);
  });

  it("lets the owner change their own profile", async () => {
    const { owner } = await seedInstance();
    const { success } = await User.update(owner.id, { bio: "Runs the place" });
    expect(success).toBe(true);
  });
});

describe("ownership transfer", () => {
  it("promotes the new owner and demotes the old one in one step", async () => {
    const { owner, admin } = await seedInstance();

    const { success, from, to } = await User.transferSuperAdmin(admin.id);
    expect(success).toBe(true);
    expect(from.id).toBe(owner.id);
    expect(to.id).toBe(admin.id);

    expect((await User.get({ id: admin.id })).role).toBe(SUPER_ADMIN_ROLE);
    expect((await User.get({ id: owner.id })).role).toBe("admin");
    expect(await User.count({ role: SUPER_ADMIN_ROLE })).toBe(1);
  });

  it("refuses a suspended account", async () => {
    const { admin } = await seedInstance();
    await User.update(admin.id, { suspended: 1 });

    const { success, error } = await User.transferSuperAdmin(admin.id);
    expect(success).toBe(false);
    expect(error).toMatch(/suspended/i);
  });

  it("refuses an account that already owns the instance", async () => {
    const { owner } = await seedInstance();
    const { success, error } = await User.transferSuperAdmin(owner.id);
    expect(success).toBe(false);
    expect(error).toMatch(/already owns/i);
  });
});

describe("the admin console guards", () => {
  it("never offers the owner role, not even to the owner", async () => {
    const owner = { id: 1, role: SUPER_ADMIN_ROLE };
    const check = await validRoleSelection(owner, { role: SUPER_ADMIN_ROLE });
    expect(check.valid).toBe(false);
    expect(check.error).toMatch(/transfer ownership/i);
  });

  it("treats an unchanged role as no assignment at all", async () => {
    const owner = { id: 1, role: SUPER_ADMIN_ROLE };
    const check = await validRoleSelection(
      owner,
      { role: SUPER_ADMIN_ROLE },
      { id: 1, role: SUPER_ADMIN_ROLE }
    );
    expect(check.valid).toBe(true);
  });

  it("keeps other administrators out of the owner's account", async () => {
    const admin = { id: 2, role: "admin" };
    const owner = { id: 1, role: SUPER_ADMIN_ROLE };

    expect((await validCanModify(admin, owner)).valid).toBe(false);
    expect((await validCanModify(owner, owner)).valid).toBe(true);
  });

  it("refuses to move the owner off their role", async () => {
    const owner = { id: 1, role: SUPER_ADMIN_ROLE };
    const check = await canModifyAdmin(owner, { role: "admin" });
    expect(check.valid).toBe(false);
    expect(check.error).toMatch(/transfer ownership/i);
  });
});

describe("owner continuity on upgrade", () => {
  it("promotes the earliest administrator when nobody owns the instance", async () => {
    // An instance that predates the owner role: administrators, but no owner.
    const { user: first } = await User.create({
      username: "founder",
      email: "founder@example.com",
      password: PASSWORD,
      role: "admin",
    });
    await User.create({
      username: "later-admin",
      email: "later@example.com",
      password: PASSWORD,
      role: "admin",
    });

    const { ensureSuperAdminExists } = require("../../utils/boot/superAdmin");
    const { promoted, username } = await ensureSuperAdminExists();

    expect(promoted).toBe(true);
    expect(username).toBe("founder");
    expect((await User.get({ id: first.id })).role).toBe(SUPER_ADMIN_ROLE);
  });

  it("does nothing on an instance that already has an owner", async () => {
    await seedInstance();
    const { ensureSuperAdminExists } = require("../../utils/boot/superAdmin");

    expect((await ensureSuperAdminExists()).promoted).toBe(false);
    expect(await User.count({ role: SUPER_ADMIN_ROLE })).toBe(1);
  });

  it("does nothing on a fresh install with no accounts", async () => {
    const { ensureSuperAdminExists } = require("../../utils/boot/superAdmin");
    expect((await ensureSuperAdminExists()).promoted).toBe(false);
  });
});

describe("instance reset", () => {
  const { SystemReset } = require("../../models/systemReset");

  it("pulls in the scopes another scope implies", () => {
    // Deleting workspaces necessarily takes their chats with them, so asking for one
    // without the other is not a state the reset can actually produce.
    expect(SystemReset.resolveScopes(["workspaces"])).toEqual([
      "chats",
      "workspaces",
    ]);
  });

  it("drops scope keys it does not recognise", () => {
    expect(SystemReset.resolveScopes(["chats", "everything", null])).toEqual([
      "chats",
    ]);
    expect(SystemReset.resolveScopes("chats")).toEqual([]);
  });

  it("refuses anyone who is not the owner, whatever their role grants", async () => {
    const admin = { id: 2, role: "admin" };
    const { success, error } = await SystemReset.execute({
      scopes: ["chats"],
      actor: admin,
    });

    expect(success).toBe(false);
    expect(error).toMatch(/only the super admin/i);
  });

  it("refuses an empty selection", async () => {
    const owner = { id: 1, role: SUPER_ADMIN_ROLE };
    const { success, error } = await SystemReset.execute({
      scopes: [],
      actor: owner,
    });

    expect(success).toBe(false);
    expect(error).toMatch(/at least one/i);
  });
});
