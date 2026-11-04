import { errorDetail, getClientIp, safeEqual, sessionCookieOptions } from "../../app/lib/http";

describe("http helpers", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("getClientIp prefers the first x-forwarded-for hop", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } });
    expect(getClientIp(req)).toBe("9.9.9.9");
    expect(getClientIp(new Request("http://x", { headers: { "x-real-ip": "8.8.8.8" } }))).toBe("8.8.8.8");
    expect(getClientIp(new Request("http://x"))).toBe("unknown");
  });

  it("session cookie is secure in production unless overridden", () => {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SECURE;
    expect(sessionCookieOptions()).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });
    process.env.COOKIE_SECURE = "false";
    expect(sessionCookieOptions().secure).toBe(false);
    process.env.NODE_ENV = "development";
    delete process.env.COOKIE_SECURE;
    expect(sessionCookieOptions(0)).toMatchObject({ secure: false, maxAge: 0 });
  });

  it("errorDetail hides messages in production", () => {
    process.env.NODE_ENV = "production";
    expect(errorDetail(new Error("db password wrong"))).toBeUndefined();
    process.env.NODE_ENV = "test";
    expect(errorDetail(new Error("boom"))).toBe("boom");
  });

  it("safeEqual compares secrets", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual(null, "abc")).toBe(false);
    expect(safeEqual("", "")).toBe(false);
  });
});
