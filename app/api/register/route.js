import { NextResponse } from "next/server";
import { pool } from "../../lib/db";
import {
  generateRecoveryCode,
  generateSessionToken,
  hashPassword,
  validatePasswordPolicy,
} from "../../lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên đăng nhập, email và mật khẩu" },
        { status: 400 }
      );
    }

    const passwordCheck = validatePasswordPolicy(password);
    if (!passwordCheck.ok) {
      return NextResponse.json(
        { success: false, message: passwordCheck.message },
        { status: 400 }
      );
    }

    const existing = await pool.query(
      `
        SELECT id
        FROM app_users
        WHERE username = $1
        LIMIT 1
      `,
      [username]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập đã tồn tại" },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    const generatedRecoveryCode = generateRecoveryCode();

    const created = await pool.query(
      `
        INSERT INTO app_users (username, email, password_hash, role, recovery_code_hash, recovery_code_created_at)
        VALUES ($1, NULLIF($2, ''), $3, 'user', $4, CURRENT_TIMESTAMP)
        RETURNING id, username, email, role
      `,
      [username, email, passwordHash, generatedRecoveryCode.hash]
    );

    const user = created.rows[0];
    const sessionToken = generateSessionToken();

    await pool.query(
      `
        INSERT INTO auth_sessions (user_id, session_token, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days')
      `,
      [user.id, sessionToken]
    );

    const response = NextResponse.json({
      success: true,
      message: "Đăng ký thành công. Hãy lưu mã khôi phục để reset mật khẩu khi cần.",
      data: {
        username: user.username,
        email: user.email,
        role: user.role,
        recoveryCode: generatedRecoveryCode.raw,
      },
    });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Đăng ký thất bại",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
