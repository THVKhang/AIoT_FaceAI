import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { requireFaceApiAuth } from '../../../lib/faceApiAuth';
import { normalizeVectors } from '../../../lib/faceMatching';
import { fileToDataUrl } from '../../../lib/faceUpload';

export const runtime = 'nodejs';

const MAX_NAME_LENGTH = 100;

/**
 * POST /api/faces/identify-or-register
 *
 * Accepts a webcam photo upload with face_vector and optional name.
 * A named face is auto-approved as "Valid" only when the caller is an admin
 * (session) or a trusted service (API key). Everyone else goes to "Pending"
 * so an admin must approve before the face can open the door.
 */
export async function POST(req) {
  try {
    const auth = await requireFaceApiAuth(req);
    if (!auth.ok) return auth.response;

    const formData = await req.formData();
    const file = formData.get('file');
    const faceVectorStr = formData.get('face_vector');
    const name = (formData.get('name')?.toString() || '').trim().slice(0, MAX_NAME_LENGTH);

    const image = await fileToDataUrl(file);
    if (!image.ok) {
      return NextResponse.json({ success: false, error: image.error, code: image.code }, { status: image.status });
    }

    const vectors = normalizeVectors(faceVectorStr ? String(faceVectorStr) : '');
    if (vectors.length === 0) {
      return NextResponse.json(
        { success: false, error: 'face_vector must be a JSON array of numbers (or array of arrays)', code: 'INVALID_VECTOR' },
        { status: 400 }
      );
    }

    const canAutoApprove = auth.method === 'api-key' || auth.user?.role === 'admin';
    const hasName = Boolean(name) && name !== 'Unknown';
    const status = hasName && canAutoApprove ? 'Valid' : 'Pending';
    const displayName = name || 'Unknown';

    const result = await pool.query(
      `INSERT INTO face_users (name, face_vector, image_url, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [displayName, JSON.stringify(vectors.length === 1 ? vectors[0] : vectors), image.imageUrl, status]
    );

    const newId = result.rows[0].id;

    try {
      await pool.query(
        `INSERT INTO system_logs (event_name, source, severity, log_details)
         VALUES ('FACE_REGISTERED', 'faceai', 'info', $1)`,
        [`Face #${newId} "${displayName}" registered with status ${status} (${auth.method})`]
      );
    } catch (logErr) {
      console.warn('Could not log registration event:', logErr.message);
    }

    let message;
    if (status === 'Valid') {
      message = `✅ Đã đăng ký và phê duyệt "${displayName}" (ID #${newId})`;
    } else if (hasName) {
      message = `Đã lưu "${displayName}" (ID #${newId}). Cần admin phê duyệt trước khi có hiệu lực.`;
    } else {
      message = `Ảnh đã được lưu (ID #${newId}). Hãy phê duyệt trong Pending Approvals.`;
    }

    return NextResponse.json({ success: true, message, id: newId, status });
  } catch (error) {
    console.error('Webcam upload error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi lưu ảnh webcam' }, { status: 500 });
  }
}
