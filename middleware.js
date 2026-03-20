import { NextResponse } from "next/server";

export function middleware(request) {
  const session = request.cookies.get("session")?.value;
  const role = String(request.cookies.get("user_role")?.value || "user").toLowerCase();
  const isLoggedIn = Boolean(session);
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isForgotPage = pathname === "/forgot-password";
  const isResetPage = pathname === "/reset-password";
  const isLoginApi = pathname.startsWith("/api/login");
  const isLogoutApi = pathname.startsWith("/api/logout");
  const isRegisterApi = pathname.startsWith("/api/register");
  const isForgotApi = pathname.startsWith("/api/forgot-password");
  const isResetApi = pathname.startsWith("/api/reset-password");
  const isAdminWriteApi =
    pathname.startsWith("/api/commands") ||
    (pathname.startsWith("/api/settings") && method !== "GET");

  if (isLoginApi || isLogoutApi || isRegisterApi || isForgotApi || isResetApi) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage && !isRegisterPage && !isForgotPage && !isResetPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && isAdminWriteApi && role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền thực hiện thao tác này" },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isLoggedIn && (isLoginPage || isRegisterPage || isForgotPage || isResetPage)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};