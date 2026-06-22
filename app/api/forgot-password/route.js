import { NextResponse } from "next/server";
import {
  createForgotPasswordRequest,
  FORGOT_PASSWORD_GENERIC_RESPONSE,
  normalizeForgotPasswordIdentity,
} from "../../lib/passwordReset/forgotPasswordService";
import { forgotPasswordLimiter } from "../../lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    // Rate limit: 5 requests per minute per IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = forgotPasswordLimiter.check(ip);
    if (!limit.ok) return limit.response;


    const body = await request.json();
    const accountIdentifier = normalizeForgotPasswordIdentity(body);
    await createForgotPasswordRequest(accountIdentifier);

    return NextResponse.json(FORGOT_PASSWORD_GENERIC_RESPONSE);
  } catch (error) {
    const reason = String(error?.message || "");

    if (reason.includes("Vui lòng nhập tên đăng nhập hoặc email")) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên đăng nhập hoặc email" },
        { status: 400 }
      );
    }

    if (reason.includes("Không thể gửi email đặt lại mật khẩu")) {
      return NextResponse.json(
        { success: false, message: reason },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Tạo yêu cầu quên mật khẩu thất bại",
        error: reason,
      },
      { status: 500 }
    );
  }
}
