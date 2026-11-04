jest.mock("../../app/lib/sessionAuth", () => ({
  getSessionUser: jest.fn(),
}));

import { getSessionUser } from "../../app/lib/sessionAuth";
import { requireFaceApiAuth, verifyFaceApiKey } from "../../app/lib/faceApiAuth";

function makeRequest(headers = {}) {
  return new Request("http://localhost/api/faces/identify", { method: "POST", headers });
}

describe("Face API auth", () => {
  const ORIGINAL = process.env.FACE_API_SECRET;
  const KEY = "test-secret-key-12345";

  beforeEach(() => {
    process.env.FACE_API_SECRET = KEY;
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    process.env.FACE_API_SECRET = ORIGINAL;
  });

  it("accepts a valid API key (header name is case-insensitive)", () => {
    expect(verifyFaceApiKey(makeRequest({ "x-face-api-key": KEY })).ok).toBe(true);
    expect(verifyFaceApiKey(makeRequest({ "X-Face-Api-Key": KEY })).ok).toBe(true);
  });

  it("rejects a wrong or missing key", () => {
    expect(verifyFaceApiKey(makeRequest({ "x-face-api-key": "nope" })).ok).toBe(false);
    expect(verifyFaceApiKey(makeRequest()).ok).toBe(false);
  });

  it("fails closed with 503 when FACE_API_SECRET is not set", async () => {
    process.env.FACE_API_SECRET = "";
    const result = await requireFaceApiAuth(makeRequest({ "x-face-api-key": "" }));
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(503);
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it("uses the API key without touching the database", async () => {
    const result = await requireFaceApiAuth(makeRequest({ "x-face-api-key": KEY }));
    expect(result).toEqual({ ok: true, method: "api-key" });
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it("falls back to a valid session", async () => {
    const user = { id: 1, username: "admin", role: "admin" };
    getSessionUser.mockResolvedValueOnce(user);
    const result = await requireFaceApiAuth(makeRequest());
    expect(result).toEqual({ ok: true, method: "session", user });
  });

  it("returns 401 with neither key nor session", async () => {
    getSessionUser.mockResolvedValueOnce(null);
    const result = await requireFaceApiAuth(makeRequest());
    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(401);
  });
});
