import { getSessionUser } from "./sessionAuth";

/**
 * Require admin role for an API route.
 *
 * Returns { ok: true, user } or { ok: false, response: Response }
 */
export async function requireAdmin(request) {
  const user = await getSessionUser(request);

  if (!user) {
    return {
      ok: false,
      response: Response.json(
        { success: false, message: "Vui lòng đăng nhập" },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "admin") {
    return {
      ok: false,
      response: Response.json(
        { success: false, message: "Bạn không có quyền admin để thực hiện thao tác này" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}
