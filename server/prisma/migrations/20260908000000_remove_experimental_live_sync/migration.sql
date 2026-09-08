-- Removes the "Experimental Features" surface and the only feature it ever shipped,
-- live document sync. The two queue tables and the `watched` flag on a document have
-- no readers left, so they are dropped rather than carried forward as dead columns.

-- DropTable
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "document_sync_executions";
DROP TABLE IF EXISTS "document_sync_queues";

-- AlterTable: SQLite cannot drop a column in place on older engines, so the table is
-- rebuilt without `watched`. Rows are copied column-for-column; nothing else changes.
CREATE TABLE "new_workspace_documents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "docId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "docpath" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "metadata" TEXT,
    "pinned" BOOLEAN DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_documents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_workspace_documents" ("id", "docId", "filename", "docpath", "workspaceId", "metadata", "pinned", "createdAt", "lastUpdatedAt")
SELECT "id", "docId", "filename", "docpath", "workspaceId", "metadata", "pinned", "createdAt", "lastUpdatedAt" FROM "workspace_documents";
DROP TABLE "workspace_documents";
ALTER TABLE "new_workspace_documents" RENAME TO "workspace_documents";
CREATE UNIQUE INDEX "workspace_documents_docId_key" ON "workspace_documents"("docId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- The feature flag row itself is gone from supportedFields, so drop any stored value.
DELETE FROM "system_settings" WHERE "label" = 'experimental_live_file_sync';

-- The permission it was gated by no longer exists in the registry.
DELETE FROM "role_permissions" WHERE "permission_id" IN (
  SELECT "id" FROM "permissions" WHERE "key" = 'system.experimental'
);
DELETE FROM "permissions" WHERE "key" = 'system.experimental';
