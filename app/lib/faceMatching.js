/**
 * Pure helpers for comparing 128-D face descriptors.
 */

export const DEFAULT_MATCH_THRESHOLD = 0.85;
export const DESCRIPTOR_LENGTH = 128;

export function getMatchThreshold() {
  const value = Number(process.env.FACE_MATCH_THRESHOLD);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MATCH_THRESHOLD;
}

export function euclideanDistance(vecA, vecB) {
  let sum = 0;
  for (let i = 0; i < vecA.length; i += 1) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function isNumericVector(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

/**
 * Normalize stored data into a list of vectors.
 * Accepts a single vector [n, n, ...], a list of vectors [[...], [...]],
 * an object map {"0": n, ...} (Float32Array serialized via JSON), or a JSON string.
 */
export function normalizeVectors(stored) {
  let data = stored;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }

  const toArray = (v) => {
    if (Array.isArray(v)) return v.map(Number);
    if (v && typeof v === "object") return Object.values(v).map(Number);
    return null;
  };

  if (!data) return [];

  if (Array.isArray(data) && data.length > 0 && typeof data[0] !== "number") {
    return data.map(toArray).filter(isNumericVector);
  }

  const single = toArray(data);
  return isNumericVector(single) ? [single] : [];
}

/**
 * Minimum distance between the probe and any stored vector of the same length.
 */
export function matchVectors(probeVector, storedData) {
  let minDist = Infinity;
  for (const vec of normalizeVectors(storedData)) {
    if (vec.length !== probeVector.length) continue;
    const d = euclideanDistance(probeVector, vec);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Find the closest user under `threshold`.
 * Returns { match: user|null, distance, bestDistance }.
 */
export function findBestMatch(probeVector, users, threshold = getMatchThreshold()) {
  let match = null;
  let distance = threshold;
  let bestDistance = Infinity;

  for (const user of users) {
    const d = matchVectors(probeVector, user.face_vector);
    if (d < bestDistance) bestDistance = d;
    if (d < distance) {
      distance = d;
      match = user;
    }
  }

  return {
    match,
    distance: match ? distance : null,
    bestDistance: Number.isFinite(bestDistance) ? bestDistance : null,
  };
}
