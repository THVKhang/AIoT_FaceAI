import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { requireAuth } from '../../../lib/sessionAuth';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    // face_vector is intentionally not returned: the UI does not need it and
    // biometric templates should not leave the server.
    const result = await pool.query(
      `SELECT id, name, image_url, status, created_at FROM face_users ORDER BY created_at DESC`
    );
    return NextResponse.json({ users: result.rows, viewerRole: auth.user.role });
  } catch (error) {
    console.error('Fetch all faces error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
