/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Usage:
 *   const limiter = createRateLimit({ windowMs: 60_000, max: 10 });
 *
 *   // Inside API handler:
 *   const ip = request.headers.get("x-forwarded-for") || "unknown";
 *   const limit = limiter.check(ip);
 *   if (!limit.ok) return limit.response;
 */

const stores = new Map();

export function createRateLimit({ windowMs = 60_000, max = 10 } = {}) {
  // Each limiter instance gets its own store keyed by a unique ID
  const storeId = `rl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  stores.set(storeId, new Map());

  function getStore() {
    return stores.get(storeId);
  }

  function cleanup() {
    const store = getStore();
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }

  function check(ip) {
    const store = getStore();
    const now = Date.now();

    // Periodic cleanup (every 100 checks)
    if (Math.random() < 0.01) cleanup();

    let entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      return {
        ok: false,
        remaining: 0,
        response: Response.json(
          {
            success: false,
            message: `Quá nhiều request. Vui lòng thử lại sau ${retryAfterSec} giây.`,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSec),
              "X-RateLimit-Limit": String(max),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
            },
          }
        ),
      };
    }

    return {
      ok: true,
      remaining: max - entry.count,
    };
  }

  return { check };
}

// Pre-configured limiters for auth endpoints
export const loginLimiter = createRateLimit({ windowMs: 60_000, max: 10 });
export const registerLimiter = createRateLimit({ windowMs: 60_000, max: 5 });
export const forgotPasswordLimiter = createRateLimit({ windowMs: 60_000, max: 5 });
export const resetPasswordLimiter = createRateLimit({ windowMs: 60_000, max: 5 });
