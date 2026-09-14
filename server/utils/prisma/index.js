const { PrismaClient } = require("@prisma/client");

// npx prisma introspect
// npx prisma generate
// npx prisma migrate dev --name init -> ensures that db is in sync with schema
// npx prisma migrate reset -> resets the db

const logLevels = ["error", "info", "warn"]; // add "query" to debug query logs
const prisma = new PrismaClient({
  log: logLevels,
});

// SQLite's default rollback journal makes a write wait until every open read has
// finished, and one agent turn reads from several places at once - chat history, the
// skill reranker, the background workers in their own processes. On a machine under
// memory pressure those reads ran long enough that saving the chat itself failed with
// "Timed out during query execution". In WAL mode readers and the one writer do not
// block each other. The mode is stored in the database file, so this changes something
// once; on every later start it is a no-op.
async function useWriteAheadLog() {
  if (/^postgres/i.test(process.env.DATABASE_URL || "")) return;
  try {
    const [row] = await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
    if (row?.journal_mode !== "wal")
      console.warn(
        `[prisma] SQLite journal_mode is ${row?.journal_mode}, expected wal.`
      );
  } catch (error) {
    // Most likely the file was locked at that instant - the next start tries again.
    console.error(`[prisma] Could not switch SQLite to WAL: ${error.message}`);
  }
}
if (process.env.NODE_ENV !== "test") useWriteAheadLog();

module.exports = prisma;
