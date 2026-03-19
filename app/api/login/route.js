import { NextResponse } from "next/server";
import { pool } from "../../lib/db";
import { generateSessionToken, verifyPassword } from "../../lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ username và password" },
        { status: 400 }
      );
    }

    const userResult = await pool.query(
      `
        SELECT id, username, email, role, password_hash
        FROM app_users
        WHERE username = $1 OR LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [username]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Sai tài khoản hoặc mật khẩu" },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];
    const valid = verifyPassword(password, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Sai tài khoản hoặc mật khẩu" },
        { status: 401 }
      );
    }

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
      message: "Đăng nhập thành công",
      data: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set("user_role", String(user.role || "user"), {
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
        message: "Lỗi đăng nhập",
        error: error.message,
      },
      { status: 500 }
    );
  }
}