import { NextResponse } from "next/server";
import { pool } from "../../lib/db";
import { ensureAuthTables } from "../../lib/authStore";
import { generateResetToken } from "../../lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureAuthTables();

    const body = await request.json();
    const identity = String(body?.identity || "").trim();

    if (!identity) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên đăng nhập hoặc email" },
        { status: 400 }
      );
    }

    const userResult = await pool.query(
      `
        SELECT id, username, email
        FROM app_users
        WHERE username = $1 OR LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [identity]
    );

    const genericResponse = {
      success: true,
      message: "Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được tạo",
    };

    if (userResult.rows.length === 0) {
      return NextResponse.json(genericResponse);
    }

    const user = userResult.rows[0];
    const resetToken = generateResetToken();

    await pool.query(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
      `,
      [user.id, resetToken.hash]
    );

    const payload = { ...genericResponse };
    if (process.env.NODE_ENV !== "production") {
      payload.dev_reset_token = resetToken.raw;
      payload.dev_reset_hint = `Mở /reset-password và dán mã này: ${resetToken.raw}`;
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Tạo yêu cầu quên mật khẩu thất bại",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
