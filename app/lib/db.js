import pg from "pg";

const { Pool } = pg;
const globalForDb = globalThis;

function stripSslModeParam(connectionString) {
  if (!connectionString) return connectionString;
  return connectionString
    .replace(/([?&])sslmode=[^&]*(&?)/i, (match, prefix, suffix) => {
      if (prefix === "?" && suffix) return "?";
      if (prefix === "&" && suffix) return "&";
      return "";
    })
    .replace(/[?&]$/, "");
}

const hasConnectionString = Boolean(process.env.DATABASE_URL);
const sslFlag = (process.env.DB_SSL || "").toLowerCase();
const shouldUseSsl = sslFlag
  ? sslFlag === "true"
  : hasConnectionString || process.env.NODE_ENV === "production";

const rejectUnauthorizedFlag =
  (process.env.DB_SSL_REJECT_UNAUTHORIZED || "").toLowerCase() === "true";

const normalizedConnectionString = stripSslModeParam(process.env.DATABASE_URL);

const poolConfig = hasConnectionString
  ? {
      connectionString: normalizedConnectionString,
      ssl: shouldUseSsl ? { rejectUnauthorized: rejectUnauthorizedFlag } : undefined,
      max: 20, // Max 20 connections in pool
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || "yolohome_db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      ssl: shouldUseSsl ? { rejectUnauthorized: rejectUnauthorizedFlag } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

export const pool =
  globalForDb.__pgPool ||
  new Pool(poolConfig);

if (!globalForDb.__pgPool) {
  globalForDb.__pgPool = pool;
}