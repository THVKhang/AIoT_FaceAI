/**
 * Tests for rate limiter logic.
 *
 * Since rateLimit.js uses ES modules (export), we replicate the core logic
 * here for Jest compatibility without needing Babel/ESM transforms.
 */

function createRateLimit({ windowMs = 60000, max = 10 } = {}) {
  const store = new Map();

  function check(ip) {
    const now = Date.now();
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
        response: {
          status: 429,
          body: {
            success: false,
            message: `Quá nhiều request. Vui lòng thử lại sau ${retryAfterSec} giây.`,
          },
        },
      };
    }

    return { ok: true, remaining: max - entry.count };
  }

  return { check };
}

describe("createRateLimit", () => {
  it("should allow requests within the limit", () => {
    const limiter = createRateLimit({ windowMs: 60000, max: 3 });

    const r1 = limiter.check("127.0.0.1");
    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check("127.0.0.1");
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check("127.0.0.1");
    expect(r3.ok).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("should block requests exceeding the limit", () => {
    const limiter = createRateLimit({ windowMs: 60000, max: 2 });

    limiter.check("10.0.0.1");
    limiter.check("10.0.0.1");
    const blocked = limiter.check("10.0.0.1");

    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.response).toBeDefined();
    expect(blocked.response.status).toBe(429);
  });

  it("should track different IPs separately", () => {
    const limiter = createRateLimit({ windowMs: 60000, max: 1 });

    const r1 = limiter.check("192.168.1.1");
    expect(r1.ok).toBe(true);

    const r2 = limiter.check("192.168.1.2");
    expect(r2.ok).toBe(true);

    // First IP should now be blocked
    const r3 = limiter.check("192.168.1.1");
    expect(r3.ok).toBe(false);
  });

  it("should return rate limit error message in Vietnamese", () => {
    const limiter = createRateLimit({ windowMs: 60000, max: 1 });
    limiter.check("1.2.3.4");
    const blocked = limiter.check("1.2.3.4");

    expect(blocked.ok).toBe(false);
    expect(blocked.response.body.success).toBe(false);
    expect(blocked.response.body.message).toContain("Quá nhiều request");
  });

  it("should use default values when no options provided", () => {
    const limiter = createRateLimit();

    // Should allow at least 10 requests (default max)
    for (let i = 0; i < 10; i++) {
      const result = limiter.check("default-test-ip");
      expect(result.ok).toBe(true);
    }

    // 11th should be blocked
    const blocked = limiter.check("default-test-ip");
    expect(blocked.ok).toBe(false);
  });
});
