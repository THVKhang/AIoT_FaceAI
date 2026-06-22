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

app = FastAPI(title="Face AI Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://hcmutfaceai.vercel.app",
    ],
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

def fetch_vectors_from_db():
    global cached_faces
    while True:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, face_vector FROM face_users WHERE status = 'Valid' AND face_vector IS NOT NULL")
            rows = cursor.fetchall()
            
            new_cache = []
            for row in rows:
                user_id, name, vector_json = row
                try:
                    # Parse JSONB array or stringified array
                    if isinstance(vector_json, str):
                        vector = json.loads(vector_json)
                    else:
                        vector = vector_json
                    
                    # Handle object dict format legacy
                    if isinstance(vector, dict):
                        vector = list(vector.values())
                    
                    if len(vector) == 128:
                        new_cache.append({
                            "id": user_id,
                            "name": name,
                            "vector": np.array(vector, dtype=np.float32)
                        })
                except Exception as e:
                    logger.warning(f"Error parsing vector for user {name}: {e}")
            
            with cache_lock:
                cached_faces = new_cache
                
            cursor.close()
            conn.close()
            logger.info(f"Loaded {len(cached_faces)} valid faces from DB.")
        except Exception as e:
            logger.error(f"DB Fetch Error: {e}")
        
        time.sleep(10) # Refresh every 10 seconds

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

def find_best_match(vector, threshold=0.6):
    best_name = "Unknown"
    best_distance = float('inf')
    
    with cache_lock:
        local_cache = list(cached_faces)
        
    for f in local_cache:
        # Euclidean distance
        dist = np.linalg.norm(vector - f["vector"])
        if dist < best_distance:
            best_distance = float(dist)
            best_name = f["name"]
            
    if best_distance < threshold:
        return best_name, best_distance, True
    return best_name, best_distance, False

@app.post("/api/recognize")
async def recognize_face(req: ImageRequest):
    try:
        img_str = req.image
        if img_str.startswith('data:image'):
            img_str = img_str.split(',')[1]
            
        img_bytes = base64.b64decode(img_str)
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
        img_str = req.image
        if img_str.startswith('data:image'):
            img_str = img_str.split(',')[1]
            
        img_bytes = base64.b64decode(img_str)
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
    return {"status": "ok", "cached_faces": len(cached_faces)}

if __name__ == "__main__":
    import uvicorn
    # Start on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
