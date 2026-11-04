import { NextResponse } from "next/server";
import { pool } from "../../lib/db";
import { clearSessionCookie } from "../../lib/http";

export const runtime = "nodejs";

export async function POST(request) {
  const sessionToken = request.cookies.get("session")?.value;
  if (sessionToken) {
    // Revoking is best-effort: the cookie must be cleared even if the DB is down.
    await pool.query(
      `
        UPDATE auth_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE session_token = $1 AND revoked_at IS NULL
      `,
      [sessionToken]
    ).catch((error) => console.error("POST /api/logout revoke error:", error));
  }

  const response = NextResponse.json({
    success: true,
    message: "Đăng xuất thành công",
  });

  clearSessionCookie(response);

  return response;
}