import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { requireFaceApiAuth } from '../../../lib/faceApiAuth';
import { normalizeVectors } from '../../../lib/faceMatching';
import { fileToDataUrl } from '../../../lib/faceUpload';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const auth = await requireFaceApiAuth(req);
    if (!auth.ok) return auth.response;

    const formData = await req.formData();
    const file = formData.get('file');
    const vectorStr = formData.get('vector');     // single vector (legacy)
    const vectorsStr = formData.get('vectors');   // multi-angle vectors array

    if (!file || (!vectorStr && !vectorsStr)) {
      return NextResponse.json({ success: false, error: 'Missing file or vector(s)', code: 'MISSING_PARAMS' }, { status: 400 });
    }

    const image = await fileToDataUrl(file);
    if (!image.ok) {
      return NextResponse.json({ success: false, error: image.error, code: image.code }, { status: image.status });
    }

    const vectors = normalizeVectors(String(vectorsStr || vectorStr));
    if (vectors.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid vector format. Must be a JSON array of numbers (or array of arrays).', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO face_users (name, face_vector, image_url, status)
       VALUES ($1, $2, $3, 'Pending') RETURNING id`,
      ['Unknown', JSON.stringify(vectors.length === 1 ? vectors[0] : vectors), image.imageUrl]
    );

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[API Upload] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
