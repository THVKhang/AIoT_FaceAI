const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function loadEnvFile(fileName) {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

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

function buildPoolConfig() {
  const hasConnectionString = Boolean(process.env.DATABASE_URL);
  const sslFlag = String(process.env.DB_SSL || "").toLowerCase();
  const shouldUseSsl = sslFlag
    ? sslFlag === "true"
    : hasConnectionString || process.env.NODE_ENV === "production";

  const rejectUnauthorized =
    String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "").toLowerCase() === "true";

  if (hasConnectionString) {
    return {
      connectionString: stripSslModeParam(process.env.DATABASE_URL),
      ssl: shouldUseSsl ? { rejectUnauthorized } : undefined,
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "yolohome_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl: shouldUseSsl ? { rejectUnauthorized } : undefined,
  };
}

function getSqlFiles() {
  const databaseDir = path.resolve(process.cwd(), "database");
  const entries = fs.readdirSync(databaseDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /^\d+_.*\.sql$/i.test(entry.name))
    .map((entry) => path.join(databaseDir, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function run() {
  const sqlFiles = getSqlFiles();
  if (sqlFiles.length === 0) {
    console.log("No SQL migration files found in database/");
    return;
  }

  const pool = new Pool(buildPoolConfig());

  try {
    for (const filePath of sqlFiles) {
      const sql = fs.readFileSync(filePath, "utf8");
      await pool.query(sql);
      console.log(`Applied: ${path.basename(filePath)}`);
    }
    console.log("All migrations completed.");
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Migration failed:", error.message || error);
  process.exit(1);
});
