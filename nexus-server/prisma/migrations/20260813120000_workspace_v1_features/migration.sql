-- AlterTable
ALTER TABLE "workspace_documents" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE "workspace_documents" ADD COLUMN "statusMessage" TEXT;
ALTER TABLE "workspace_documents" ADD COLUMN "title" TEXT;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN "description" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "defaultLanguage" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "workspaces" ADD COLUMN "archivedAt" DATETIME;

-- AlterTable
ALTER TABLE "workspace_users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';

-- AlterTable
ALTER TABLE "event_logs" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'info';

-- CreateIndex
CREATE INDEX "workspace_documents_workspaceId_status_idx" ON "workspace_documents"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "event_logs_severity_idx" ON "event_logs"("severity");
