import { NextResponse } from "next/server";

export function middleware(request) {
  const session = request.cookies.get("session")?.value;
  const isLoggedIn = session === "logged_in";
  const pathname = request.nextUrl.pathname;

  const isLoginPage = pathname === "/login";
  const isLoginApi = pathname.startsWith("/api/login");
  const isLogoutApi = pathname.startsWith("/api/logout");

  if (isLoginApi || isLogoutApi) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};