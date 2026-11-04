export const MAX_FACE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Validate an uploaded image File and convert it to a data URL.
 * Returns { ok: true, imageUrl } or { ok: false, status, error, code }.
 */
export async function fileToDataUrl(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return { ok: false, status: 400, error: 'No image file provided', code: 'MISSING_FILE' };
  }

  const type = (file.type || 'image/jpeg').toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(type)) {
    return { ok: false, status: 415, error: 'Only JPEG, PNG or WEBP images are accepted', code: 'UNSUPPORTED_TYPE' };
  }

  if (file.size > MAX_FACE_IMAGE_BYTES) {
    return { ok: false, status: 413, error: 'File size exceeds 5MB limit', code: 'PAYLOAD_TOO_LARGE' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength === 0) {
    return { ok: false, status: 400, error: 'Empty image file', code: 'EMPTY_FILE' };
  }
  if (buffer.byteLength > MAX_FACE_IMAGE_BYTES) {
    return { ok: false, status: 413, error: 'File size exceeds 5MB limit', code: 'PAYLOAD_TOO_LARGE' };
  }

  return { ok: true, imageUrl: `data:${type};base64,${buffer.toString('base64')}` };
}
