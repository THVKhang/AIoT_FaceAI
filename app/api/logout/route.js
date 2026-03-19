import { NextResponse } from "next/server";
import { pool } from "../../lib/db";

export const runtime = "nodejs";

export async function POST(request) {
  const sessionToken = request.cookies.get("session")?.value;
  if (sessionToken) {
    await pool.query(
      `
        UPDATE auth_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE session_token = $1 AND revoked_at IS NULL
      `,
      [sessionToken]
    );
  }

  const response = NextResponse.json({
    success: true,
    message: "Đăng xuất thành công",
  });

  response.cookies.set("session", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("user_role", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}