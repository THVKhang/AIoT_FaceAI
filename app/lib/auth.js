import crypto from "crypto";

const PASSWORD_PREFIX = "scrypt";

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

export function generateResetToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = hashToken(raw);
  return { raw, hash };
}
