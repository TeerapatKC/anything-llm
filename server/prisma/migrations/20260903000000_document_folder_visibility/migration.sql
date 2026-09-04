-- CreateTable
CREATE TABLE "document_folders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "ownerId" INTEGER,
    "workspaceId" INTEGER,
    "visibility" TEXT NOT NULL DEFAULT 'shared',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_folders_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "document_folders_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "document_folders_name_key" ON "document_folders"("name");

-- CreateIndex
CREATE INDEX "document_folders_ownerId_idx" ON "document_folders"("ownerId");

-- CreateIndex
CREATE INDEX "document_folders_workspaceId_idx" ON "document_folders"("workspaceId");
