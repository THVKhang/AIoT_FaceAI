import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

function euclideanDistance(vecA, vecB) {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += Math.pow(vecA[i] - vecB[i], 2);
  }
  return Math.sqrt(sum);
}

export async function POST(req) {
  try {
    const { vector } = await req.json();

    if (!vector || !Array.isArray(vector)) {
      return NextResponse.json({ error: 'Invalid vector' }, { status: 400 });
    }

    const result = await pool.query(`SELECT id, name, face_vector FROM face_users WHERE status = 'Valid'`);
    const users = result.rows;

    let bestMatch = null;
    let minDistance = 0.6; // Threshold

    for (const user of users) {
      let dbVector;
      try {
        dbVector = typeof user.face_vector === 'string' ? JSON.parse(user.face_vector) : user.face_vector;
      } catch(e) { continue; }
      
      const distance = euclideanDistance(vector, dbVector);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = user;
      }
    }

    if (bestMatch) {
      return NextResponse.json({ success: true, user: { id: bestMatch.id, name: bestMatch.name, distance: minDistance } });
    } else {
      return NextResponse.json({ success: false, error: 'No matching valid face found' });
    }
  } catch (error) {
    console.error('Identify error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
