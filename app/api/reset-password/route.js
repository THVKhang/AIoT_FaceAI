import { NextResponse } from "next/server";
import {
  buildResetPasswordError,
  resetPassword,
} from "../../lib/passwordReset/resetPasswordService";
import { resetPasswordLimiter } from "../../lib/rateLimit";
import { getClientIp } from "../../lib/http";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    // Rate limit: 5 attempts per minute per IP (protects recovery codes from brute force)
    const limit = resetPasswordLimiter.check(getClientIp(request));
    if (!limit.ok) return limit.response;

    const body = await request.json();
    await resetPassword(body);

    return NextResponse.json({
      success: true,
      message: "Đặt lại mật khẩu thành công, vui lòng đăng nhập lại",
    });
  } catch (error) {
    const failure = buildResetPasswordError(error);

    return NextResponse.json(
      {
        success: false,
        message: failure.message,
        error: failure.message,
      },
      { status: failure.status }
    );
  }
}
