import { NextResponse } from "next/server";
import { requireAuth } from "../../lib/sessionAuth";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    success: true,
    data: {
      id: auth.user.id,
      username: auth.user.username,
      email: auth.user.email,
      role: auth.user.role,
    },
  });
}
