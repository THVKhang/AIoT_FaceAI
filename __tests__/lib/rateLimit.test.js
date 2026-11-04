import { createRateLimit } from "../../app/lib/rateLimit";

describe("createRateLimit", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows requests within the limit and tracks remaining", () => {
    const limiter = createRateLimit({ windowMs: 60_000, max: 3 });
    expect(limiter.check("1.1.1.1")).toMatchObject({ ok: true, remaining: 2 });
    expect(limiter.check("1.1.1.1")).toMatchObject({ ok: true, remaining: 1 });
    expect(limiter.check("1.1.1.1")).toMatchObject({ ok: true, remaining: 0 });
  });

  it("blocks requests over the limit with a 429 response", async () => {
    const limiter = createRateLimit({ windowMs: 60_000, max: 1 });
    limiter.check("ip");
    const blocked = limiter.check("ip");

    expect(blocked.ok).toBe(false);
    expect(blocked.response.status).toBe(429);
    expect(blocked.response.headers.get("Retry-After")).toBe("60");
    const body = await blocked.response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("Quá nhiều request");
  });

  it("tracks IPs independently", () => {
    const limiter = createRateLimit({ windowMs: 60_000, max: 1 });
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("b").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
  });

  it("limiters do not share state", () => {
    const one = createRateLimit({ max: 1 });
    const two = createRateLimit({ max: 1 });
    expect(one.check("x").ok).toBe(true);
    expect(two.check("x").ok).toBe(true);
  });

  it("resets after the window expires", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const limiter = createRateLimit({ windowMs: 1_000, max: 1 });
    expect(limiter.check("ip").ok).toBe(true);
    expect(limiter.check("ip").ok).toBe(false);

    jest.setSystemTime(new Date("2026-01-01T00:00:01.500Z"));
    expect(limiter.check("ip").ok).toBe(true);
  });
});
