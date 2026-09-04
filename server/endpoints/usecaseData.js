const { Client } = require("pg");
const { validatedRequest } = require("../utils/middleware/validatedRequest");

async function withClient(connectionString, fn) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const REPAIR_DB =
  "postgres://postgres:Pa55w0rd@127.0.0.1:5433/repair_maintenance_db";
const SOLAR_DB = "postgres://postgres:Pa55w0rd@127.0.0.1:5433/solar_plant_db";
const LOG_DB = "postgres://postgres:Pa55w0rd@127.0.0.1:5433/log_monitoring_db";

/**
 * Small read-only aggregation endpoints backed by the demo use-case databases.
 * Purpose-built so Agent Flow `apiCall` steps (which cannot query SQL or RAG
 * directly) have a simple JSON source to analyze for the repair/solar/log
 * monitoring & alerting flows.
 */
function usecaseDataEndpoints(app) {
  if (!app) return;

  app.get(
    "/usecase/repair/tickets",
    [validatedRequest],
    async (_request, response) => {
      try {
        const rows = await withClient(REPAIR_DB, (client) =>
          client
            .query(
              `SELECT t.id, e.name AS equipment_name, e.location, t.reported_date,
                      t.symptom, t.diagnosis, t.technician, t.status,
                      (SELECT COUNT(*) FROM repair_tickets t2
                        WHERE t2.equipment_id = t.equipment_id
                          AND t2.symptom = t.symptom) AS times_reported
               FROM repair_tickets t
               JOIN equipment e ON e.id = t.equipment_id
               ORDER BY t.reported_date DESC
               LIMIT 30`
            )
            .then((r) => r.rows)
        );
        const overdueMaintenance = await withClient(REPAIR_DB, (client) =>
          client
            .query(
              `SELECT m.id, e.name AS equipment_name, m.maintenance_type, m.due_date, m.status
               FROM maintenance_schedule m
               JOIN equipment e ON e.id = m.equipment_id
               WHERE m.status = 'overdue'`
            )
            .then((r) => r.rows)
        );
        response.status(200).json({ tickets: rows, overdueMaintenance });
      } catch (e) {
        console.error(e);
        response.status(500).json({ error: e.message });
      }
    }
  );

  app.get(
    "/usecase/solar/latest",
    [validatedRequest],
    async (_request, response) => {
      try {
        const rows = await withClient(SOLAR_DB, (client) =>
          client
            .query(
              `SELECT DISTINCT ON (r.inverter_id) r.inverter_id, i.inverter_code, i.rated_power_kw,
                      p.name AS plant_name, r.reading_time, r.power_output_kw,
                      r.temperature_c, r.status
               FROM inverter_readings r
               JOIN inverters i ON i.id = r.inverter_id
               JOIN plants p ON p.id = i.plant_id
               ORDER BY r.inverter_id, r.reading_time DESC`
            )
            .then((r) => r.rows)
        );
        response.status(200).json({ latestReadings: rows });
      } catch (e) {
        console.error(e);
        response.status(500).json({ error: e.message });
      }
    }
  );

  app.get(
    "/usecase/logs/recent",
    [validatedRequest],
    async (_request, response) => {
      try {
        const rows = await withClient(LOG_DB, (client) =>
          client
            .query(
              `SELECT l.id, s.name AS service_name, l.log_time, l.level, l.message, l.trace_id
               FROM logs l
               JOIN services s ON s.id = l.service_id
               ORDER BY l.log_time DESC
               LIMIT 50`
            )
            .then((r) => r.rows)
        );
        const errorCounts = await withClient(LOG_DB, (client) =>
          client
            .query(
              `SELECT s.name AS service_name, l.level, COUNT(*) AS count
               FROM logs l
               JOIN services s ON s.id = l.service_id
               WHERE l.level IN ('WARN', 'ERROR', 'CRITICAL')
               GROUP BY s.name, l.level
               ORDER BY count DESC`
            )
            .then((r) => r.rows)
        );
        response.status(200).json({ logs: rows, errorCounts });
      } catch (e) {
        console.error(e);
        response.status(500).json({ error: e.message });
      }
    }
  );
}

module.exports = { usecaseDataEndpoints };
