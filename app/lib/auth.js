import crypto from "crypto";

const PASSWORD_PREFIX = "scrypt";
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{7,}$/;

export function validatePasswordPolicy(password) {
  const value = String(password || "");
  if (!PASSWORD_POLICY_REGEX.test(value)) {
    return {
      ok: false,
      message: "Mật khẩu phải dài hơn 6 ký tự và gồm chữ thường, chữ hoa, số",
    };
  }

  return { ok: true };
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password, storedValue) {
  if (!storedValue || typeof storedValue !== "string") return false;

  const [prefix, salt, storedHash] = storedValue.split("$");
  if (prefix !== PASSWORD_PREFIX || !salt || !storedHash) return false;

  const incomingHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const incomingBuffer = Buffer.from(incomingHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (incomingBuffer.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(incomingBuffer, storedBuffer);
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function verifyHashedToken(rawToken, expectedHash) {
  if (!expectedHash || typeof expectedHash !== "string") {
    return false;
  }

  const incomingHash = hashToken(rawToken);
  const incomingBuffer = Buffer.from(incomingHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (incomingBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(incomingBuffer, expectedBuffer);
}

export function generateResetToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = hashToken(raw);
  return { raw, hash };
}

export function generateRecoveryCode(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";

  for (let i = 0; i < length; i += 1) {
    const index = crypto.randomInt(0, chars.length);
    raw += chars[index];
  }

  return {
    raw,
    hash: hashToken(raw),
  };
}
