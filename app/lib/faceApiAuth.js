import { getSessionUser } from "./sessionAuth";
import { safeEqual } from "./http";

/**
 * Verify Face API access.
 *
 * Accepts either:
 *   1. Header `x-face-api-key` matching env FACE_API_SECRET  (Python service)
 *   2. Valid user session cookie                               (Browser / Admin)
 *
 * Returns { ok: true } or { ok: false, response: Response }
 */
export function verifyFaceApiKey(request) {
  const secret = process.env.FACE_API_SECRET;

  // If FACE_API_SECRET is not configured, deny all requests (fail-closed)
  if (!secret) {
    console.warn("[FaceAPI Auth] FACE_API_SECRET is not set — all Face API requests are blocked.");
    return {
      ok: false,
      response: Response.json(
        { success: false, error: "Face API is not configured. Set FACE_API_SECRET." },
        { status: 503 }
      ),
    };
  }

  // Headers.get() is case-insensitive.
  const providedKey = request.headers.get("x-face-api-key");

  if (safeEqual(providedKey, secret)) {
    return { ok: true };
  }

  return { ok: false };
}

/**
 * Full Face API auth check: API key OR session cookie.
 */
export async function requireFaceApiAuth(request) {
  // 1. Try API key first (fast, no DB query)
  const keyResult = verifyFaceApiKey(request);
  if (keyResult.ok) return { ok: true, method: "api-key" };

  // If FACE_API_SECRET is not set, keyResult has a 503 response — return it
  if (keyResult.response) return keyResult;

  // 2. Fallback: check session cookie (for browser admin panel)
  const user = await getSessionUser(request);
  if (user) return { ok: true, method: "session", user };

  // Neither worked
  return {
    ok: false,
    response: Response.json(
      { success: false, error: "Unauthorized. Provide x-face-api-key header or login." },
      { status: 401 }
    ),
  };
}
