-- AlterTable
ALTER TABLE "scheduled_jobs" ADD COLUMN "recipientType" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "scheduled_jobs" ADD COLUMN "recipientWorkspaceIds" TEXT;
ALTER TABLE "scheduled_jobs" ADD COLUMN "recipientUserIds" TEXT;
