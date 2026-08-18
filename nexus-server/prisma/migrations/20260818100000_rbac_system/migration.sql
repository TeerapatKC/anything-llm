-- CreateTable
CREATE TABLE "permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'system',
    "scope" TEXT NOT NULL DEFAULT 'system',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateTable
CREATE TABLE "roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateTable
CREATE TABLE "workspace_roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "workspace_id" INTEGER REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "workspace_roles_workspace_id_name_key" ON "workspace_roles"("workspace_id", "name");
CREATE INDEX "workspace_roles_workspace_id_idx" ON "workspace_roles"("workspace_id");

-- CreateTable
CREATE TABLE "workspace_role_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workspace_role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_role_permissions_workspace_role_id_fkey" FOREIGN KEY ("workspace_role_id") REFERENCES "workspace_roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workspace_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "workspace_role_permissions_workspace_role_id_idx" ON "workspace_role_permissions"("workspace_role_id");
CREATE UNIQUE INDEX "workspace_role_permissions_workspace_role_id_permission_id_key" ON "workspace_role_permissions"("workspace_role_id", "permission_id");

-- Seed just the two shared workspace roles needed to backfill existing
-- workspace_users.role string values below. The full permission catalog and
-- their permission grants are seeded idempotently at boot (WorkspaceRole.seed()/
-- Role.seed()) rather than here, so the catalog only needs to be maintained
-- in one place (utils/permissions/index.js).
INSERT INTO "workspace_roles" ("name", "displayName", "isSystem", "isDefault", "workspace_id")
VALUES ('admin', 'Admin', true, false, NULL);
INSERT INTO "workspace_roles" ("name", "displayName", "isSystem", "isDefault", "workspace_id")
VALUES ('member', 'Member', true, true, NULL);

-- AlterTable: workspace_users gains an FK to its workspace role. Kept
-- nullable - a null resolves to the default workspace role at read time
-- (WorkspaceRole.defaultRole()), same as any freshly-added member.
ALTER TABLE "workspace_users" ADD COLUMN "workspace_role_id" INTEGER REFERENCES "workspace_roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "workspace_users_workspace_role_id_idx" ON "workspace_users"("workspace_role_id");

-- Backfill every existing membership from its old role string onto the
-- matching seeded workspace_roles row above.
UPDATE "workspace_users"
SET "workspace_role_id" = (SELECT "id" FROM "workspace_roles" WHERE "name" = "workspace_users"."role" AND "workspace_id" IS NULL)
WHERE "role" IS NOT NULL;

-- The old string column is fully superseded by workspace_role_id now that
-- every row has been backfilled.
ALTER TABLE "workspace_users" DROP COLUMN "role";
