// Generic CSV/JSON row exporter shared by the log-export endpoints (event logs,
// scheduled job logs). Kept separate from utils/helpers/chat/convertTo.js since
// that module is chat-shaped (jsonl/alpaca, attachments); these exports are
// plain tabular rows with only two formats.

function escapeCsv(value) {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""').replace(/\n/g, " ")}"`;
}

function rowsToCSV(rows, headers = null) {
  const cols =
    headers ||
    Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set())
    );
  const lines = [cols.join(",")];
  for (const row of rows) lines.push(cols.map((col) => escapeCsv(row[col])).join(","));
  return lines.join("\n");
}

/**
 * @param {"csv"|"json"} format
 * @param {object[]} rows
 * @param {string[]|null} headers - CSV column order; omitted infers from the first row's keys
 * @returns {{contentType: string, data: string}}
 */
function exportRows(format, rows, headers = null) {
  if (format === "json")
    return { contentType: "application/json", data: JSON.stringify(rows, null, 4) };
  return { contentType: "text/csv", data: rowsToCSV(rows, headers) };
}

/**
 * Build a Prisma date-range clause for a single field from `YYYY-MM-DD` query
 * strings. Either bound may be omitted; omitting both means "no filter" (export
 * everything). Bounds are whole-day and inclusive (end-of-day for `endDate`).
 * @param {string} field
 * @param {string|null} startDate
 * @param {string|null} endDate
 */
function dateRangeClause(field, startDate = null, endDate = null) {
  if (!startDate && !endDate) return {};
  const range = {};
  if (startDate) range.gte = new Date(`${startDate}T00:00:00.000Z`);
  if (endDate) range.lte = new Date(`${endDate}T23:59:59.999Z`);
  return { [field]: range };
}

module.exports = { exportRows, dateRangeClause };
