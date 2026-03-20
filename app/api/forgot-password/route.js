import { NextResponse } from "next/server";
import { pool } from "../../lib/db";
import { generateResetToken } from "../../lib/auth";
import { isMailerConfigured, sendPasswordResetEmail } from "../../lib/mailer";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const identity = String(body?.identity || "").trim();

    if (!identity) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên đăng nhập hoặc email" },
        { status: 400 }
      );
    }

    const looksLikeEmail = identity.includes("@");

    const userResult = looksLikeEmail
      ? await pool.query(
          `
            SELECT id, username, email
            FROM app_users
            WHERE LOWER(email) = LOWER($1)
            ORDER BY id ASC
          `,
          [identity]
        )
      : await pool.query(
          `
            SELECT id, username, email
            FROM app_users
            WHERE username = $1
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

    for (const user of userResult.rows) {
      const resetToken = generateResetToken();

      await pool.query(
        `
          INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
        `,
        [user.id, resetToken.hash]
      );

      if (user.email && isMailerConfigured()) {
        try {
          await sendPasswordResetEmail({
            toEmail: user.email,
            username: user.username,
            resetToken: resetToken.raw,
          });
        } catch (mailError) {
          console.error("Forgot password email failed:", mailError);
        }
      } else {
        console.warn("Forgot password email skipped: SMTP not configured or user has no email");
      }
    }

    return NextResponse.json(genericResponse);
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
