const fs = require("fs");
const os = require("os");
const path = require("path");
const { SUPER_ADMIN_ROLE } = require("../../utils/permissions");

/**
 * Factory reset.
 *
 * The most destructive path in the application, so it is exercised against a table-shaped
 * in-memory database rather than trusted to review. What matters is not just that rows go
 * away, but the three things that make the reset *stick*:
 *
 *   1. every table is emptied even when foreign keys force a particular order;
 *   2. the built-in roles and permission catalog come back, as they would on a first boot;
 *   3. the managed environment keys are cleared - without that, `markOnboarded` sees a
 *      surviving `JWT_SECRET` on the next restart and quietly marks the instance onboarded
 *      again, undoing the whole thing.
 */

const mockDb = { tables: {} };

function mockSeed(table, rows) {
  mockDb.tables[table] = rows;
}

/**
 * A table whose rows are hidden behind the mock's own foreign-key rule, so the retry loop
 * in `_wipeEverything` is genuinely exercised rather than assumed.
 */
const mockFkGuards = {
  workspaces: "workspace_documents",
  roles: "role_permissions",
};

function mockTable(name) {
  return {
    count: async () => (mockDb.tables[name] ?? []).length,
    findMany: async () => mockDb.tables[name] ?? [],
    deleteMany: async () => {
      const blocker = mockFkGuards[name];
      if (blocker && (mockDb.tables[blocker] ?? []).length > 0)
        throw new Error(
          `Foreign key constraint failed: ${blocker} still references ${name}`
        );
      const count = (mockDb.tables[name] ?? []).length;
      mockDb.tables[name] = [];
      return { count };
    },
  };
}

jest.mock("../../utils/prisma", () => {
  // Every table the reset touches, resolved lazily so the list stays the model's business.
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "then") return undefined; // not a thenable
        return mockTable(String(prop));
      },
    }
  );
});

jest.mock("../../models/role", () => ({
  Role: {
    isSuperAdmin: (user) => user?.role === "super-admin",
    flushCache: jest.fn(),
    seed: jest.fn(async () => {
      mockDb.tables.roles = [{ id: 1, name: "super-admin" }];
      mockDb.tables.permissions = [{ id: 1, key: "system.admin" }];
    }),
  },
}));

jest.mock("../../models/workspaceRole", () => ({
  WorkspaceRole: {
    flushCache: jest.fn(),
    seed: jest.fn(async () => {
      mockDb.tables.workspace_roles = [{ id: 1, name: "member" }];
    }),
  },
}));

const { SystemReset } = require("../../models/systemReset");

const OWNER = { id: 1, username: "owner", role: SUPER_ADMIN_ROLE };
let envDir = null;

beforeEach(() => {
  mockDb.tables = {};
  for (const table of SystemReset.FACTORY_WIPE_TABLES)
    mockDb.tables[table] = [];

  mockSeed("users", [{ id: 1 }, { id: 2 }]);
  mockSeed("workspaces", [
    { id: 1, slug: "alpha" },
    { id: 2, slug: "beta" },
  ]);
  mockSeed("workspace_documents", [{ id: 1 }, { id: 2 }, { id: 3 }]);
  mockSeed("workspace_chats", [{ id: 1 }, { id: 2 }]);
  mockSeed("roles", [{ id: 1 }, { id: 2 }]);
  mockSeed("role_permissions", [{ id: 1 }]);

  // The reset writes to disk; point it at a scratch copy so the real env file is never
  // touched, and clearing the vector store / namespaces is not this file's subject.
  envDir = fs.mkdtempSync(path.join(os.tmpdir(), "allm-factory-"));
  jest
    .spyOn(SystemReset, "_envFilePaths")
    .mockReturnValue([path.join(envDir, ".env")]);
  jest.spyOn(SystemReset, "_wipeStorage").mockReturnValue({ filesRemoved: 0 });
  jest.spyOn(SystemReset, "_dropAllVectorNamespaces").mockResolvedValue(2);
});

afterEach(() => {
  jest.restoreAllMocks();
  if (envDir) fs.rmSync(envDir, { recursive: true, force: true });
});

describe("factory reset", () => {
  it("refuses anyone who is not the owner", async () => {
    const { success, error } = await SystemReset.factoryReset({
      actor: { id: 2, role: "admin" },
    });

    expect(success).toBe(false);
    expect(error).toMatch(/only the super admin/i);
    expect(mockDb.tables.users).toHaveLength(2);
  });

  it("empties every table, the owner's own account included", async () => {
    const { success, results } = await SystemReset.factoryReset({
      actor: OWNER,
    });

    expect(success).toBe(true);
    expect(mockDb.tables.users).toHaveLength(0);
    expect(mockDb.tables.workspaces).toHaveLength(0);
    expect(mockDb.tables.workspace_documents).toHaveLength(0);
    expect(results.unresolvedTables).toEqual([]);
    expect(results.records).toBeGreaterThan(0);
  });

  it("retries tables a foreign key refuses on the first pass", async () => {
    // `workspaces` cannot go until `workspace_documents` has, and `roles` cannot go until
    // `role_permissions` has - both of which the wipe only discovers by being told no.
    const { results } = await SystemReset.factoryReset({ actor: OWNER });

    expect(results.unresolvedTables).toEqual([]);
    expect(results.tables.workspaces).toBe(2);
    expect(results.tables.roles).toBe(2);
  });

  it("puts the built-in roles and permissions back", async () => {
    const { Role } = require("../../models/role");
    const { WorkspaceRole } = require("../../models/workspaceRole");

    await SystemReset.factoryReset({ actor: OWNER });

    expect(Role.seed).toHaveBeenCalled();
    expect(WorkspaceRole.seed).toHaveBeenCalled();
    // Re-seeded after the wipe, not before it - otherwise the fresh rows are deleted.
    expect(mockDb.tables.roles).toHaveLength(1);
    expect(mockDb.tables.permissions).toHaveLength(1);
  });

  it("clears the managed environment keys so the next boot does not re-onboard", async () => {
    process.env.JWT_SECRET = "a-secret";
    process.env.LLM_PROVIDER = "openai";
    process.env.VECTOR_DB = "lancedb";
    process.env.OPEN_AI_KEY = "sk-test";
    process.env.DISABLE_TELEMETRY = "true";

    const { results } = await SystemReset.factoryReset({ actor: OWNER });

    // These three are exactly what `utils/boot/markOnboarded` treats as proof of a
    // completed setup, so a factory reset that left any of them behind would be undone
    // by the next restart.
    expect(process.env.JWT_SECRET).toBeUndefined();
    expect(process.env.LLM_PROVIDER).toBeUndefined();
    expect(process.env.VECTOR_DB).toBeUndefined();
    expect(process.env.OPEN_AI_KEY).toBeUndefined();
    // Telemetry is a deployment policy rather than instance content.
    expect(process.env.DISABLE_TELEMETRY).toBe("true");
    expect(results.providerSettings).toBe(4);

    delete process.env.DISABLE_TELEMETRY;
  });

  it("rewrites the env file without disturbing comments or unmanaged keys", async () => {
    const envPath = path.join(envDir, ".env");
    fs.writeFileSync(
      envPath,
      [
        "# hand written comment",
        "STORAGE_DIR='/app/storage'",
        "JWT_SECRET='a-secret'",
        "OPEN_AI_KEY='sk-test'",
        "SIG_KEY='keep-me'",
        "",
      ].join("\n")
    );
    process.env.JWT_SECRET = "a-secret";

    await SystemReset.factoryReset({ actor: OWNER });

    const written = fs.readFileSync(envPath, "utf8");
    expect(written).toContain("# hand written comment");
    expect(written).toContain("STORAGE_DIR='/app/storage'");
    expect(written).toContain("SIG_KEY='keep-me'");
    expect(written).not.toContain("JWT_SECRET");
    expect(written).not.toContain("OPEN_AI_KEY");
  });

  it("reports what a factory reset would remove before running one", async () => {
    const summary = await SystemReset.factoryPreview();
    expect(summary.users).toBe(2);
    expect(summary.workspaces).toBe(2);
    expect(summary.records).toBeGreaterThan(0);
  });
});

describe("the factory wipe list", () => {
  it("covers every model in the schema", () => {
    // A factory reset that misses a table leaves the next owner looking at the previous
    // deployment's data, so this compares the list against the schema itself rather than
    // trusting whoever adds the next model to remember this file.
    const schema = fs.readFileSync(
      path.resolve(__dirname, "../../prisma/schema.prisma"),
      "utf8"
    );
    const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map(
      (m) => m[1]
    );

    expect([...SystemReset.FACTORY_WIPE_TABLES].sort()).toEqual(
      [...models].sort()
    );
  });
});
