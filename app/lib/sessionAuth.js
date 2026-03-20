import { pool } from "./db";

function unauthorized(message = "Vui lòng đăng nhập") {
  return Response.json({ success: false, message }, { status: 401 });
}

function forbidden(message = "Bạn không có quyền thực hiện thao tác này") {
  return Response.json({ success: false, message }, { status: 403 });
}

export async function getSessionUser(request) {
  const sessionToken = request.cookies.get("session")?.value;
  if (!sessionToken) return null;

  try {
    const result = await pool.query(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.role AS base_role,
          CASE
            WHEN s.elevated_role = 'admin' AND s.elevated_until > CURRENT_TIMESTAMP THEN 'admin'
            ELSE u.role
          END AS role,
          (s.elevated_role = 'admin' AND s.elevated_until > CURRENT_TIMESTAMP) AS is_elevated,
          s.elevated_until
        FROM auth_sessions s
        INNER JOIN app_users u
          ON u.id = s.user_id
        WHERE s.session_token = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `,
      [sessionToken]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      baseRole: row.base_role,
      isElevated: Boolean(row.is_elevated),
      elevatedUntil: row.elevated_until,
      sessionToken,
    };
  } catch (error) {
    if (error?.code !== "42703") {
      throw error;
    }

    const fallback = await pool.query(
      `
        SELECT u.id, u.username, u.email, u.role
        FROM auth_sessions s
        INNER JOIN app_users u
          ON u.id = s.user_id
        WHERE s.session_token = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `,
      [sessionToken]
    );

    if (fallback.rows.length === 0) return null;
    const row = fallback.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      baseRole: row.role,
      isElevated: false,
      elevatedUntil: null,
      sessionToken,
    };
  }
}

export async function requireAuth(request) {
  const user = await getSessionUser(request);

  if (!user) {
    return { ok: false, response: unauthorized("Phiên đăng nhập không hợp lệ hoặc đã hết hạn") };
  }

  return { ok: true, user };
}

export async function requireRole(request, allowedRoles = []) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  const role = String(auth.user.role || "user").toLowerCase();
  if (allowedRoles.length > 0 && !allowedRoles.map((r) => r.toLowerCase()).includes(role)) {
    return { ok: false, response: forbidden() };
  }

  return auth;
}
