-- AlterTable: permissions are now split into "system" and "workspace" scopes.
ALTER TABLE "permissions" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'system';

-- CreateTable
CREATE TABLE "workspace_roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "workspace_role_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workspace_role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_role_permissions_workspace_role_id_fkey" FOREIGN KEY ("workspace_role_id") REFERENCES "workspace_roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workspace_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable: each workspace membership now carries the workspace role it grants.
-- Existing rows stay NULL and are backfilled onto the default workspace role on boot.
ALTER TABLE "workspace_users" ADD COLUMN "workspace_role_id" INTEGER REFERENCES "workspace_roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "workspace_roles_name_key" ON "workspace_roles"("name");

-- CreateIndex
CREATE INDEX "workspace_role_permissions_workspace_role_id_idx" ON "workspace_role_permissions"("workspace_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_role_permissions_workspace_role_id_permission_id_key" ON "workspace_role_permissions"("workspace_role_id", "permission_id");

-- CreateIndex
CREATE INDEX "workspace_users_workspace_role_id_idx" ON "workspace_users"("workspace_role_id");
