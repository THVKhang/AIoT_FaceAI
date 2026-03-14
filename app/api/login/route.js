import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "").trim();

    const appUsername = process.env.APP_USERNAME || "admin";
    const appPassword = process.env.APP_PASSWORD || "123456";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ username và password" },
        { status: 400 }
      );
    }

    if (username !== appUsername || password !== appPassword) {
      return NextResponse.json(
        { success: false, message: "Sai tài khoản hoặc mật khẩu" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công",
    });

    response.cookies.set("session", "logged_in", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
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