import { NextResponse } from "next/server";
import { pool } from "../../../../lib/db";
import { generateAdminElevationToken } from "../../../../lib/auth";
import { requireRole } from "../../../../lib/sessionAuth";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireRole(request, ["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const requestedMinutes = Number(body?.expiresMinutes ?? 15);
    const expiresMinutes = Math.min(Math.max(requestedMinutes, 1), 120);

    const generated = generateAdminElevationToken();

    const { rows } = await pool.query(
      `
        INSERT INTO admin_elevation_tokens (token_hash, created_by_user_id, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP + make_interval(mins => $3))
        RETURNING id, expires_at
      `,
      [generated.hash, auth.user.id, expiresMinutes]
    );

    return NextResponse.json({
      success: true,
      message: "Đã tạo admin token",
      data: {
        token: generated.token,
        expiresAt: rows[0]?.expires_at || null,
        expiresMinutes,
      },
    });
  } catch (error) {
    if (error?.code === "42P01") {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu bảng token admin. Hãy chạy database/07_admin_elevation_tokens.sql",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Không thể tạo admin token",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
