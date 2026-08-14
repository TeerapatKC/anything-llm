const fs = require("fs");
const path = require("path");
const {
  PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  ALL_PERMISSION_KEYS,
  SYSTEM_ROLES,
  FALLBACK_ROLE,
  SUPER_ADMIN_ROLE,
  SETTINGS_ROUTE_PERMISSIONS,
  permissionForSetting,
} = require("../../utils/permissions");

describe("permission catalog", () => {
  it("has no duplicate keys", () => {
    expect(new Set(ALL_PERMISSION_KEYS).size).toBe(ALL_PERMISSION_KEYS.length);
  });

  it("gives every permission a label, description and known category", () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.label).toBeTruthy();
      expect(permission.description).toBeTruthy();
      expect(PERMISSION_CATEGORIES).toHaveProperty(permission.category);
    }
  });

  it("keeps the PERMISSIONS map and the catalog in sync", () => {
    const mapped = Object.entries(PERMISSIONS)
      .filter(([name]) => name !== "ANY")
      .map(([, key]) => key);
    expect(mapped.sort()).toEqual([...ALL_PERMISSION_KEYS].sort());
  });

  it("only references real permissions from the system role presets", () => {
    for (const role of SYSTEM_ROLES) {
      for (const permission of [
        ...role.permissions,
        ...role.protectedPermissions,
      ])
        expect(ALL_PERMISSION_KEYS).toContain(permission);
    }
  });

  it("seeds the fallback and super-admin roles", () => {
    const names = SYSTEM_ROLES.map((role) => role.name);
    expect(names).toContain(FALLBACK_ROLE);
    expect(names).toContain(SUPER_ADMIN_ROLE);
    expect(
      SYSTEM_ROLES.find((role) => role.name === SUPER_ADMIN_ROLE)
        .protectedPermissions
    ).toContain(PERMISSIONS.SUPER_ADMIN);
  });

  it("preserves the legacy role boundaries so upgrades change nothing", () => {
    const manager = SYSTEM_ROLES.find((role) => role.name === "manager");
    const member = SYSTEM_ROLES.find((role) => role.name === "default");

    // Managers ran workspaces, documents and people but never instance config.
    expect(manager.permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.USERS_MANAGE,
        PERMISSIONS.INVITES_MANAGE,
        PERMISSIONS.WORKSPACES_CREATE,
        PERMISSIONS.WORKSPACES_DELETE,
        PERMISSIONS.DOCUMENTS_MANAGE,
        PERMISSIONS.CHATS_VIEW_ALL,
      ])
    );
    expect(manager.permissions).not.toContain(PERMISSIONS.SUPER_ADMIN);
    expect(manager.permissions).not.toContain(PERMISSIONS.SYSTEM_SETTINGS);
    expect(manager.permissions).not.toContain(PERMISSIONS.ROLES_MANAGE);

    // Default users could only chat in the workspaces they were added to.
    expect(member.permissions).toEqual([PERMISSIONS.CHATS_SEND]);
  });
});

describe("system setting permissions", () => {
  it("routes branding settings to the appearance permission", () => {
    for (const label of [
      "custom_app_name",
      "footer_data",
      "support_email",
      "meta_page_title",
      "meta_page_favicon",
    ])
      expect(permissionForSetting(label)).toBe(PERMISSIONS.SYSTEM_APPEARANCE);
  });

  it("falls back to the general system settings permission", () => {
    expect(permissionForSetting("text_splitter_chunk_size")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS
    );
    expect(permissionForSetting("some_future_setting")).toBe(
      PERMISSIONS.SYSTEM_SETTINGS
    );
  });

  it("exposes every setting permission as a route gate", () => {
    expect(SETTINGS_ROUTE_PERMISSIONS).toContain(PERMISSIONS.SYSTEM_SETTINGS);
    expect(SETTINGS_ROUTE_PERMISSIONS).toContain(PERMISSIONS.SYSTEM_APPEARANCE);
    expect(SETTINGS_ROUTE_PERMISSIONS).toContain(
      PERMISSIONS.AGENTS_MANAGE_SKILLS
    );
    expect(new Set(SETTINGS_ROUTE_PERMISSIONS).size).toBe(
      SETTINGS_ROUTE_PERMISSIONS.length
    );
  });
});

describe("route guards", () => {
  const serverRoot = path.resolve(__dirname, "..", "..");

  function jsFilesIn(dir, found = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", "storage", "__tests__"].includes(entry.name))
        continue;
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) jsFilesIn(target, found);
      else if (entry.name.endsWith(".js")) found.push(target);
    }
    return found;
  }

  it("never references a permission that does not exist", () => {
    const unknown = [];
    for (const file of jsFilesIn(serverRoot)) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(/PERMISSIONS\.([A-Z_]+)/g)) {
        if (!PERMISSIONS.hasOwnProperty(match[1]))
          unknown.push(`${path.relative(serverRoot, file)}: ${match[1]}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("no longer gates anything on a hardcoded role name", () => {
    const offenders = [];
    for (const file of jsFilesIn(serverRoot)) {
      const source = fs.readFileSync(file, "utf8");
      if (/\brole\s*===\s*["'](admin|manager|default)["']/.test(source))
        offenders.push(path.relative(serverRoot, file));
      if (/\brole\s*!==\s*["'](admin|manager|default)["']/.test(source))
        offenders.push(path.relative(serverRoot, file));
    }
    expect(offenders).toEqual([]);
  });
});

describe("frontend mirror", () => {
  it("declares exactly the same permission keys as the server", () => {
    const mirror = fs.readFileSync(
      path.resolve(__dirname, "../../../frontend/src/utils/permissions.js"),
      "utf8"
    );
    const mirrored = [...mirror.matchAll(/^\s+[A-Z_]+: "([a-z_.]+)",$/gm)].map(
      (match) => match[1]
    );
    expect(mirrored.sort()).toEqual([...ALL_PERMISSION_KEYS].sort());
  });
});
