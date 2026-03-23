import { pool } from "../db";

export async function fetchGaugeSettings() {
  const { rows } = await pool.query(`
    SELECT
      metric_key,
      display_name,
      min_value,
      max_value,
      unit,
      warn_low,
      warn_high
    FROM gauge_config
    ORDER BY metric_key
  `);

  return rows;
}

export async function updateGaugeSettings(payload) {
  await pool.query(
    `
      UPDATE gauge_config
      SET
        min_value = $1,
        max_value = $2,
        warn_low = $3,
        warn_high = $4
      WHERE metric_key = $5
    `,
    [
      payload.min_value,
      payload.max_value,
      payload.warn_low,
      payload.warn_high,
      payload.metric_key,
    ]
  );
}

export async function insertSettingsUpdateLog(payload) {
  await pool.query(
    `
      INSERT INTO system_logs (event_name, source, severity, log_details)
      VALUES ($1, 'web', 'info', $2)
    `,
    [
      "Threshold Updated",
      `metric=${payload.metric_key}, min=${payload.min_value}, max=${payload.max_value}, warn_low=${payload.warn_low}, warn_high=${payload.warn_high}`,
    ]
  );
}
