import { pool } from "../../lib/db";

export const runtime = "nodejs";

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error("Giá trị số không hợp lệ");
  }
  return n;
}

export async function GET() {
  try {
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

    return Response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return Response.json(
      {
        success: false,
        message: "Không lấy được cấu hình ngưỡng",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const metric_key = String(body?.metric_key || "").trim();
    const min_value = parseNullableNumber(body?.min_value);
    const max_value = parseNullableNumber(body?.max_value);
    const warn_low = parseNullableNumber(body?.warn_low);
    const warn_high = parseNullableNumber(body?.warn_high);

    if (!metric_key) {
      return Response.json(
        { success: false, message: "Thiếu metric_key" },
        { status: 400 }
      );
    }

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
      [min_value, max_value, warn_low, warn_high, metric_key]
    );

    await pool.query(
      `
        INSERT INTO system_logs (event_name, source, severity, log_details)
        VALUES ($1, 'web', 'info', $2)
      `,
      [
        "Threshold Updated",
        `metric=${metric_key}, min=${min_value}, max=${max_value}, warn_low=${warn_low}, warn_high=${warn_high}`,
      ]
    );

    return Response.json({
      success: true,
      message: "Cập nhật ngưỡng thành công",
    });
  } catch (error) {
    console.error("POST /api/settings error:", error);
    return Response.json(
      {
        success: false,
        message: "Cập nhật ngưỡng thất bại",
        error: error.message,
      },
      { status: 500 }
    );
  }
}