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
};

module.exports = { ScheduledJobLog };
