const fs = require("fs");
const path = require("path");
const {
  SCOPES,
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  ALL_PERMISSION_KEYS,
  SYSTEM_PERMISSION_KEYS,
  WORKSPACE_PERMISSION_KEYS,
  SYSTEM_ROLES,
  WORKSPACE_ROLES,
  FALLBACK_ROLE,
  SUPER_ADMIN_ROLE,
  FALLBACK_WORKSPACE_ROLE,
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

  it("keeps the system PERMISSIONS map and the catalog in sync", () => {
    const mapped = Object.entries(PERMISSIONS)
      .filter(([name]) => name !== "ANY")
      .map(([, key]) => key);
    expect(mapped.sort()).toEqual([...SYSTEM_PERMISSION_KEYS].sort());
  });

  it("keeps the WORKSPACE_PERMISSIONS map and the catalog in sync", () => {
    expect(Object.values(WORKSPACE_PERMISSIONS).sort()).toEqual(
      [...WORKSPACE_PERMISSION_KEYS].sort()
    );
  });
});

describe("scope separation", () => {
  it("puts every permission in exactly one scope", () => {
    const overlap = SYSTEM_PERMISSION_KEYS.filter((key) =>
      WORKSPACE_PERMISSION_KEYS.includes(key)
    );
    expect(overlap).toEqual([]);
    expect(
      SYSTEM_PERMISSION_KEYS.length + WORKSPACE_PERMISSION_KEYS.length
    ).toBe(ALL_PERMISSION_KEYS.length);
  });

  it("keeps each category wholly inside one scope", () => {
    for (const permission of PERMISSION_CATALOG)
      expect(PERMISSION_CATEGORIES[permission.category].scope).toBe(
        permission.scope
      );
  });

  it("namespaces workspace permissions so the two can never be confused", () => {
    for (const key of WORKSPACE_PERMISSION_KEYS)
      expect(key.startsWith("workspace.")).toBe(true);
    for (const key of SYSTEM_PERMISSION_KEYS)
      expect(key.startsWith("workspace.")).toBe(false);
  });

  it("exposes both scope names", () => {
    expect(SCOPES.SYSTEM).toBe("system");
    expect(SCOPES.WORKSPACE).toBe("workspace");
  });
});

describe("built-in roles", () => {
  it("only references real permissions, in the right scope", () => {
    for (const role of SYSTEM_ROLES)
      for (const permission of [
        ...role.permissions,
        ...role.protectedPermissions,
      ])
        expect(SYSTEM_PERMISSION_KEYS).toContain(permission);

    for (const role of WORKSPACE_ROLES)
      for (const permission of role.permissions)
        expect(WORKSPACE_PERMISSION_KEYS).toContain(permission);
  });

  it("seeds the fallback and super-admin system roles", () => {
    const names = SYSTEM_ROLES.map((role) => role.name);
    expect(names).toContain(FALLBACK_ROLE);
    expect(names).toContain(SUPER_ADMIN_ROLE);
    expect(
      SYSTEM_ROLES.find((role) => role.name === SUPER_ADMIN_ROLE)
        .protectedPermissions
    ).toContain(PERMISSIONS.SUPER_ADMIN);
  });

  it("seeds the workspace roles with exactly one default", () => {
    const names = WORKSPACE_ROLES.map((role) => role.name);
    expect(names).toContain(FALLBACK_WORKSPACE_ROLE);
    expect(WORKSPACE_ROLES.filter((role) => role.isDefault)).toHaveLength(1);
  });

  it("gives the default workspace role what a plain member had before", () => {
    const fallback = WORKSPACE_ROLES.find((role) => role.isDefault);
    expect(fallback.permissions).toEqual(
      expect.arrayContaining([
        WORKSPACE_PERMISSIONS.VIEW,
        WORKSPACE_PERMISSIONS.CHAT,
      ])
    );
    // Plain members could not add documents or manage the workspace before.
    expect(fallback.permissions).not.toContain(
      WORKSPACE_PERMISSIONS.DOCUMENTS_UPLOAD
    );
    expect(fallback.permissions).not.toContain(
      WORKSPACE_PERMISSIONS.MEMBERS_MANAGE
    );
    expect(fallback.permissions).not.toContain(WORKSPACE_PERMISSIONS.DELETE);
  });

  it("escalates cleanly from viewer to workspace manager", () => {
    const of = (name) =>
      WORKSPACE_ROLES.find((role) => role.name === name).permissions;
    // Each rung is a superset of the one below it.
    for (const [lower, higher] of [
      ["viewer", "member"],
      ["member", "contributor"],
      ["contributor", "workspace-manager"],
    ])
      expect(of(higher)).toEqual(expect.arrayContaining(of(lower)));

    expect(of("viewer")).not.toContain(WORKSPACE_PERMISSIONS.CHAT);
    expect(of("workspace-manager")).toEqual(
      expect.arrayContaining(WORKSPACE_PERMISSION_KEYS)
    );
  });

  it("preserves the legacy role boundaries so upgrades change nothing", () => {
    const manager = SYSTEM_ROLES.find((role) => role.name === "manager");
    const member = SYSTEM_ROLES.find((role) => role.name === "default");

    // Managers ran every workspace and looked after people, never instance config.
    expect(manager.permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.USERS_MANAGE,
        PERMISSIONS.INVITES_MANAGE,
        PERMISSIONS.WORKSPACES_CREATE,
        PERMISSIONS.WORKSPACES_MANAGE_ALL,
        PERMISSIONS.DOCUMENTS_MANAGE,
        PERMISSIONS.CHATS_VIEW_ALL,
      ])
    );
    expect(manager.permissions).not.toContain(PERMISSIONS.SUPER_ADMIN);
    expect(manager.permissions).not.toContain(PERMISSIONS.SYSTEM_SETTINGS);
    expect(manager.permissions).not.toContain(PERMISSIONS.ROLES_MANAGE);

    // Default users hold nothing instance-wide - everything they can do now comes
    // from the workspace role they hold in each workspace.
    expect(member.permissions).toEqual([]);
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

  const sources = () =>
    jsFilesIn(serverRoot).map((file) => ({
      file: path.relative(serverRoot, file),
      source: fs.readFileSync(file, "utf8"),
    }));

  it("never references a permission that does not exist", () => {
    const unknown = [];
    for (const { file, source } of sources()) {
      // `WS_PERMISSIONS.X` resolves against the workspace scope, a bare
      // `PERMISSIONS.X` against the system scope.
      for (const match of source.matchAll(
        /(WS_|WORKSPACE_)?PERMISSIONS\.([A-Z_]+)/g
      )) {
        const table = match[1] ? WORKSPACE_PERMISSIONS : PERMISSIONS;
        if (!Object.prototype.hasOwnProperty.call(table, match[2]))
          unknown.push(`${file}: ${match[1] || ""}${match[2]}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("gates workspace routes only with workspace-scope permissions", () => {
    const misScoped = [];
    for (const { file, source } of sources()) {
      for (const guard of source.matchAll(
        /workspacePermissionValid\(\[([^\]]*)\]\)/g
      )) {
        for (const ref of guard[1].matchAll(
          /(WS_|WORKSPACE_)?PERMISSIONS\.([A-Z_]+)/g
        ))
          if (!ref[1]) misScoped.push(`${file}: ${ref[2]}`);
      }
    }
    expect(misScoped).toEqual([]);
  });

  it("gates instance routes only with system-scope permissions", () => {
    const misScoped = [];
    for (const { file, source } of sources()) {
      for (const guard of source.matchAll(
        /(?:userPermissionValid|userPermissionValid)\(\[([^\]]*)\]\)/g
      )) {
        for (const ref of guard[1].matchAll(
          /(WS_|WORKSPACE_)?PERMISSIONS\.([A-Z_]+)/g
        ))
          if (ref[1]) misScoped.push(`${file}: ${ref[2]}`);
      }
    }
    expect(misScoped).toEqual([]);
  });

  it("no longer gates anything on a hardcoded role name", () => {
    const offenders = [];
    for (const { file, source } of sources()) {
      if (/\brole\s*===\s*["'](admin|manager|default)["']/.test(source))
        offenders.push(file);
      if (/\brole\s*!==\s*["'](admin|manager|default)["']/.test(source))
        offenders.push(file);
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

  it("keeps the two scopes in separate maps, as the server does", () => {
    const mirror = fs.readFileSync(
      path.resolve(__dirname, "../../../frontend/src/utils/permissions.js"),
      "utf8"
    );
    expect(mirror).toContain("export const PERMISSIONS");
    expect(mirror).toContain("export const WORKSPACE_PERMISSIONS");
  });
});
