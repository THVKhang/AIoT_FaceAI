import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { requireFaceApiAuth } from '../../../lib/faceApiAuth';
import { findBestMatch, getMatchThreshold, isNumericVector } from '../../../lib/faceMatching';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const auth = await requireFaceApiAuth(req);
    if (!auth.ok) return auth.response;

    let payload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload', code: 'INVALID_JSON' }, { status: 400 });
    }

    const vector = Array.isArray(payload?.vector) ? payload.vector.map(Number) : null;
    if (!isNumericVector(vector)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vector data. Must be a non-empty numeric array.', code: 'INVALID_VECTOR' },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(`SELECT id, name, face_vector FROM face_users WHERE status = 'Valid'`);
    const threshold = getMatchThreshold();
    const { match, distance, bestDistance } = findBestMatch(vector, rows, threshold);

    if (match) {
      return NextResponse.json({ success: true, user: { id: match.id, name: match.name, distance } });
    }

    return NextResponse.json({ success: false, error: 'No matching valid face found', bestDistance, threshold });
  } catch (error) {
    console.error('[API Identify] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
