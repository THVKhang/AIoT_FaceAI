import { pool } from "../db";

export async function fetchAlertInputs() {
  const [gaugeResult, stateResult] = await Promise.all([
    pool.query(`
      SELECT metric_key, display_name, warn_low, warn_high, unit
      FROM gauge_config
    `),
    pool.query(`
      SELECT feed_key, value_num, value_text, updated_at
      FROM current_state
    `),
  ]);

  return {
    gauges: gaugeResult.rows,
    states: stateResult.rows,
  };
}
