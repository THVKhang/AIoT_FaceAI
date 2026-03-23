import { NextResponse } from "next/server";
import {
  buildResetPasswordError,
  resetPassword,
} from "../../lib/passwordReset/resetPasswordService";

export const runtime = "nodejs";

export async function POST(request) {
  try {
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
