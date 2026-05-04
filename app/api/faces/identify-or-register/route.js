import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

/**
 * POST /api/faces/identify-or-register
 * 
 * Accepts a webcam photo upload (no face vector required).
 * Saves the image to the database as a "Pending" face for admin review.
 * This is the browser-webcam fallback for when the Python service is unavailable.
 */
export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to base64 data URL for storage
    const base64Image = buffer.toString('base64');
    const imageUrl = `data:${file.type || 'image/jpeg'};base64,${base64Image}`;

    // Save as a Pending face with empty vector (webcam capture, no embedding)
    const result = await pool.query(
      `INSERT INTO face_users (name, face_vector, image_url, status) 
       VALUES ($1, $2, $3, 'Pending') RETURNING id`,
      ['Unknown', '[]', imageUrl]
    );

    const newId = result.rows[0].id;

    return NextResponse.json({
      success: true,
      message: `Ảnh đã được lưu (ID #${newId}). Hãy phê duyệt trong bảng Pending Approvals.`,
      id: newId,
    });
  } catch (error) {
    console.error('Webcam upload error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi lưu ảnh webcam' }, { status: 500 });
  }
}
