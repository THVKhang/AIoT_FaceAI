import { pool } from "../../lib/db";

export async function GET(request) {
  try {
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