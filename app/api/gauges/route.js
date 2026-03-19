import { pool } from "../../lib/db";
import { requireAuth } from "../../lib/sessionAuth";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const query = `
      SELECT
        g.metric_key,
        g.display_name,
        g.min_value,
        g.max_value,
        g.unit,
        g.warn_low,
        g.warn_high,
        c.value_num,
        c.value_text,
        c.updated_at
      FROM gauge_config g
      LEFT JOIN current_state c
        ON g.metric_key = c.feed_key
      ORDER BY g.metric_key;
    `;

    const { rows } = await pool.query(query);

    return Response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/gauges error:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to fetch gauges",
        error: error.message,
      },
      { status: 500 }
    );
  }
}