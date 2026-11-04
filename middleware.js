import { NextResponse } from "next/server";

// API routes that handle their own authentication (or are part of the auth flow).
const PUBLIC_API_PREFIXES = [
  "/api/login",
  "/api/logout",
  "/api/register",
  "/api/forgot-password",
  "/api/reset-password",
  // Face AI service endpoints: authenticated by x-face-api-key or session inside the route
  "/api/faces/upload",
  "/api/faces/identify",
  "/api/faces/identify-or-register",
  // Adafruit IO webhook: authenticated by ADAFRUIT_WEBHOOK_SECRET inside the route
  "/api/webhooks/adafruit",
];

const AUTH_PAGES = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  if (PUBLIC_API_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return NextResponse.next();
  }

  // Note: this only checks that a session cookie exists (the Edge runtime has no DB access).
  // Every protected API route validates the session against the database.
  const isLoggedIn = Boolean(request.cookies.get("session")?.value);
  const isAuthPage = AUTH_PAGES.has(pathname);

  if (!isLoggedIn && !isAuthPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|models/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|bin|map|txt|xml|woff|woff2)$).*)",
  ],
};
