import { pool } from "../../../lib/db";
import { ensureMetricHistoryTable } from "../../../lib/metricHistory";
import { requireAuth } from "../../../lib/sessionAuth";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    await ensureMetricHistoryTable();

    const { searchParams } = new URL(request.url);
    const points = Number(searchParams.get("points") || 18);
    const windowMinutes = Number(searchParams.get("windowMinutes") || 180);

    const safePoints = Number.isNaN(points) ? 18 : Math.min(Math.max(points, 4), 120);
    const safeWindowMinutes = Number.isNaN(windowMinutes)
      ? 180
      : Math.min(Math.max(windowMinutes, 10), 1440);

    const query = `
      WITH gauge_keys AS (
        SELECT metric_key FROM gauge_config
      ),
      ranked AS (
        SELECT
          mh.feed_key,
          mh.value_num,
          mh.updated_at,
          ROW_NUMBER() OVER (
            PARTITION BY mh.feed_key
            ORDER BY mh.updated_at DESC
          ) AS rn
        FROM metric_history mh
        INNER JOIN gauge_keys gk
          ON gk.metric_key = mh.feed_key
        WHERE mh.value_num IS NOT NULL
          AND mh.updated_at >= CURRENT_TIMESTAMP - make_interval(mins => $1)
      )
      SELECT feed_key, value_num, updated_at
      FROM ranked
      WHERE rn <= $2
      ORDER BY feed_key, updated_at ASC;
    `;

    const { rows } = await pool.query(query, [safeWindowMinutes, safePoints]);

    return Response.json({
      success: true,
      data: rows,
      meta: {
        points: safePoints,
        windowMinutes: safeWindowMinutes,
      },
    });
  } catch (error) {
    console.error("GET /api/gauges/history error:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to fetch gauge history",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
