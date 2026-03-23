import { pool } from "../db";

export async function findUsersByIdentity(identity) {
  const looksLikeEmail = identity.includes("@");

  if (looksLikeEmail) {
    const result = await pool.query(
      `
        SELECT id, username, email
        FROM app_users
        WHERE LOWER(email) = LOWER($1)
        ORDER BY id DESC
        LIMIT 1
      `,
      [identity]
    );
    return result.rows;
  }

  const result = await pool.query(
    `
      SELECT id, username, email
      FROM app_users
      WHERE username = $1
      LIMIT 1
    `,
    [identity]
  );

  return result.rows;
}

export async function insertPasswordResetToken(userId, tokenHash) {
  await pool.query(
    `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
    `,
    [userId, tokenHash]
  );
}

export async function deletePasswordResetTokenByHash(tokenHash) {
  await pool.query(
    `
      DELETE FROM password_reset_tokens
      WHERE token_hash = $1
    `,
    [tokenHash]
  );
}
