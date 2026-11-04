import os
import cv2
import json
import base64
import numpy as np
import psycopg2
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import threading
import time

# ============================================================
# Configuration & Logging
# ============================================================
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("FastAPI_FaceAI")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env.local"), override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL not found in .env")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
MATCH_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD_FASTAPI", "0.6"))
DESCRIPTOR_LENGTH = 128
MAX_IMAGE_BYTES = 5 * 1024 * 1024

DEFAULT_ORIGINS = "http://localhost:3000,http://localhost:3001,https://hcmutfaceai.vercel.app"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("FACEAI_ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()]

app = FastAPI(title="Face AI Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# AI Models Initialization
# ============================================================
logger.info("Initializing AI Models...")
try:
    detector_prototxt = os.path.join(MODELS_DIR, "deploy.prototxt")
    detector_model = os.path.join(MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel")
    face_detector = cv2.dnn.readNetFromCaffe(detector_prototxt, detector_model)

    embedder_model = os.path.join(MODELS_DIR, "openface_nn4.small2.v1.t7")
    face_embedder = cv2.dnn.readNetFromTorch(embedder_model)
    logger.info("Models loaded successfully.")
except Exception as e:
    logger.critical(f"Failed to load AI models: {e}")
    raise e

# ============================================================
# Database & In-Memory Vector Cache
# ============================================================
cached_faces = []
cache_lock = threading.Lock()

def parse_stored_vectors(vector_json) -> List[np.ndarray]:
    """Accept a single 128-D vector, a list of vectors (multi-pose), a dict map or a JSON string."""
    vector = json.loads(vector_json) if isinstance(vector_json, str) else vector_json
    if isinstance(vector, dict):
        vector = list(vector.values())
    if not isinstance(vector, list) or not vector:
        return []
    candidates = vector if isinstance(vector[0], (list, dict)) else [vector]
    result = []
    for c in candidates:
        if isinstance(c, dict):
            c = list(c.values())
        if isinstance(c, list) and len(c) == DESCRIPTOR_LENGTH:
            result.append(np.array(c, dtype=np.float32))
    return result


def load_faces_once():
    global cached_faces
    if not DATABASE_URL:
        return
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name, face_vector FROM face_users WHERE status = 'Valid' AND face_vector IS NOT NULL")
            rows = cursor.fetchall()

        new_cache = []
        for user_id, name, vector_json in rows:
            try:
                vectors = parse_stored_vectors(vector_json)
                if vectors:
                    new_cache.append({"id": user_id, "name": name, "vectors": vectors})
            except Exception as e:
                logger.warning(f"Error parsing vector for user {name}: {e}")

        with cache_lock:
            cached_faces = new_cache
        logger.info(f"Loaded {len(new_cache)} valid faces from DB.")
    except Exception as e:
        logger.error(f"DB Fetch Error: {e}")
    finally:
        if conn is not None:
            conn.close()


def fetch_vectors_from_db():
    while True:
        load_faces_once()
        time.sleep(10)  # Refresh every 10 seconds

# Start cache thread
db_thread = threading.Thread(target=fetch_vectors_from_db, daemon=True)
db_thread.start()

# ============================================================
# API Routes
# ============================================================
class ImageRequest(BaseModel):
    image: str # Base64 encoded JPEG

def extract_faces_from_image(image_bytes):
    # Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image format")
        
    h, w = frame.shape[:2]
    blob = cv2.dnn.blobFromImage(cv2.resize(frame, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
    face_detector.setInput(blob)
    detections = face_detector.forward()
    
    results = []
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence > 0.5: # Lowered threshold slightly for better recall
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            (startX, startY, endX, endY) = box.astype("int")
            startX, startY = max(0, startX), max(0, startY)
            endX, endY = min(w, endX), min(h, endY)
            
            fw = endX - startX
            fh = endY - startY
            
            if fw < 50 or fh < 50:
                continue # Skip too small faces
                
            face_crop = frame[startY:endY, startX:endX]
            
            # Extract embedding
            face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
            emb_blob = cv2.dnn.blobFromImage(face_rgb, 1.0/255.0, (96, 96), (0, 0, 0), swapRB=False, crop=False)
            face_embedder.setInput(emb_blob)
            vector = face_embedder.forward()[0]
            
            results.append({
                "box": {"x": int(startX), "y": int(startY), "width": int(fw), "height": int(fh)},
                "vector": vector
            })
            
    return results

def find_best_match(vector, threshold=MATCH_THRESHOLD):
    """Returns (name, distance or None, is_known). distance is None when nothing is registered."""
    best_name = "Unknown"
    best_distance = float('inf')

    with cache_lock:
        local_cache = list(cached_faces)

    for f in local_cache:
        for stored in f["vectors"]:
            dist = float(np.linalg.norm(vector - stored))
            if dist < best_distance:
                best_distance = dist
                best_name = f["name"]

    if not np.isfinite(best_distance):
        # inf is not valid JSON, so report "no candidate" explicitly
        return "Unknown", None, False
    if best_distance < threshold:
        return best_name, best_distance, True
    return "Unknown", best_distance, False


def decode_image(img_str: str) -> bytes:
    if img_str.startswith('data:image'):
        img_str = img_str.split(',', 1)[1]
    try:
        img_bytes = base64.b64decode(img_str, validate=False)
    except Exception:
        raise ValueError("Invalid base64 image")
    if not img_bytes:
        raise ValueError("Empty image")
    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Image exceeds 5MB limit")
    return img_bytes

@app.post("/api/recognize")
async def recognize_face(req: ImageRequest):
    try:
        img_bytes = decode_image(req.image)
        detected_faces = extract_faces_from_image(img_bytes)

        response_faces = []
        for d in detected_faces:
            name, dist, is_known = find_best_match(d["vector"])
            response_faces.append({
                "box": d["box"],
                "name": name,
                "distance": dist,
                "is_known": is_known
            })
            
        return {"success": True, "faces": response_faces}
    except Exception as e:
        logger.error(f"Recognition Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/extract")
async def extract_vector(req: ImageRequest):
    """ Used for registering new faces from Web """
    try:
        img_bytes = decode_image(req.image)
        detected_faces = extract_faces_from_image(img_bytes)

        if len(detected_faces) == 0:
            return {"success": False, "error": "Không tìm thấy khuôn mặt nào"}
        if len(detected_faces) > 1:
            return {"success": False, "error": "Phát hiện nhiều hơn 1 khuôn mặt. Hãy chắc chắn chỉ có bạn trong khung hình."}
            
        # Return the 128D vector
        vector = detected_faces[0]["vector"].tolist()
        return {"success": True, "vector": vector}
    except Exception as e:
        logger.error(f"Extraction Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/health")
async def health_check():
    with cache_lock:
        count = len(cached_faces)
    return {"status": "ok", "cached_faces": count, "threshold": MATCH_THRESHOLD}

if __name__ == "__main__":
    import uvicorn
    # Start on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
