-- Workspace roles can now belong to a single workspace instead of being shared by all
-- of them, so a workspace manager can define roles for their own workspace without
-- changing what every other workspace means by "Contributor".
--
-- NULL workspace_id  = shared, assignable in every workspace (the built-ins).
-- set  workspace_id  = private to that workspace, assignable only there.
ALTER TABLE "workspace_roles" ADD COLUMN "workspace_id" INTEGER REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The old index made role names unique across the whole instance, which would stop two
-- workspaces from each having their own "reviewer".
DROP INDEX IF EXISTS "workspace_roles_name_key";

-- Unique per workspace. SQLite treats NULLs as distinct in a unique index, so this does
-- not constrain the shared roles - they are covered by the partial index below.
CREATE UNIQUE INDEX "workspace_roles_workspace_id_name_key" ON "workspace_roles"("workspace_id", "name");

-- Keeps shared role names unique among themselves.
CREATE UNIQUE INDEX "workspace_roles_shared_name_key" ON "workspace_roles"("name") WHERE "workspace_id" IS NULL;

-- CreateIndex
CREATE INDEX "workspace_roles_workspace_id_idx" ON "workspace_roles"("workspace_id");
