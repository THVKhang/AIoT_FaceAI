import { pool } from "../db";

export async function findActiveResetToken(client, tokenHash) {
  const result = await client.query(
    `
      SELECT id, user_id
      FROM password_reset_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `,
    [tokenHash]
  );

  return result.rows[0] || null;
}

export async function findUserByRecoveryIdentity(client, identity) {
  const looksLikeEmail = String(identity || "").includes("@");

  if (looksLikeEmail) {
    const result = await client.query(
      `
        SELECT id, username, email, recovery_code_hash, recovery_code_created_at
        FROM app_users
        WHERE LOWER(email) = LOWER($1)
        ORDER BY id ASC
        LIMIT 1
      `,
      [identity]
    );

    return result.rows[0] || null;
  }

  const result = await client.query(
    `
      SELECT id, username, email, recovery_code_hash, recovery_code_created_at
      FROM app_users
      WHERE username = $1
      LIMIT 1
    `,
    [identity]
  );

  return result.rows[0] || null;
}

export async function updateUserPassword(client, userId, passwordHash) {
  await client.query(
    `
      UPDATE app_users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
    [passwordHash, userId]
  );
}

export async function markResetTokenUsed(client, tokenId) {
  await client.query(
    `
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [tokenId]
  );
}

export async function revokeUserSessions(client, userId) {
  await client.query(
    `
      UPDATE auth_sessions
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [userId]
  );
}

export async function runInTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
