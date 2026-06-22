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

/**
 * Ensure the _migrations tracking table exists.
 */
async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Get list of already-applied migration filenames.
 */
async function getAppliedMigrations(pool) {
  const result = await pool.query(
    `SELECT filename FROM _migrations ORDER BY filename`
  );
  return new Set(result.rows.map((row) => row.filename));
}

/**
 * Run migrations: apply each SQL file in a transaction, skip already-applied.
 */
async function runMigrations() {
  const sqlFiles = getSqlFiles();
  if (sqlFiles.length === 0) {
    console.log("No SQL migration files found in database/");
    return;
  }

  const pool = new Pool(buildPoolConfig());

  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const filePath of sqlFiles) {
      const filename = path.basename(filePath);

      if (applied.has(filename)) {
        console.log(`  Skip (already applied): ${filename}`);
        skippedCount++;
        continue;
      }

      const sql = fs.readFileSync(filePath, "utf8");
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          `INSERT INTO _migrations (filename) VALUES ($1)`,
          [filename]
        );
        await client.query("COMMIT");
        console.log(`  Applied: ${filename}`);
        appliedCount++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  FAILED: ${filename} — ${err.message}`);
        console.error("  Transaction rolled back. Fix the SQL and retry.");
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(
      `\nMigration complete. Applied: ${appliedCount}, Skipped: ${skippedCount}`
    );
  } finally {
    await pool.end();
  }
}

/**
 * Rollback: remove the last applied migration from the tracking table.
 * NOTE: This does NOT undo the SQL changes. You need to write reverse SQL manually.
 */
async function rollbackLast() {
  const pool = new Pool(buildPoolConfig());

  try {
    await ensureMigrationsTable(pool);

    const result = await pool.query(
      `SELECT id, filename FROM _migrations ORDER BY id DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log("No migrations to rollback.");
      return;
    }

    const last = result.rows[0];
    await pool.query(`DELETE FROM _migrations WHERE id = $1`, [last.id]);
    console.log(`Rolled back migration record: ${last.filename}`);
    console.log(
      "NOTE: The SQL changes are NOT automatically undone. " +
        "Write and run reverse SQL if needed."
    );
  } finally {
    await pool.end();
  }
}

// CLI entry point
const args = process.argv.slice(2);

if (args.includes("--rollback")) {
  rollbackLast().catch((error) => {
    console.error("Rollback failed:", error.message || error);
    process.exit(1);
  });
} else {
  runMigrations().catch((error) => {
    console.error("Migration failed:", error.message || error);
    process.exit(1);
  });
}
