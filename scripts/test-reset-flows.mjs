import crypto from "crypto";
import pg from "pg";

const baseUrl = process.argv[2] || "http://localhost:3001";
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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function randomHex(length = 12) {
  return crypto.randomBytes(length).toString("hex");
}

async function createTestUser() {
  const suffix = Date.now();
  const username = `resettest_${suffix}`;
  const email = `khangtran213213@gmail.com`;
  const recoveryCode = "ABCD2345EF";

  const result = await pool.query(
    `
      INSERT INTO app_users (username, email, password_hash, role, recovery_code_hash, recovery_code_created_at)
      VALUES ($1, $2, $3, 'user', $4, CURRENT_TIMESTAMP)
      RETURNING id, username, email
    `,
    [username, email, hashPassword("Aa123456"), hashToken(recoveryCode)]
  );

  return {
    id: result.rows[0].id,
    username,
    email,
    recoveryCode,
  };
}

async function insertActiveSession(userId) {
  const sessionToken = randomHex(24);
  await pool.query(
    `
      INSERT INTO auth_sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '2 days')
    `,
    [userId, sessionToken]
  );
}

async function insertResetToken(userId, resetTokenRaw) {
  await pool.query(
    `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
    `,
    [userId, hashToken(resetTokenRaw)]
  );
}

async function getUserState(userId) {
  const userResult = await pool.query(
    `SELECT password_hash FROM app_users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  const tokenResult = await pool.query(
    `SELECT COUNT(*)::int AS c FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NOT NULL`,
    [userId]
  );

  const activeSessionResult = await pool.query(
    `SELECT COUNT(*)::int AS c FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );

  return {
    passwordHash: String(userResult.rows[0]?.password_hash || ""),
    usedTokens: Number(tokenResult.rows[0]?.c || 0),
    activeSessions: Number(activeSessionResult.rows[0]?.c || 0),
  };
}

async function cleanupUser(userId) {
  await pool.query(`DELETE FROM app_users WHERE id = $1`, [userId]);
}

async function callResetApi(payload) {
  const response = await fetch(`${baseUrl}/api/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { parseError: true, raw: text };
  }

  return {
    status: response.status,
    data,
  };
}

async function main() {
  const user = await createTestUser();
  const report = {
    baseUrl,
    username: user.username,
    tokenFlow: null,
    recoveryFlow: null,
  };

  try {
    await insertActiveSession(user.id);

    const tokenRaw = `tok_${randomHex(8)}`;
    await insertResetToken(user.id, tokenRaw);

    const beforeToken = await getUserState(user.id);
    const tokenResponse = await callResetApi({
      resetMethod: "token",
      resetToken: tokenRaw,
      newPassword: "Bb123456",
    });
    const afterToken = await getUserState(user.id);

    report.tokenFlow = {
      response: tokenResponse,
      passwordChanged: beforeToken.passwordHash !== afterToken.passwordHash,
      usedTokensBefore: beforeToken.usedTokens,
      usedTokensAfter: afterToken.usedTokens,
      activeSessionsAfter: afterToken.activeSessions,
    };

    await insertActiveSession(user.id);

    const beforeRecovery = await getUserState(user.id);
    const recoveryResponse = await callResetApi({
      resetMethod: "recovery",
      accountIdentifier: user.username,
      recoveryCode: user.recoveryCode,
      newPassword: "Cc123456",
    });
    const afterRecovery = await getUserState(user.id);

    report.recoveryFlow = {
      response: recoveryResponse,
      passwordChanged: beforeRecovery.passwordHash !== afterRecovery.passwordHash,
      usedTokensBefore: beforeRecovery.usedTokens,
      usedTokensAfter: afterRecovery.usedTokens,
      activeSessionsAfter: afterRecovery.activeSessions,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await cleanupUser(user.id);
  }
}

main()
  .catch((error) => {
    console.error("test-reset-flows failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
