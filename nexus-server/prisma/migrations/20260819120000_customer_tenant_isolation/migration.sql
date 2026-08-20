-- Customer/Tenant isolation (V.1.5, Hosted Customer Trial). Strictly additive:
-- every new column is nullable, no existing column is touched, so every
-- pre-existing row gets customer_id = NULL ("platform/company-owned" - the
-- exact behavior every row already has today). No backfill needed.

-- CreateTable
CREATE TABLE "customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "customers_slug_key" ON "customers"("slug");

-- AlterTable: workspaces
ALTER TABLE "workspaces" ADD COLUMN "customer_id" INTEGER REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "workspaces_customer_id_idx" ON "workspaces"("customer_id");

-- AlterTable: users
ALTER TABLE "users" ADD COLUMN "customer_id" INTEGER REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "users_customer_id_idx" ON "users"("customer_id");

-- AlterTable: invites
ALTER TABLE "invites" ADD COLUMN "customer_id" INTEGER REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "invites_customer_id_idx" ON "invites"("customer_id");
