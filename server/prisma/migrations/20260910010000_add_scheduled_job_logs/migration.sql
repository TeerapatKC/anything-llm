-- CreateTable
CREATE TABLE "scheduled_job_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event" TEXT NOT NULL,
    "metadata" TEXT,
    "jobId" INTEGER,
    "runId" INTEGER,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "scheduled_job_logs_event_idx" ON "scheduled_job_logs"("event");

-- CreateIndex
CREATE INDEX "scheduled_job_logs_jobId_idx" ON "scheduled_job_logs"("jobId");

-- CreateIndex
CREATE INDEX "scheduled_job_logs_runId_idx" ON "scheduled_job_logs"("runId");
