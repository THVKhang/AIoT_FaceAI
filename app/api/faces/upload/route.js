import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const vectorStr = formData.get('vector');     // single vector (legacy)
    const vectorsStr = formData.get('vectors');   // multi-angle vectors array

    if (!file || (!vectorStr && !vectorsStr)) {
      return NextResponse.json({ success: false, error: 'Missing file or vector(s)', code: 'MISSING_PARAMS' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    
    // Check file size (e.g. max 5MB)
    if (bytes.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File size exceeds 5MB limit', code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
    }

    const buffer = Buffer.from(bytes);

    // Convert image buffer to base64 string for Vercel compatibility
    const base64Image = buffer.toString('base64');
    // Ensure we only store legitimate image types
    const mimeType = file.type?.startsWith('image/') ? file.type : 'image/jpeg';
    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    
    // Support both single vector and multi-angle vectors safely
    let faceVector;
    try {
      if (vectorsStr) {
        faceVector = JSON.parse(vectorsStr); 
        if (!Array.isArray(faceVector)) throw new Error('Vectors must be an array');
      } else {
        faceVector = JSON.parse(vectorStr);
        if (!Array.isArray(faceVector)) throw new Error('Vector must be an array');
      }
    } catch (parseError) {
      return NextResponse.json({ success: false, error: 'Invalid vector format. Must be valid JSON array.', code: 'INVALID_JSON' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO face_users (name, face_vector, image_url, status) 
       VALUES ($1, $2, $3, 'Pending') RETURNING id`,
      ['Unknown', JSON.stringify(faceVector), imageUrl]
    );

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[API Upload] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
