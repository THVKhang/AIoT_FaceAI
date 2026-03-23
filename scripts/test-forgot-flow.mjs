import pg from "pg";

const email = process.argv[2] || "";
const baseUrl = process.argv[3] || "http://localhost:3001";

if (!email) {
  console.error("Usage: node scripts/test-forgot-flow.mjs <email> [baseUrl]");
  process.exit(1);
}

const raw = process.env.DATABASE_URL || "";
const normalized = raw.replace("?sslmode=require", "").replace("&sslmode=require", "");

if (!normalized) {
  console.error("DATABASE_URL is missing in terminal environment");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: normalized,
  ssl: { rejectUnauthorized: false },
});

async function getTokenCountByEmail(targetEmail) {
  const sql = `
    SELECT COUNT(*)::int AS c
    FROM password_reset_tokens t
    JOIN app_users u ON u.id = t.user_id
    WHERE LOWER(u.email) = LOWER($1)
  `;
  const result = await pool.query(sql, [targetEmail]);
  return Number(result.rows[0]?.c || 0);
}

async function main() {
  const tokensBefore = await getTokenCountByEmail(email);

  const response = await fetch(`${baseUrl}/api/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountIdentifier: email }),
  });

  const rawResponse = await response.text();
  let apiData = null;

  try {
    apiData = JSON.parse(rawResponse);
  } catch {
    apiData = { parseError: true, rawResponse };
  }

  const tokensAfter = await getTokenCountByEmail(email);

  console.log(
    JSON.stringify(
      {
        email,
        baseUrl,
        status: response.status,
        apiData,
        tokensBefore,
        tokensAfter,
        inserted: tokensAfter - tokensBefore,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("test-forgot-flow failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
