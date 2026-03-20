import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { requireAuth } from "../../../lib/sessionAuth";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    await pool.query(
      `
        UPDATE auth_sessions
        SET
          elevated_role = NULL,
          elevated_until = NULL
        WHERE session_token = $1
          AND revoked_at IS NULL
      `,
      [auth.user.sessionToken]
    );

    const fallbackRole = String(auth.user.baseRole || "user").toLowerCase();

    const response = NextResponse.json({
      success: true,
      message: "Đã thoát Admin Mode",
      data: {
        role: fallbackRole,
      },
    });

    response.cookies.set("user_role", fallbackRole, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
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
        message: "Không thể thoát Admin Mode",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
