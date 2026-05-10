import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

/**
 * POST /api/faces/identify-or-register
 * 
 * Accepts a webcam photo upload with face_vector and optional name.
 * If name is provided, auto-approves the face as "Valid".
 * Otherwise saves as "Pending" for admin review.
 */
export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const faceVectorStr = formData.get('face_vector') || '[]';
    const name = formData.get('name')?.toString()?.trim() || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to base64 data URL for storage
    const base64Image = buffer.toString('base64');
    const imageUrl = `data:${file.type || 'image/jpeg'};base64,${base64Image}`;

    // If name is provided → auto-approve as Valid, otherwise Pending
    const status = name && name !== 'Unknown' ? 'Valid' : 'Pending';
    const displayName = name || 'Unknown';

    const result = await pool.query(
      `INSERT INTO face_users (name, face_vector, image_url, status) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [displayName, faceVectorStr, imageUrl, status]
    );

    const newId = result.rows[0].id;

    // Log the access event
    try {
      await pool.query(
        `INSERT INTO access_logs (face_user_id, result, method) VALUES ($1, $2, 'browser-webcam')`,
        [newId, status === 'Valid' ? 'success' : 'registered']
      );
    } catch (logErr) {
      console.warn('Could not log access event:', logErr.message);
    }

    const message = status === 'Valid'
      ? `✅ Đã đăng ký và phê duyệt "${displayName}" (ID #${newId})`
      : `Ảnh đã được lưu (ID #${newId}). Hãy phê duyệt trong Pending Approvals.`;

    return NextResponse.json({
      success: true,
      message,
      id: newId,
      status,
    });
  } catch (error) {
    console.error('Webcam upload error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi lưu ảnh webcam' }, { status: 500 });
  }
}
