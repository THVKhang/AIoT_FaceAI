import { NextResponse } from "next/server";
import { pool } from "../../lib/db";
import { ensureAuthTables } from "../../lib/authStore";
import { hashPassword, hashToken } from "../../lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await ensureAuthTables();

    const body = await request.json();
    const token = String(body?.token || "").trim();
    const newPassword = String(body?.newPassword || "").trim();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập mã và mật khẩu mới" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu mới phải có ít nhất 8 ký tự" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const tokenResult = await pool.query(
      `
        SELECT id, user_id
        FROM password_reset_tokens
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Mã không hợp lệ hoặc đã hết hạn" },
        { status: 400 }
      );
    }

    const tokenRow = tokenResult.rows[0];
    const passwordHash = hashPassword(newPassword);

    await pool.query(
      `
        UPDATE app_users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [passwordHash, tokenRow.user_id]
    );

    await pool.query(
      `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [tokenRow.id]
    );

    await pool.query(
      `
        UPDATE auth_sessions
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND revoked_at IS NULL
      `,
      [tokenRow.user_id]
    );

    return NextResponse.json({
      success: true,
      message: "Đặt lại mật khẩu thành công, vui lòng đăng nhập lại",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Đặt lại mật khẩu thất bại",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
