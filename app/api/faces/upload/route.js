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
      return NextResponse.json({ error: 'Missing file or vector(s)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'faces');
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const imageUrl = `/uploads/faces/${filename}`;
    
    // Support both single vector and multi-angle vectors
    let faceVector;
    if (vectorsStr) {
      faceVector = JSON.parse(vectorsStr); // array of vectors [[...], [...], ...]
    } else {
      faceVector = JSON.parse(vectorStr);  // single vector [...]
    }

    const result = await pool.query(
      `INSERT INTO face_users (name, face_vector, image_url, status) 
       VALUES ($1, $2, $3, 'Pending') RETURNING id`,
      ['Unknown', JSON.stringify(faceVector), imageUrl]
    );

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
