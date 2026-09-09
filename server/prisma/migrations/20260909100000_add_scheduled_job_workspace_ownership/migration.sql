-- Scheduled jobs can now optionally belong to a single workspace, the same
-- ownership model already used for agent flows / SQL connections / slash
-- commands. NULL workspaceId = instance-wide (managed on the global page,
-- unchanged). Non-null = owned by that workspace only (managed from that
-- workspace's own settings).
--
-- SQLite cannot add a column with a new FOREIGN KEY constraint via a plain
-- ALTER TABLE, so the table is rebuilt as elsewhere in this migration history
-- (see 20260818000000_workspace_scoped_slash_commands).
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_scheduled_jobs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "tools" TEXT,
    "schedule" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "recipientType" TEXT NOT NULL DEFAULT 'none',
    "recipientWorkspaceIds" TEXT,
    "recipientUserIds" TEXT,
    "workspaceId" INTEGER,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduled_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_scheduled_jobs" (
    "id", "name", "prompt", "tools", "schedule", "enabled",
    "recipientType", "recipientWorkspaceIds", "recipientUserIds",
    "lastRunAt", "nextRunAt", "createdAt", "updatedAt"
)
SELECT
    "id", "name", "prompt", "tools", "schedule", "enabled",
    "recipientType", "recipientWorkspaceIds", "recipientUserIds",
    "lastRunAt", "nextRunAt", "createdAt", "updatedAt"
FROM "scheduled_jobs";

DROP TABLE "scheduled_jobs";
ALTER TABLE "new_scheduled_jobs" RENAME TO "scheduled_jobs";

CREATE INDEX "scheduled_jobs_workspaceId_idx" ON "scheduled_jobs"("workspaceId");

PRAGMA foreign_keys=ON;
