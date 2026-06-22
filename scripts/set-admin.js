const fs = require("fs");
const { Pool } = require("pg");

function loadEnvFile(fileName) {
  if (!fs.existsSync(fileName)) return;
  const lines = fs.readFileSync(fileName, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const url = process.env.DATABASE_URL.replace(/([?&])sslmode=[^&]*(&?)/i, (_, p, s) => {
  if (p === "?" && s) return "?";
  if (p === "&" && s) return "&";
  return "";
}).replace(/[?&]$/, "");

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function run() {
  const result = await pool.query(
    "UPDATE app_users SET role = 'admin' WHERE username = 'admin' RETURNING username, role"
  );
  if (result.rows.length > 0) {
    console.log("Updated:", JSON.stringify(result.rows[0]));
  } else {
    console.log("No user found with username 'admin'");
  }
  await pool.end();
}

run().catch((e) => { console.error("Error:", e.message); pool.end(); });
