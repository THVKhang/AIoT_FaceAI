import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function POST(req) {
  try {
    // Only admin can delete faces
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing face ID' }, { status: 400 });
    }

    await pool.query('DELETE FROM face_users WHERE id = $1', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
