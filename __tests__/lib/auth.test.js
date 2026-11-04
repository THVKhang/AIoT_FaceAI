import {
  generateRecoveryCode,
  generateResetToken,
  generateSessionToken,
  hashPassword,
  hashToken,
  validatePasswordPolicy,
  verifyHashedToken,
  verifyPassword,
} from "../../app/lib/auth";

describe("validatePasswordPolicy", () => {
  it.each(["Abc12", "abcdef12", "ABCDEF12", "Abcdefgh", "", null, undefined])(
    "rejects %p",
    (password) => {
      expect(validatePasswordPolicy(password).ok).toBe(false);
    }
  );

  it.each(["Abcdef1", "MyP4ssword", "Xy9zzzzzzz"])("accepts %p", (password) => {
    expect(validatePasswordPolicy(password)).toEqual({ ok: true });
  });
});

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password", () => {
    const stored = hashPassword("TestPass1");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("TestPass1", stored)).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(verifyPassword("WrongPass1", hashPassword("TestPass1"))).toBe(false);
  });

  it("uses a unique salt per hash", () => {
    expect(hashPassword("Same1Pass")).not.toBe(hashPassword("Same1Pass"));
  });

  it.each([null, "", "plain", "bcrypt$a$b", "scrypt$salt$", "scrypt$salt$abcd"])(
    "rejects malformed stored value %p",
    (stored) => {
      expect(verifyPassword("TestPass1", stored)).toBe(false);
    }
  );
});

describe("tokens", () => {
  it("generates 64-char hex session tokens", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(generateSessionToken()).not.toBe(token);
  });

  it("reset token hash matches its raw value", () => {
    const { raw, hash } = generateResetToken();
    expect(hashToken(raw)).toBe(hash);
    expect(verifyHashedToken(raw, hash)).toBe(true);
    expect(verifyHashedToken("other", hash)).toBe(false);
    expect(verifyHashedToken(raw, null)).toBe(false);
  });

  it("recovery codes use an unambiguous alphabet", () => {
    const { raw, hash } = generateRecoveryCode(12);
    expect(raw).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);
    expect(verifyHashedToken(raw, hash)).toBe(true);
  });
});
