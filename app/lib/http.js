import crypto from "crypto";

/**
 * Shared HTTP helpers for API routes.
 */

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Best-effort client IP (first hop of x-forwarded-for, then x-real-ip).
 */
export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Cookie options for the session cookie.
 * `secure` is on in production unless COOKIE_SECURE=false (e.g. plain-HTTP LAN demo).
 */
export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  const flag = (process.env.COOKIE_SECURE || "").toLowerCase();
  const secure = flag ? flag === "true" : process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function setSessionCookie(response, token) {
  response.cookies.set("session", token, sessionCookieOptions());
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set("session", "", sessionCookieOptions(0));
  return response;
}

/**
 * Only expose raw error details outside production, so DB/driver messages
 * are not leaked to clients.
 */
export function errorDetail(error) {
  if (process.env.NODE_ENV === "production") return undefined;
  return error?.message || String(error);
}

/**
 * Constant-time string comparison for secrets.
 */
export function safeEqual(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || !expected) return false;
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
