import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { requireAdmin } from '../../../lib/requireAdmin';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    const id = Number(body?.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Missing face ID' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM face_users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Face not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
