import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { requireAdmin } from '../../../lib/requireAdmin';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = new Set(['Pending', 'Valid', 'Invalid']);

export async function PUT(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    const status = String(body?.status || '');
    const name = String(body?.name || '').trim().slice(0, 100) || 'Unknown';

    if (!Number.isInteger(id) || id <= 0 || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE face_users SET status = $1, name = $2 WHERE id = $3`,
      [status, name, id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Face not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Classify error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
