import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export async function GET() {
  try {
    const result = await pool.query(`SELECT id, name, image_url, status, created_at FROM face_users ORDER BY created_at DESC`);
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Fetch all faces error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
