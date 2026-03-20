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

function safeEqualText(left, right) {
  const l = Buffer.from(String(left));
  const r = Buffer.from(String(right));
  if (l.length !== r.length) return false;
  return crypto.timingSafeEqual(l, r);
}

export function generateAdminElevationToken() {
  const raw = crypto.randomBytes(24).toString("base64url");
  return {
    token: raw,
    hash: hashToken(raw),
  };
}

export function verifyAdminElevationToken(token) {
  const incoming = String(token || "").trim();
  if (!incoming) {
    return { ok: false, reason: "empty" };
  }

  const configuredHash = String(process.env.ADMIN_ELEVATION_TOKEN_HASH || "").trim();
  const configuredRaw = String(process.env.ADMIN_ELEVATION_TOKEN || "").trim();

  if (!configuredHash && !configuredRaw) {
    return { ok: false, reason: "not_configured" };
  }

  const incomingHash = hashToken(incoming);

  if (configuredHash && safeEqualText(incomingHash, configuredHash)) {
    return { ok: true };
  }

  if (configuredRaw && safeEqualText(incoming, configuredRaw)) {
    return { ok: true };
  }

  return { ok: false, reason: "invalid" };
}

export function generateResetToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = hashToken(raw);
  return { raw, hash };
}
