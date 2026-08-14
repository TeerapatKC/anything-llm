-- Splitting the catalog into system and workspace scopes retired several system
-- permissions. Without this remap an upgrading instance would silently strip existing
-- roles of powers they had before: a "manager" holding `workspaces.manage` would lose
-- all workspace control, because the replacement grant did not exist yet.
--
-- This runs before the boot-time seed prunes retired keys, so the old grants are still
-- readable here. The rows it inserts are upserted again by the seed, so it is safe for
-- the seed to run afterwards.

-- Make sure the replacement permissions exist so grants can reference them.
INSERT OR IGNORE INTO "permissions" ("key", "label", "description", "category", "scope", "sortOrder")
VALUES
  ('workspaces.manage_all', 'Full control of every workspace', 'Acts as if holding every workspace permission in every workspace.', 'workspaces', 'system', 0),
  ('workspace_roles.manage', 'Manage workspace roles', 'Define the reusable workspace roles that can be assigned to workspace members.', 'people', 'system', 0);

-- Any role that could manage, delete or add members to workspaces instance-wide keeps
-- that reach through the new blanket grant.
INSERT OR IGNORE INTO "role_permissions" ("role_id", "permission_id")
SELECT DISTINCT rp."role_id", (SELECT "id" FROM "permissions" WHERE "key" = 'workspaces.manage_all')
FROM "role_permissions" rp
JOIN "permissions" p ON p."id" = rp."permission_id"
WHERE p."key" IN ('workspaces.manage', 'workspaces.delete', 'workspaces.manage_members');

-- Whoever could already define instance roles can define workspace roles too.
INSERT OR IGNORE INTO "role_permissions" ("role_id", "permission_id")
SELECT DISTINCT rp."role_id", (SELECT "id" FROM "permissions" WHERE "key" = 'workspace_roles.manage')
FROM "role_permissions" rp
JOIN "permissions" p ON p."id" = rp."permission_id"
WHERE p."key" = 'roles.manage';
