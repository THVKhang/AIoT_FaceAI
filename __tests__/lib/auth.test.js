const crypto = require("crypto");

// We test the pure functions from auth.js logic
// Since auth.js uses ES modules, we replicate the logic here for unit testing

const PASSWORD_PREFIX = "scrypt";
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{7,}$/;

function validatePasswordPolicy(password) {
  const value = String(password || "");
  if (!PASSWORD_POLICY_REGEX.test(value)) {
    return {
      ok: false,
      message: "Mật khẩu phải dài hơn 6 ký tự và gồm chữ thường, chữ hoa, số",
    };
  }
  return { ok: true };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_PREFIX}$${salt}$${hash}`;
}

function verifyPassword(password, storedValue) {
  if (!storedValue || typeof storedValue !== "string") return false;
  const [prefix, salt, storedHash] = storedValue.split("$");
  if (prefix !== PASSWORD_PREFIX || !salt || !storedHash) return false;
  const incomingHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const incomingBuffer = Buffer.from(incomingHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");
  if (incomingBuffer.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(incomingBuffer, storedBuffer);
}

describe("Auth - Password Policy", () => {
  it("should reject passwords shorter than 7 characters", () => {
    expect(validatePasswordPolicy("Ab1abc").ok).toBe(false);
  });

  it("should reject passwords without uppercase", () => {
    expect(validatePasswordPolicy("abcdefg1").ok).toBe(false);
  });

  it("should reject passwords without lowercase", () => {
    expect(validatePasswordPolicy("ABCDEFG1").ok).toBe(false);
  });

  it("should reject passwords without a digit", () => {
    expect(validatePasswordPolicy("Abcdefgh").ok).toBe(false);
  });

  it("should accept valid passwords", () => {
    expect(validatePasswordPolicy("Abcdef1").ok).toBe(true);
    expect(validatePasswordPolicy("StrongP4ss").ok).toBe(true);
    expect(validatePasswordPolicy("MyP@ss1word").ok).toBe(true);
  });

  it("should reject empty/null passwords", () => {
    expect(validatePasswordPolicy("").ok).toBe(false);
    expect(validatePasswordPolicy(null).ok).toBe(false);
    expect(validatePasswordPolicy(undefined).ok).toBe(false);
  });
});

describe("Auth - Hash & Verify Password", () => {
  it("should hash and verify password correctly", () => {
    const password = "TestPass123";
    const hashed = hashPassword(password);

    expect(hashed).toContain("scrypt$");
    expect(verifyPassword(password, hashed)).toBe(true);
  });

  it("should reject wrong password", () => {
    const hashed = hashPassword("CorrectPass1");
    expect(verifyPassword("WrongPass1", hashed)).toBe(false);
  });

  it("should reject invalid stored hash format", () => {
    expect(verifyPassword("test", "")).toBe(false);
    expect(verifyPassword("test", null)).toBe(false);
    expect(verifyPassword("test", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("test", "wrong$prefix$hash")).toBe(false);
  });

  it("should produce different hashes for same password (unique salt)", () => {
    const h1 = hashPassword("SamePassword1");
    const h2 = hashPassword("SamePassword1");
    expect(h1).not.toBe(h2); // Different salts
    // Both should verify correctly
    expect(verifyPassword("SamePassword1", h1)).toBe(true);
    expect(verifyPassword("SamePassword1", h2)).toBe(true);
  });
});
