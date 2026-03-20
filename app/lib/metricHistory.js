import { pool } from "./db";

let metricHistoryReady = false;

const CREATE_METRIC_HISTORY_SQL = `
  CREATE TABLE IF NOT EXISTS metric_history (
    id BIGSERIAL PRIMARY KEY,
    feed_key VARCHAR(50) NOT NULL,
    value_num REAL,
    value_text TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_METRIC_HISTORY_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_metric_history_feed_time
  ON metric_history(feed_key, updated_at DESC);
`;

export async function ensureMetricHistoryTable() {
  if (metricHistoryReady) return;
  await pool.query(CREATE_METRIC_HISTORY_SQL);
  await pool.query(CREATE_METRIC_HISTORY_INDEX_SQL);
  metricHistoryReady = true;
}

export async function appendMetricHistory(feedKey, valueNum, valueText, updatedAt = null) {
  await ensureMetricHistoryTable();

  await pool.query(
    `
      INSERT INTO metric_history (feed_key, value_num, value_text, updated_at)
      VALUES ($1, $2, $3, COALESCE($4, CURRENT_TIMESTAMP))
    `,
    [feedKey, valueNum, valueText, updatedAt]
  );
}
