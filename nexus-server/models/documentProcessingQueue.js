const prisma = require("../utils/prisma");

/**
 * Read-only, instance-wide aggregation over workspace_documents.status.
 * Not a Prisma model of its own - just query helpers reused by the System
 * Administration health endpoint and the document-retry flow.
 */
const DocumentProcessingQueue = {
  /**
   * Instance-wide counts of documents by lifecycle status.
   * @returns {Promise<{queued: number, processing: number, completed: number, failed: number, unsupported: number, disabled: number}>}
   */
  summary: async function () {
    const counts = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      unsupported: 0,
      disabled: 0,
    };
    try {
      const grouped = await prisma.workspace_documents.groupBy({
        by: ["status"],
        _count: { _all: true },
      });
      for (const row of grouped) {
        if (row.status in counts) counts[row.status] = row._count._all;
      }
      return counts;
    } catch (error) {
      console.error(error.message);
      return counts;
    }
  },

  /**
   * List of currently-failed documents (for the retry UI), newest first.
   * @param {number|null} limit
   * @param {number|null} offset
   * @returns {Promise<Array<{id: number, docId: string, filename: string, workspaceId: number, statusMessage: string|null, lastUpdatedAt: Date}>>}
   */
  failed: async function (limit = 50, offset = 0) {
    try {
      return await prisma.workspace_documents.findMany({
        where: { status: "failed" },
        orderBy: { lastUpdatedAt: "desc" },
        ...(limit !== null ? { take: limit } : {}),
        ...(offset !== null ? { skip: offset } : {}),
      });
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },
};

module.exports = { DocumentProcessingQueue };
