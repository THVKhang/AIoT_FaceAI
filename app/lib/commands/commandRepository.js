import { pool } from "../db";

export async function insertSuccessfulCommand(feedKey, value) {
  await pool.query(
    `
      INSERT INTO commands (feed_key, command_value, source, status, created_at, executed_at)
      VALUES ($1, $2, 'web', 'success', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [feedKey, String(value)]
  );
}

export async function upsertCurrentState(feedKey, valueNum, valueText) {
  await pool.query(
    `
      INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (feed_key)
      DO UPDATE SET
        value_num = EXCLUDED.value_num,
        value_text = EXCLUDED.value_text,
        updated_at = CURRENT_TIMESTAMP
    `,
    [feedKey, valueNum, valueText]
  );
}

export async function insertSystemEvent(eventName, details) {
  await pool.query(
    `
      INSERT INTO system_logs (event_name, source, severity, log_details)
      VALUES ($1, 'web', 'info', $2)
    `,
    [eventName, details]
  );
}

export async function insertFailedCommand(feedKey, value, reason) {
  await pool.query(
    `
      INSERT INTO commands (feed_key, command_value, source, status, created_at)
      VALUES ($1, $2, 'web', 'failed', CURRENT_TIMESTAMP)
    `,
    [feedKey, String(value)]
  );

  await pool.query(
    `
      INSERT INTO system_logs (event_name, source, severity, log_details)
      VALUES ($1, $2, $3, $4)
    `,
    ["Command Failed", "web", "error", `${feedKey}=${value} | ${reason}`]
  );
}
