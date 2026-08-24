-- Removes the built-in "Viewer" workspace role.
--
-- Viewer could read a workspace but not chat in it, which is not a state this product
-- wants a member to be in - somebody added to a workspace is there to use it. The role
-- has been dropped from WORKSPACE_ROLES so it is no longer created, and this clears it
-- out of instances that already seeded it.
--
-- Anyone currently holding it moves to the default role rather than being left without
-- one. The foreign key would set their workspace_role_id to NULL on delete and the boot
-- backfill would eventually repair that, but doing it here keeps the change atomic and
-- leaves no window where a member has no role at all.
--
-- Only the shared, system-seeded role is touched. A custom role a workspace happens to
-- have named "viewer" (workspace_id IS NOT NULL, or isSystem = 0) is somebody's own
-- creation and is left alone.

UPDATE "workspace_users"
SET "workspace_role_id" = (
  SELECT "id" FROM "workspace_roles"
  WHERE "workspace_id" IS NULL AND "isDefault" = true
  LIMIT 1
)
WHERE "workspace_role_id" IN (
  SELECT "id" FROM "workspace_roles"
  WHERE "name" = 'viewer' AND "workspace_id" IS NULL AND "isSystem" = true
);

DELETE FROM "workspace_role_permissions"
WHERE "workspace_role_id" IN (
  SELECT "id" FROM "workspace_roles"
  WHERE "name" = 'viewer' AND "workspace_id" IS NULL AND "isSystem" = true
);

DELETE FROM "workspace_roles"
WHERE "name" = 'viewer' AND "workspace_id" IS NULL AND "isSystem" = true;
