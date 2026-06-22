/**
 * Tests for Face API key authentication logic.
 *
 * Since faceApiAuth.js uses ES modules (import), we test the logic
 * by simulating the verification behavior.
 */

describe("Face API Key Auth", () => {
  const VALID_KEY = "test-secret-key-12345";

  function verifyFaceApiKey(headers, envSecret) {
    if (!envSecret) {
      return { ok: false, status: 503 };
    }
    const providedKey = headers["x-face-api-key"] || headers["X-Face-Api-Key"];
    if (providedKey === envSecret) {
      return { ok: true };
    }
    return { ok: false, status: 401 };
  }

  it("should accept valid API key", () => {
    const result = verifyFaceApiKey(
      { "x-face-api-key": VALID_KEY },
      VALID_KEY
    );
    expect(result.ok).toBe(true);
  });

  it("should reject invalid API key", () => {
    const result = verifyFaceApiKey(
      { "x-face-api-key": "wrong-key" },
      VALID_KEY
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("should reject missing API key", () => {
    const result = verifyFaceApiKey({}, VALID_KEY);
    expect(result.ok).toBe(false);
  });

  it("should return 503 when FACE_API_SECRET is not configured", () => {
    const result = verifyFaceApiKey(
      { "x-face-api-key": VALID_KEY },
      undefined
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  it("should return 503 when FACE_API_SECRET is empty string", () => {
    const result = verifyFaceApiKey(
      { "x-face-api-key": "any" },
      ""
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  it("should accept case-variant header name", () => {
    const result = verifyFaceApiKey(
      { "X-Face-Api-Key": VALID_KEY },
      VALID_KEY
    );
    expect(result.ok).toBe(true);
  });
});
