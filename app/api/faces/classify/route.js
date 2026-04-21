import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export async function PUT(req) {
  try {
    const { id, status, name } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await pool.query(
      `UPDATE face_users SET status = $1, name = $2 WHERE id = $3`,
      [status, name || 'Unknown', id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Classify error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
