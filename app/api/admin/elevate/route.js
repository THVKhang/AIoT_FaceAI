import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { hashToken, verifyAdminElevationToken } from "../../../lib/auth";
import { requireAuth } from "../../../lib/sessionAuth";

export const runtime = "nodejs";

const ELEVATION_MINUTES = Number(process.env.ADMIN_ELEVATION_MINUTES || 30);

async function consumeDbElevationToken(rawToken, usedByUserId) {
  const tokenHash = hashToken(rawToken);

  const result = await pool.query(
    `
      WITH candidate AS (
        SELECT id
        FROM admin_elevation_tokens
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE admin_elevation_tokens t
      SET
        used_at = CURRENT_TIMESTAMP,
        used_by_user_id = $2
      FROM candidate
      WHERE t.id = candidate.id
      RETURNING t.id
    `,
    [tokenHash, usedByUserId]
  );

  return result.rows.length > 0;
}

export async function POST(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const token = String(body?.token || "").trim();

    let tokenValid = false;

    try {
      tokenValid = await consumeDbElevationToken(token, auth.user.id);
    } catch (dbTokenError) {
      if (dbTokenError?.code !== "42P01") {
        throw dbTokenError;
      }
    }

    if (!tokenValid) {
      const check = verifyAdminElevationToken(token);
      tokenValid = check.ok;
    }

    if (!tokenValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Token admin không hợp lệ hoặc đã hết hạn",
        },
        { status: 401 }
      );
    }

    await pool.query(
      `
        UPDATE auth_sessions
        SET
          elevated_role = 'admin',
          elevated_until = CURRENT_TIMESTAMP + make_interval(mins => $1)
        WHERE session_token = $2
          AND revoked_at IS NULL
      `,
      [Math.max(ELEVATION_MINUTES, 1), auth.user.sessionToken]
    );

    const response = NextResponse.json({
      success: true,
      message: "Đã bật Admin Mode",
      data: {
        role: "admin",
        elevatedMinutes: Math.max(ELEVATION_MINUTES, 1),
      },
    });

    response.cookies.set("user_role", "admin", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * Math.max(ELEVATION_MINUTES, 1),
    });

    return response;
  } catch (error) {
    if (error?.code === "42703") {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu cột nâng quyền phiên. Hãy chạy database/06_admin_session_elevation.sql",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Không thể bật Admin Mode",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
