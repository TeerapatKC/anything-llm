// Row shape shared by the instance-wide and workspace-scoped schedule-log
// export endpoints, so both produce identical columns.

const SCHEDULED_JOB_LOG_HEADERS = [
  "id",
  "job_id",
  "job_name",
  "source",
  "status",
  "started_at",
  "completed_at",
  "duration_seconds",
  "error",
  "emails_sent",
  "emails_failed",
];

/**
 * @param {object} run - a scheduled_job_runs row with `job` (optionally `job.workspace`) included
 * @param {Record<number, object[]>} emailLogsByRun - from ScheduledJobLog.groupByRunId
 */
function scheduledJobRunToRow(run, emailLogsByRun = {}) {
  const emailLogs = emailLogsByRun[run.id] || [];
  const failedCount = emailLogs.filter(
    (log) => log.event === "scheduled_job_email_failed"
  ).length;
  const sentCount = emailLogs.length - failedCount;
  const durationMs =
    run.completedAt && run.startedAt
      ? new Date(run.completedAt) - new Date(run.startedAt)
      : null;

  return {
    id: run.id,
    job_id: run.jobId,
    job_name: run.job?.name || "Unknown Job",
    source: run.job?.workspace?.name || "System",
    status: run.status,
    started_at: run.startedAt ? new Date(run.startedAt).toISOString() : "",
    completed_at: run.completedAt
      ? new Date(run.completedAt).toISOString()
      : "",
    duration_seconds: durationMs !== null ? Math.round(durationMs / 1000) : "",
    error: run.error || "",
    emails_sent: sentCount,
    emails_failed: failedCount,
  };
}

module.exports = { scheduledJobRunToRow, SCHEDULED_JOB_LOG_HEADERS };
