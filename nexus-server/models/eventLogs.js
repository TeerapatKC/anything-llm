const prisma = require("../utils/prisma");

const VALID_SEVERITIES = ["info", "warning", "error"];

const EventLogs = {
  logEvent: async function (
    event,
    metadata = {},
    userId = null,
    severity = "info"
  ) {
    try {
      const eventLog = await prisma.event_logs.create({
        data: {
          event,
          metadata: metadata ? JSON.stringify(metadata) : null,
          userId: userId ? Number(userId) : null,
          severity: VALID_SEVERITIES.includes(severity) ? severity : "info",
          occurredAt: new Date(),
        },
      });
      console.log(`\x1b[32m[Event Logged]\x1b[0m - ${event}`);
      return { eventLog, message: null };
    } catch (error) {
      console.error(
        `\x1b[31m[Event Logging Failed]\x1b[0m - ${event}`,
        error.message
      );
      return { eventLog: null, message: error.message };
    }
  },

  /**
   * Convenience wrapper for logging a failure (LLM/vectorDB/processing errors, etc)
   * at "error" severity so the System Administration error-log view can filter on it.
   * @param {string} event
   * @param {Object} metadata
   * @param {number|null} userId
   */
  logFailure: async function (event, metadata = {}, userId = null) {
    return this.logEvent(event, metadata, userId, "error");
  },

  getByEvent: async function (event, limit = null, orderBy = null) {
    try {
      const logs = await prisma.event_logs.findMany({
        where: { event },
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null
          ? { orderBy }
          : { orderBy: { occurredAt: "desc" } }),
      });
      return logs;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  getByUserId: async function (userId, limit = null, orderBy = null) {
    try {
      const logs = await prisma.event_logs.findMany({
        where: { userId },
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null
          ? { orderBy }
          : { orderBy: { occurredAt: "desc" } }),
      });
      return logs;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  where: async function (
    clause = {},
    limit = null,
    orderBy = null,
    offset = null
  ) {
    try {
      const logs = await prisma.event_logs.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(offset !== null ? { skip: offset } : {}),
        ...(orderBy !== null
          ? { orderBy }
          : { orderBy: { occurredAt: "desc" } }),
      });
      return logs;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  whereWithData: async function (
    clause = {},
    limit = null,
    offset = null,
    orderBy = null
  ) {
    const { User } = require("./user");

    try {
      const results = await this.where(clause, limit, orderBy, offset);

      // Batch-fetch all referenced users in one query instead of one query
      // per log row (which turned "load a page of logs" into 1 + N round
      // trips for N logged-in-user events on that page).
      const userIds = [
        ...new Set(results.filter((res) => res.userId).map((res) => res.userId)),
      ];
      const usersById = userIds.length
        ? new Map(
            (await User.where({ id: { in: userIds } })).map((u) => [u.id, u])
          )
        : new Map();

      for (const res of results) {
        const user = res.userId ? usersById.get(res.userId) : null;
        res.user = user
          ? { username: user.username }
          : { username: "unknown user" };
      }

      return results;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.event_logs.count({
        where: clause,
      });
      return count;
    } catch (error) {
      console.error(error.message);
      return 0;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.event_logs.deleteMany({
        where: clause,
      });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },
};

module.exports = { EventLogs };
