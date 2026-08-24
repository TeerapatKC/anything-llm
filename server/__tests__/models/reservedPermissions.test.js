const {
  PERMISSIONS,
  SUPER_ADMIN_ROLE,
  ADMIN_ROLE,
  DEFAULT_RESERVED_PERMISSIONS,
} = require("../../utils/permissions");

/**
 * Permissions the owner reserves to themselves.
 *
 * The point of the feature is that reserving a permission is a real access decision, not
 * a hidden menu entry: `admin` carries the `system.admin` wildcard, so if the rule were
 * only applied in the UI an administrator would still pass every route gate. These tests
 * therefore assert against `Role.userCan`, which is what the gates, the frontend's cached
 * permission list and the privilege-escalation checks all go through.
 */

const mockDb = { permissions: [], roles: [], grants: [], settings: [] };
let mockNextId = { permissions: 1, roles: 1, grants: 1, settings: 1 };

function mockReset() {
  mockDb.permissions = [];
  mockDb.roles = [];
  mockDb.grants = [];
  mockDb.settings = [];
  mockNextId = { permissions: 1, roles: 1, grants: 1, settings: 1 };
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
        where.name !== undefined ? r.name === where.name : r.id === where.id
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
  system_settings: {
    findFirst: async ({ where }) =>
      mockDb.settings.find((s) => s.label === where.label) ?? null,
    upsert: async ({ where, update, create }) => {
      const existing = mockDb.settings.find((s) => s.label === where.label);
      if (existing) return Object.assign(existing, update);
      const row = { id: mockNextId.settings++, ...create };
      mockDb.settings.push(row);
      return row;
    },
  },
  $transaction: async (operations) => Promise.all(operations),
}));

const { Role } = require("../../models/role");
const { ReservedPermissions } = require("../../models/reservedPermissions");

const OWNER = { role: SUPER_ADMIN_ROLE };
const ADMIN = { role: ADMIN_ROLE };
const MANAGER = { role: "manager" };

beforeEach(async () => {
  mockReset();
  Role.flushCache();
  ReservedPermissions.flushCache();
  await Role.seed();
});

describe("the reserved list itself", () => {
  it("defaults to the provider settings when nobody has chosen", async () => {
    expect(await ReservedPermissions.get()).toEqual(DEFAULT_RESERVED_PERMISSIONS);
  });

  it("distinguishes 'never configured' from 'deliberately nothing'", async () => {
    await ReservedPermissions.set([]);
    // A stored empty list must not fall back to the shipped default, or an owner could
    // never actually un-reserve everything.
    expect(await ReservedPermissions.get()).toEqual([]);
  });

  it("drops keys that are not real system permissions", async () => {
    const { reserved } = await ReservedPermissions.set([
      PERMISSIONS.SYSTEM_SETTINGS_LLM,
      "not.a.permission",
      "workspace.chat", // workspace scope is never instance-wide
    ]);
    expect(reserved).toEqual([PERMISSIONS.SYSTEM_SETTINGS_LLM]);
  });

  it("refuses to reserve the wildcard itself", async () => {
    // Reserving `system.admin` would strip administrators of everything at once rather
    // than of one capability.
    const { reserved } = await ReservedPermissions.set([
      PERMISSIONS.SYSTEM_ADMIN,
      PERMISSIONS.SYSTEM_API_KEYS,
    ]);
    expect(reserved).toEqual([PERMISSIONS.SYSTEM_API_KEYS]);
  });
});

describe("enforcement", () => {
  it("keeps the reserved permission for the owner", async () => {
    await ReservedPermissions.set([PERMISSIONS.SYSTEM_SETTINGS_LLM]);
    expect(
      await Role.userCan(OWNER, PERMISSIONS.SYSTEM_SETTINGS_LLM)
    ).toBe(true);
  });

  it("takes it away from an admin despite the system.admin wildcard", async () => {
    // Cleared first: the shipped default already reserves the provider settings, so
    // without this the "before" state would not prove the reservation is what did it.
    await ReservedPermissions.set([]);
    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_SETTINGS_LLM)).toBe(
      true
    );

    await ReservedPermissions.set([PERMISSIONS.SYSTEM_SETTINGS_LLM]);

    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_SETTINGS_LLM)).toBe(
      false
    );
  });

  it("reserves the AI provider settings out of the box", async () => {
    // The instance ships locked down: an administrator does not get the provider
    // credentials until the owner decides otherwise.
    for (const permission of DEFAULT_RESERVED_PERMISSIONS) {
      expect(await Role.userCan(ADMIN, permission)).toBe(false);
      expect(await Role.userCan(OWNER, permission)).toBe(true);
    }
  });

  it("leaves every other permission of that admin intact", async () => {
    await ReservedPermissions.set([PERMISSIONS.SYSTEM_SETTINGS_LLM]);

    expect(await Role.userCan(ADMIN, PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_APPEARANCE)).toBe(true);
    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_ADMIN)).toBe(true);
  });

  it("also strips it from a role that reaches it through a coarse parent", async () => {
    // `manager` is granted `system.appearance`; its children come from expansion, so the
    // subtraction has to happen after expansion or reserving a child would do nothing.
    expect(
      await Role.userCan(MANAGER, PERMISSIONS.SYSTEM_APPEARANCE_BRANDING)
    ).toBe(true);

    await ReservedPermissions.set([PERMISSIONS.SYSTEM_APPEARANCE_BRANDING]);

    expect(
      await Role.userCan(MANAGER, PERMISSIONS.SYSTEM_APPEARANCE_BRANDING)
    ).toBe(false);
    // The sibling it did not reserve is untouched.
    expect(
      await Role.userCan(MANAGER, PERMISSIONS.SYSTEM_APPEARANCE_FOOTER)
    ).toBe(true);
  });

  it("keeps it out of the permission list handed to the frontend", async () => {
    await ReservedPermissions.set([PERMISSIONS.SYSTEM_SETTINGS_LLM]);

    const adminHolds = await Role.permissionsForUser(ADMIN);
    const ownerHolds = await Role.permissionsForUser(OWNER);

    expect(adminHolds).not.toContain(PERMISSIONS.SYSTEM_SETTINGS_LLM);
    expect(ownerHolds).toContain(PERMISSIONS.SYSTEM_SETTINGS_LLM);
  });

  it("takes effect immediately rather than after a restart", async () => {
    // Warm the cache first, so a stale memoised set would be caught here.
    await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_API_KEYS);

    await ReservedPermissions.set([PERMISSIONS.SYSTEM_API_KEYS]);

    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_API_KEYS)).toBe(false);
  });

  it("gives the permission back when it is un-reserved", async () => {
    await ReservedPermissions.set([PERMISSIONS.SYSTEM_API_KEYS]);
    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_API_KEYS)).toBe(false);

    await ReservedPermissions.set([]);
    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_API_KEYS)).toBe(true);
  });
});

describe("the environment keys a settings save may write", () => {
  const { permissionForEnvKey } = require("../../utils/permissions");

  it("routes each provider family to the permission that governs its page", () => {
    // The settings pages all post to one endpoint as raw environment keys, so without
    // this an admin who lost `system.settings.llm` could still set `OpenAiKey` directly.
    expect(permissionForEnvKey("LLMProvider")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS_LLM
    );
    expect(permissionForEnvKey("OpenAiKey")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS_LLM
    );
    expect(permissionForEnvKey("EmbeddingEngine")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS_EMBEDDER
    );
    expect(permissionForEnvKey("VectorDB")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS_VECTOR_DB
    );
    expect(permissionForEnvKey("WhisperProvider")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS_TRANSCRIPTION
    );
    expect(permissionForEnvKey("ImageGenerationProvider")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS_IMAGE_GENERATION
    );
    expect(permissionForEnvKey("ModelRouterId")).toBe(
      PERMISSIONS.SYSTEM_MODEL_ROUTING
    );
  });

  it("keeps text splitting out of the embedder family", () => {
    // "EmbeddingModelMaxChunkLength" reads like both; chunking is its own page and its
    // own permission, so the ordering of the rules matters.
    expect(permissionForEnvKey("TextSplitterChunkSize")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS_TEXT_SPLITTING
    );
    expect(permissionForEnvKey("MaxEmbedChunkSize")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS_TEXT_SPLITTING
    );
  });

  it("leaves anything it does not recognise on the coarse settings permission", () => {
    // Unmapped keys must behave exactly as they did before, so this can only ever narrow
    // the families named above rather than lock someone out of an unrelated setting.
    expect(permissionForEnvKey("SupportEmail")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS
    );
    expect(permissionForEnvKey("MessageLimit")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS
    );
    expect(permissionForEnvKey("")).toBe(PERMISSIONS.SYSTEM_SETTINGS);
  });

  it("means a reserved family is unwritable by an admin", async () => {
    await ReservedPermissions.set([PERMISSIONS.SYSTEM_SETTINGS_LLM]);
    const granted = new Set(await Role.permissionsForUser(ADMIN));

    // This is the check `/system/update-env` runs per key.
    expect(granted.has(permissionForEnvKey("OpenAiKey"))).toBe(false);
    // ...while the settings they still own are unaffected.
    expect(granted.has(permissionForEnvKey("SupportEmail"))).toBe(true);
    expect(granted.has(permissionForEnvKey("VectorDB"))).toBe(true);
  });
});

describe("the shipped preset", () => {
  const { permissionForEnvKey } = require("../../utils/permissions");

  it("covers exactly the AI provider settings and nothing else", () => {
    // The preset is the behaviour the owner signed off on: provider configuration is
    // theirs, everything else keeps following the roles that have been defined.
    expect([...DEFAULT_RESERVED_PERMISSIONS].sort()).toEqual(
      [
        PERMISSIONS.SYSTEM_SETTINGS_LLM,
        PERMISSIONS.SYSTEM_SETTINGS_EMBEDDER,
        PERMISSIONS.SYSTEM_SETTINGS_VECTOR_DB,
        PERMISSIONS.SYSTEM_SETTINGS_TRANSCRIPTION,
        PERMISSIONS.SYSTEM_SETTINGS_TEXT_SPLITTING,
        PERMISSIONS.SYSTEM_SETTINGS_IMAGE_GENERATION,
        PERMISSIONS.SYSTEM_MODEL_ROUTING,
      ].sort()
    );
  });

  it("never reserves a coarse permission", async () => {
    // `system.settings` is the fallback for every settings key without a permission of
    // its own, so putting it in the preset would take the support email, message limits
    // and password policy from administrators as a side effect.
    expect(DEFAULT_RESERVED_PERMISSIONS).not.toContain(
      PERMISSIONS.SYSTEM_SETTINGS
    );
    expect(DEFAULT_RESERVED_PERMISSIONS).not.toContain(
      PERMISSIONS.SYSTEM_APPEARANCE
    );
  });

  it("leaves an admin the settings the preset does not name", async () => {
    // Restores the shipped preset explicitly, so this asserts the preset rather than
    // whatever a previous test happened to leave behind.
    await ReservedPermissions.set([...DEFAULT_RESERVED_PERMISSIONS]);
    const granted = new Set(await Role.permissionsForUser(ADMIN));

    expect(granted.has(PERMISSIONS.SYSTEM_APPEARANCE)).toBe(true);
    expect(granted.has(PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(granted.has(PERMISSIONS.SYSTEM_SETTINGS_SECURITY)).toBe(true);
    expect(granted.has(PERMISSIONS.SYSTEM_SETTINGS_PRIVACY)).toBe(true);
    // The unmapped-settings fallback stays with them, so the support email and the
    // password policy remain writable.
    expect(granted.has(permissionForEnvKey("SupportEmail"))).toBe(true);
    expect(granted.has(permissionForEnvKey("PasswordMinChar"))).toBe(true);
  });
});

describe("reserving a coarse permission", () => {
  it("covers everything beneath it", async () => {
    // Ticking "Manage system settings" has to close the LLM and vector database pages
    // too. Subtracting the exact key alone left them open while the screen read as
    // though the whole group had been locked - which is how an owner ends up believing
    // they have reserved something they have not.
    await ReservedPermissions.set([PERMISSIONS.SYSTEM_SETTINGS]);

    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_SETTINGS)).toBe(false);
    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_SETTINGS_LLM)).toBe(
      false
    );
    expect(
      await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_SETTINGS_VECTOR_DB)
    ).toBe(false);
    expect(
      await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_SETTINGS_EMBEDDER)
    ).toBe(false);

    // The owner keeps the lot.
    expect(await Role.userCan(OWNER, PERMISSIONS.SYSTEM_SETTINGS_LLM)).toBe(
      true
    );
  });

  it("does not spill into a different branch of the tree", async () => {
    await ReservedPermissions.set([PERMISSIONS.SYSTEM_SETTINGS]);

    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_APPEARANCE)).toBe(true);
    expect(
      await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_APPEARANCE_BRANDING)
    ).toBe(true);
    expect(await Role.userCan(ADMIN, PERMISSIONS.USERS_MANAGE)).toBe(true);
  });

  it("reserving one child leaves its siblings alone", async () => {
    await ReservedPermissions.set([PERMISSIONS.SYSTEM_SETTINGS_LLM]);

    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_SETTINGS_LLM)).toBe(
      false
    );
    expect(
      await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_SETTINGS_EMBEDDER)
    ).toBe(true);
    // The parent itself is still theirs, so unmapped settings keep working.
    expect(await Role.userCan(ADMIN, PERMISSIONS.SYSTEM_SETTINGS)).toBe(true);
  });
});
