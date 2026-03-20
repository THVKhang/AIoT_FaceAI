import { pool } from "../../lib/db";
import { requireAuth } from "../../lib/sessionAuth";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 20);

    const safeLimit = Number.isNaN(limit) ? 20 : Math.min(Math.max(limit, 1), 100);

    const query = `
      SELECT
        id,
        timestamp,
        event_name,
        source,
        severity,
        log_details
      FROM system_logs
      ORDER BY timestamp DESC
      LIMIT $1;
    `;

    const { rows } = await pool.query(query, [safeLimit]);

    return Response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to fetch logs",
        error: error.message,
      },
      { status: 500 }
    );
  }
}