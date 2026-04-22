import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

function euclideanDistance(vecA, vecB) {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += Math.pow(vecA[i] - vecB[i], 2);
  }
  return Math.sqrt(sum);
}

/**
 * Compare a probe vector against stored vectors (single or multi-angle).
 * Returns the minimum distance found.
 */
function matchVectors(probeVector, storedData) {
  // storedData can be:
  //   [0.1, 0.2, ...] - single 128D vector
  //   [[0.1, 0.2, ...], [0.3, 0.4, ...]] - multi-angle array of 128D vectors
  
  if (!Array.isArray(storedData) || storedData.length === 0) return Infinity;
  
  // Check if it's a single vector (first element is a number) or multi-vector (first element is array)
  const isMultiVector = Array.isArray(storedData[0]);
  
  if (isMultiVector) {
    let minDist = Infinity;
    for (const vec of storedData) {
      if (Array.isArray(vec) && vec.length === probeVector.length) {
        const d = euclideanDistance(probeVector, vec);
        if (d < minDist) minDist = d;
      }
    }
    return minDist;
  } else {
    // Single vector
    if (storedData.length === probeVector.length) {
      return euclideanDistance(probeVector, storedData);
    }
    return Infinity;
  }
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
    let minDistance = 0.85; // Threshold for OpenFace 128D (webcam quality)
    let bestDistanceOverall = Infinity;

    for (const user of users) {
      let dbVector;
      try {
        dbVector = typeof user.face_vector === 'string' ? JSON.parse(user.face_vector) : user.face_vector;
      } catch(e) { continue; }
      
      const distance = matchVectors(vector, dbVector);
      if (distance < bestDistanceOverall) bestDistanceOverall = distance;
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = user;
      }
    }

    console.log(`[FaceAI] Best distance: ${bestDistanceOverall === Infinity ? 'N/A' : bestDistanceOverall.toFixed(4)}, threshold: 0.85, matched: ${bestMatch ? bestMatch.name : 'none'}`);

    if (bestMatch) {
      return NextResponse.json({ success: true, user: { id: bestMatch.id, name: bestMatch.name, distance: minDistance } });
    } else {
      return NextResponse.json({ success: false, error: 'No matching valid face found', bestDistance: bestDistanceOverall === Infinity ? null : bestDistanceOverall });
    }
  } catch (error) {
    console.error('Identify error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
