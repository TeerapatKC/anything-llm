const prisma = require("../utils/prisma");

// Mirrors EventLogs' shape (event + JSON metadata + timestamp), but kept as its
// own table so a scheduled job's email-delivery history doesn't get mixed into
// the instance-wide Event Logs audit trail.
const ScheduledJobLog = {
  logEvent: async function (event, metadata = {}, jobId = null, runId = null) {
    try {
      const log = await prisma.scheduled_job_logs.create({
        data: {
          event,
          metadata: metadata ? JSON.stringify(metadata) : null,
          jobId: jobId ? Number(jobId) : null,
          runId: runId ? Number(runId) : null,
          occurredAt: new Date(),
        },
      });
      return { log, error: null };
    } catch (error) {
      console.error(
        `Failed to log scheduled job event "${event}":`,
        error.message
      );
      return { log: null, error: error.message };
    }
  },

  where: async function (
    clause = {},
    limit = null,
    orderBy = null,
    offset = null
  ) {
    try {
      const logs = await prisma.scheduled_job_logs.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(offset !== null ? { skip: offset } : {}),
        ...(orderBy !== null
          ? { orderBy }
          : { orderBy: { occurredAt: "desc" } }),
      });
      return logs;
    } catch (error) {
      console.error("Failed to query scheduled job logs:", error.message);
      return [];
    }
  },

  count: async function (clause = {}) {
    try {
      return await prisma.scheduled_job_logs.count({ where: clause });
    } catch (error) {
      console.error("Failed to count scheduled job logs:", error.message);
      return 0;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.scheduled_job_logs.deleteMany({ where: clause });
      return true;
    } catch (error) {
      console.error("Failed to delete scheduled job logs:", error.message);
      return false;
    }
  },

  /**
   * Email log entries for a batch of runs, grouped by runId - used to attach
   * each run's delivery attempts when listing runs (the merged run+email log view).
   * @param {number[]} runIds
   * @returns {Promise<Record<number, object[]>>}
   */
  groupByRunId: async function (runIds = []) {
    if (!runIds.length) return {};
    try {
      const { safeJsonParse } = require("../utils/http");
      const logs = await prisma.scheduled_job_logs.findMany({
        where: { runId: { in: runIds } },
        orderBy: { occurredAt: "asc" },
      });
      const grouped = {};
      for (const log of logs) {
        (grouped[log.runId] ||= []).push({
          ...log,
          metadata: safeJsonParse(log.metadata, {}),
        });
      }
      return grouped;
    } catch (error) {
      console.error("Failed to group scheduled job logs by run:", error.message);
      return {};
    }
  },
};

module.exports = { ScheduledJobLog };
