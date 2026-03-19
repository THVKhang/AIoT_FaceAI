import { pool } from "../../lib/db";
import { requireAuth } from "../../lib/sessionAuth";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const query = `
      SELECT
        feed_key,
        value_num,
        value_text,
        updated_at
      FROM current_state
      ORDER BY feed_key;
    `;

    const { rows } = await pool.query(query);

    return Response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/state error:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to fetch current state",
        error: error.message,
      },
      { status: 500 }
    );
  }
}