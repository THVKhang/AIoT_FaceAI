import os
import sys
import time
import cv2
import json
import requests
import threading
import numpy as np
import logging
from dotenv import load_dotenv
from Adafruit_IO import MQTTClient

# ============================================================
# Production Logging Configuration
# ============================================================
os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("faceai_service.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("FaceAI")

# ============================================================
# Environment & Configuration
# ============================================================
load_dotenv()
load_dotenv(".env.local", override=True)

AIO_USERNAME = os.getenv("AIO_USERNAME")
AIO_KEY = os.getenv("AIO_KEY")

if not AIO_USERNAME or not AIO_KEY:
    logger.error("Thiếu AIO_USERNAME hoặc AIO_KEY trong file .env hoặc .env.local")
    sys.exit(1)

FEED_DOOR = "button-door"
FEED_CMD = "faceai-cmd"

API_BASE_URL = os.getenv("FACE_API_URL", "https://hcmutfaceai.vercel.app")
API_UPLOAD = f"{API_BASE_URL}/api/faces/upload"
API_IDENTIFY = f"{API_BASE_URL}/api/faces/identify"

CAMERA_URL = os.getenv("CAMERA_URL", "0")
if CAMERA_URL.isdigit():
    CAMERA_URL = int(CAMERA_URL)

STREAM_PORT = int(os.getenv("STREAM_PORT", "5001"))

# State
is_camera_on = False
is_register_mode = False
cap = None
last_unlock_time = 0
COOLDOWN_PERIOD = 10

# Visual overlay state
overlay_result = None       # 'valid', 'stranger', 'registered'
overlay_name = ""
overlay_distance = 0.0
overlay_expire_time = 0     
OVERLAY_DURATION = 5        

# Multi-angle registration scan
SCAN_POSES = ['CENTER', 'LEFT', 'RIGHT', 'UP', 'DOWN']
SCAN_LABELS = ['Nhin thang camera', 'Quay mat sang TRAI', 'Quay mat sang PHAI', 'Ngua mat LEN TREN', 'Cui mat XUONG DUOI']
SCAN_PAUSE = 3              
scan_step = 0               
scan_vectors = []            
scan_frame_snapshot = None   
scan_captured_time = 0       

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Face Detection: OpenCV DNN ResNet SSD
detector_prototxt = os.path.join(MODELS_DIR, "deploy.prototxt")
detector_model = os.path.join(MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel")
try:
    face_detector = cv2.dnn.readNetFromCaffe(detector_prototxt, detector_model)
    logger.info("Loaded OpenCV DNN Face Detector.")
except Exception as e:
    logger.error(f"Failed to load Face Detector: {e}")
    sys.exit(1)

# Face Recognition: OpenFace (128D)
embedder_model = os.path.join(MODELS_DIR, "openface_nn4.small2.v1.t7")
try:
    face_embedder = cv2.dnn.readNetFromTorch(embedder_model)
    logger.info("Loaded OpenFace Embedder.")
except Exception as e:
    logger.error(f"Failed to load Face Embedder: {e}")
    sys.exit(1)

# Stability Tracking
STABILITY_FRAMES_REQ = 8
MOVEMENT_THRESHOLD_PX = 40
stable_frames = 0
last_face_center = None
VECTOR_DIM = 128

# Shared Buffers
latest_frame = None
frame_lock = threading.Lock()
display_frame = None
display_lock = threading.Lock()
raw_frame = None
raw_lock = threading.Lock()

# ============================================================
# Camera Capture Thread (Robust with reconnect)
# ============================================================
def camera_capture_loop():
    global raw_frame, latest_frame, cap, is_camera_on
    consecutive_errors = 0
    while True:
        if not is_camera_on or cap is None:
            time.sleep(0.1)
            continue
        try:
            ret, frame = cap.read()
            if ret and frame is not None:
                consecutive_errors = 0
                frame = cv2.flip(frame, 1)
                with raw_lock:
                    raw_frame = frame.copy()
                with frame_lock:
                    latest_frame = frame.copy()
            else:
                consecutive_errors += 1
                time.sleep(0.05)
                if consecutive_errors > 20:
                    logger.warning("Camera read failing consistently. Attempting reconnection...")
                    turn_off_camera()
                    time.sleep(2)
                    turn_on_camera()
                    consecutive_errors = 0
        except Exception as e:
            logger.error(f"Camera capture error: {e}")
            time.sleep(0.5)

capture_thread = threading.Thread(target=camera_capture_loop, daemon=True, name="CameraCaptureThread")
capture_thread.start()

# ============================================================
# MJPEG Streaming Server (Production Hardened)
# ============================================================
from http.server import HTTPServer, BaseHTTPRequestHandler
import socketserver

def _make_placeholder():
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(img, "Waiting for camera...", (120, 240), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (100, 100, 100), 2)
    _, buf = cv2.imencode('.jpg', img)
    return buf.tobytes()

_placeholder_jpg = _make_placeholder()

def _activate_register_mode():
    global is_register_mode, scan_step, scan_vectors, scan_frame_snapshot, scan_captured_time
    is_register_mode = True
    scan_step = 0
    scan_vectors = []
    scan_frame_snapshot = None
    scan_captured_time = 0
    if not is_camera_on:
        turn_on_camera()
    logger.info("📸 KÍCH HOẠT CHẾ ĐỘ ĐĂNG KÝ MULTI-ANGLE (5 poses)")

class MJPEGHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            if self.path == '/video_feed' or self.path.startswith('/video_feed?'):
                self.send_response(200)
                self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.end_headers()
                while True:
                    frame = latest_frame
                    if frame is not None:
                        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                        jpg_bytes = buffer.tobytes()
                    else:
                        jpg_bytes = _placeholder_jpg
                    
                    self.wfile.write(b'--frame\r\n')
                    self.wfile.write(b'Content-Type: image/jpeg\r\n')
                    self.wfile.write(f'Content-Length: {len(jpg_bytes)}\r\n'.encode())
                    self.wfile.write(b'\r\n')
                    self.wfile.write(jpg_bytes)
                    self.wfile.write(b'\r\n')
                    self.wfile.flush()
                    time.sleep(0.05)
            elif self.path == '/health':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                health_data = json.dumps({"status": "healthy", "camera_active": is_camera_on, "timestamp": time.time()})
                self.wfile.write(health_data.encode())
            elif self.path == '/status':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                data = json.dumps({"camera": is_camera_on, "register_mode": is_register_mode})
                self.wfile.write(data.encode())
            elif self.path == '/cmd/register':
                _activate_register_mode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"ok":true,"mode":"register"}')
            elif self.path == '/cmd/on':
                turn_on_camera()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"ok":true,"camera":"on"}')
            elif self.path == '/cmd/off':
                turn_off_camera()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"ok":true,"camera":"off"}')
            else:
                self.send_response(404)
                self.end_headers()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass # Client disconnected, normal behavior
        except Exception as e:
            logger.error(f"MJPEG server error handling request {self.path}: {e}")
    
    def log_message(self, format, *args):
        pass

class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True

def start_stream_server():
    server = ThreadedHTTPServer(('0.0.0.0', STREAM_PORT), MJPEGHandler)
    logger.info(f"🌐 MJPEG Stream Server khởi động tại http://localhost:{STREAM_PORT}/video_feed")
    server.serve_forever()

stream_thread = threading.Thread(target=start_stream_server, daemon=True, name="MJPEGServerThread")
stream_thread.start()

# ============================================================
# MQTT Client (Auto Reconnect)
# ============================================================
mqtt_client = MQTTClient(AIO_USERNAME, AIO_KEY)

def turn_on_camera():
    global cap, is_camera_on
    if not is_camera_on:
        logger.info(f"📹 Đang bật Camera (URL: {CAMERA_URL})...")
        cap = cv2.VideoCapture(CAMERA_URL, cv2.CAP_DSHOW)
        if cap.isOpened():
            is_camera_on = True
            logger.info("✅ Camera đã được bật.")
        else:
            logger.error("❌ Không thể mở Camera.")

def turn_off_camera():
    global cap, is_camera_on, latest_frame, raw_frame
    if cap is not None:
        logger.info("🛑 Đang tắt Camera...")
        is_camera_on = False
        time.sleep(0.2)
        try:
            cap.release()
        except Exception as e:
            logger.warning(f"Warning during camera release: {e}")
        finally:
            cap = None
            with frame_lock:
                latest_frame = None
            with raw_lock:
                raw_frame = None
        logger.info("✅ Camera đã tắt.")

def connected(client):
    logger.info("✅ Đã kết nối Adafruit IO MQTT!")
    client.subscribe(FEED_CMD)
    logger.info(f"   Đang lắng nghe: {FEED_CMD}")

def disconnected(client):
    logger.warning("⚠️ Mất kết nối Adafruit IO MQTT. Sẽ thử kết nối lại tự động.")

def message(client, feed_id, payload):
    global is_register_mode
    payload = str(payload).strip().lower()
    logger.info(f"📥 Nhận lệnh MQTT từ {feed_id}: {payload}")
    
    if feed_id == FEED_CMD:
        if payload == "on":
            turn_on_camera()
        elif payload == "off":
            turn_off_camera()
        elif payload == "register":
            logger.info("📸 KÍCH HOẠT CHẾ ĐỘ ĐĂNG KÝ (Vui lòng nhìn thẳng vào camera)")
            is_register_mode = True
            if not is_camera_on:
                turn_on_camera()

mqtt_client.on_connect = connected
mqtt_client.on_disconnect = disconnected
mqtt_client.on_message = message

turn_on_camera()

def mqtt_loop_robust():
    while True:
        try:
            logger.info("🚀 Đang kết nối Adafruit IO MQTT...")
            mqtt_client.connect()
            mqtt_client.loop_background()
            break
        except Exception as e:
            logger.error(f"⚠️ Lỗi kết nối MQTT: {e}. Thử lại sau 5 giây...")
            time.sleep(5)

mqtt_thread = threading.Thread(target=mqtt_loop_robust, daemon=True, name="MQTTThread")
mqtt_thread.start()

# ============================================================
# AI Processing Logic
# ============================================================
def extract_vector(face_bgr):
    try:
        face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
        blob = cv2.dnn.blobFromImage(face_rgb, 1.0/255.0, (96, 96), (0, 0, 0), swapRB=False, crop=False)
        face_embedder.setInput(blob)
        vector = face_embedder.forward()
        return vector[0].tolist()
    except Exception as e:
        logger.error(f"Lỗi extract vector: {e}")
        return None

def process_registration(frame, face_rect):
    global is_register_mode, overlay_result, overlay_name, overlay_expire_time
    global scan_step, scan_vectors, scan_frame_snapshot, scan_captured_time
    
    x, y, w, h = face_rect
    face_crop = frame[y:y+h, x:x+w]
    
    pose_name = SCAN_POSES[scan_step]
    logger.info(f"📸 Scan step {scan_step+1}/5: {pose_name} - extracting vector...")
    
    vector = extract_vector(face_crop)
    if not vector:
        logger.warning(f"❌ Không trích xuất được vector cho pose {pose_name}.")
        return
    
    scan_vectors.append(vector)
    if scan_step == 0:
        scan_frame_snapshot = frame.copy()
    
    logger.info(f"✅ Pose {pose_name} captured! ({scan_step+1}/5)")
    scan_step += 1
    scan_captured_time = time.time()
    
    if scan_step >= len(SCAN_POSES):
        logger.info("🎉 All 5 poses captured! Uploading to API...")
        upload_frame = scan_frame_snapshot if scan_frame_snapshot is not None else frame
        _, buffer = cv2.imencode('.jpg', upload_frame)
        
        try:
            # Robust API call with timeout
            res = requests.post(
                API_UPLOAD,
                data={'vectors': json.dumps(scan_vectors)},
                files={'file': ('face.jpg', buffer.tobytes(), 'image/jpeg')},
                timeout=15
            )
            if res.status_code == 200:
                logger.info("✅ Đã gửi 5 vectors lên Admin duyệt (Pending)!")
                overlay_result = 'registered'
                overlay_name = "Pending Approval"
                overlay_expire_time = time.time() + OVERLAY_DURATION
            else:
                logger.error(f"❌ Lỗi gửi API: HTTP {res.status_code} - {res.text}")
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Network/Timeout error calling API Upload: {e}")
        finally:
            is_register_mode = False
            scan_step = 0
            scan_vectors = []
            scan_frame_snapshot = None

def process_identify(frame, face_rect):
    global last_unlock_time, overlay_result, overlay_name, overlay_distance, overlay_expire_time
    
    if not hasattr(process_identify, '_fail_cd'):
        process_identify._fail_cd = 0
    if time.time() - process_identify._fail_cd < 5:
        return
    
    x, y, w, h = face_rect
    face_crop = frame[y:y+h, x:x+w]
    
    logger.debug("🔍 Đang nhận diện khuôn mặt...")
    vector = extract_vector(face_crop)
    if not vector:
        return
    
    try:
        res = requests.post(API_IDENTIFY, json={'vector': vector}, timeout=10)
        data = res.json()
        if res.status_code == 200 and data.get("success"):
            user = data["user"]
            logger.info(f"🔓 NHẬN DIỆN THÀNH CÔNG: {user['name']} (Distance: {user['distance']:.2f})")
            mqtt_client.publish(FEED_DOOR, "1")
            mqtt_client.publish("faceai-result", user['name'])
            last_unlock_time = time.time()
            overlay_result = 'valid'
            overlay_name = user['name']
            overlay_distance = user['distance']
            overlay_expire_time = time.time() + OVERLAY_DURATION
            process_identify._fail_cd = 0
        else:
            best_dist = data.get("bestDistance", "N/A")
            logger.info(f"⛔ Khuôn mặt không khớp. Best distance: {best_dist}")
            overlay_result = 'stranger'
            overlay_name = "Unknown"
            overlay_distance = float(best_dist) if isinstance(best_dist, (int, float)) else 0
            overlay_expire_time = time.time() + 3
            process_identify._fail_cd = time.time()
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Lỗi mạng khi gọi API Identify: {e}")
        process_identify._fail_cd = time.time()
    except Exception as e:
        logger.error(f"❌ Lỗi không xác định khi gọi API Identify: {e}")
        process_identify._fail_cd = time.time()

# ============================================================
# Main Event Loop
# ============================================================
logger.info("🧠 Face AI Service đã khởi động (Production Mode).")
logger.info(f"📺 Xem camera tại: http://localhost:{STREAM_PORT}/video_feed")

frame_count = 0
last_faces = []

try:
    while True:
        if not is_camera_on or cap is None:
            time.sleep(0.5)
            continue
        
        with raw_lock:
            frame = raw_frame.copy() if raw_frame is not None else None
        
        if frame is None:
            time.sleep(0.05)
            continue
            
        if not is_register_mode and (time.time() - last_unlock_time < COOLDOWN_PERIOD):
            remaining = int(COOLDOWN_PERIOD - (time.time() - last_unlock_time))
            cv2.putText(frame, f"Cooldown: {remaining}s", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            with frame_lock:
                latest_frame = frame.copy()
            time.sleep(0.1)
            continue

        frame_count += 1
        
        if frame_count % 3 == 0:
            h, w = frame.shape[:2]
            blob = cv2.dnn.blobFromImage(cv2.resize(frame, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
            face_detector.setInput(blob)
            detections = face_detector.forward()
            
            faces = []
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence > 0.6:
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    (startX, startY, endX, endY) = box.astype("int")
                    startX = max(0, startX)
                    startY = max(0, startY)
                    endX = min(w, endX)
                    endY = min(h, endY)
                    fw = endX - startX
                    fh = endY - startY
                    if fw > 80 and fh > 80:
                        faces.append((startX, startY, fw, fh))
            last_faces = faces
        else:
            faces = last_faces
        
        if len(faces) > 0:
            largest = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = largest
            cx, cy = x + w // 2, y + h // 2
            
            if last_face_center:
                dx = abs(cx - last_face_center[0])
                dy = abs(cy - last_face_center[1])
                if dx < MOVEMENT_THRESHOLD_PX and dy < MOVEMENT_THRESHOLD_PX:
                    stable_frames += 1
                else:
                    stable_frames = 0
            else:
                stable_frames = 1
                
            last_face_center = (cx, cy)
            
            now = time.time()
            if overlay_result and now < overlay_expire_time:
                box_color = (0, 255, 0) if overlay_result == 'valid' else (255, 0, 255) if overlay_result == 'registered' else (0, 0, 255)
            elif stable_frames >= STABILITY_FRAMES_REQ:
                box_color = (0, 255, 0)
            else:
                box_color = (0, 0, 255)
            
            cv2.rectangle(frame, (x, y), (x+w, y+h), box_color, 2)
            
            if overlay_result and now < overlay_expire_time:
                if overlay_result == 'valid':
                    banner_y = max(0, y - 50)
                    cv2.rectangle(frame, (x, banner_y), (x + w, y), (0, 150, 0), -1)
                    cv2.putText(frame, f"OK {overlay_name}", (x + 5, y - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    cv2.putText(frame, f"Dist: {overlay_distance:.2f}", (x + 5, y - 35), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 255, 200), 1)
                    ck_x, ck_y = x + w - 40, y - 35
                    cv2.line(frame, (ck_x, ck_y + 10), (ck_x + 10, ck_y + 20), (0, 255, 0), 3)
                    cv2.line(frame, (ck_x + 10, ck_y + 20), (ck_x + 25, ck_y), (0, 255, 0), 3)
                    cv2.putText(frame, "DOOR OPENED", (10, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                elif overlay_result == 'stranger':
                    banner_y = max(0, y - 40)
                    cv2.rectangle(frame, (x, banner_y), (x + w, y), (0, 0, 180), -1)
                    cv2.putText(frame, "X STRANGER", (x + 5, y - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                elif overlay_result == 'registered':
                    banner_y = max(0, y - 40)
                    cv2.rectangle(frame, (x, banner_y), (x + w, y), (150, 0, 150), -1)
                    cv2.putText(frame, "REGISTERED!", (x + 5, y - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            else:
                if overlay_result and now >= overlay_expire_time:
                    overlay_result = None
                progress = min(100, int((stable_frames / STABILITY_FRAMES_REQ) * 100))
                cv2.putText(frame, f"Stability: {progress}%", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            
            if stable_frames >= STABILITY_FRAMES_REQ:
                stable_frames = 0
                last_face_center = None
                if is_register_mode:
                    elapsed = time.time() - scan_captured_time
                    if scan_step == 0 or elapsed >= SCAN_PAUSE:
                        process_registration(frame.copy(), largest)
                else:
                    process_identify(frame.copy(), largest)
        else:
            stable_frames = 0
            last_face_center = None

        now = time.time()
        if overlay_result and now < overlay_expire_time:
            fh, fw = frame.shape[:2]
            if overlay_result == 'valid':
                cv2.rectangle(frame, (0, 0), (fw, 60), (0, 150, 0), -1)
                cv2.putText(frame, f"OK {overlay_name} - DOOR OPENED", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
            elif overlay_result == 'stranger':
                cv2.rectangle(frame, (0, 0), (fw, 60), (0, 0, 180), -1)
                cv2.putText(frame, "X STRANGER - ACCESS DENIED", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
            elif overlay_result == 'registered':
                cv2.rectangle(frame, (0, 0), (fw, 60), (150, 0, 150), -1)
                cv2.putText(frame, "REGISTERED PENDING APPROVAL", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
        elif overlay_result and now >= overlay_expire_time:
            overlay_result = None

        if is_register_mode and scan_step < len(SCAN_POSES):
            fh, fw = frame.shape[:2]
            cv2.rectangle(frame, (0, 0), (fw, 80), (40, 40, 40), -1)
            elapsed_since_capture = time.time() - scan_captured_time
            in_pause = scan_step > 0 and elapsed_since_capture < SCAN_PAUSE
            
            if in_pause:
                remaining = int(SCAN_PAUSE - elapsed_since_capture) + 1
                cv2.putText(frame, f"Captured! Next in {remaining}s...", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                cv2.putText(frame, f">> {SCAN_LABELS[scan_step]} <<", (10, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            else:
                cv2.putText(frame, f"REGISTRATION: Step {scan_step+1}/5", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
                cv2.putText(frame, f">> {SCAN_LABELS[scan_step]} <<", (10, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            
            for i in range(len(SCAN_POSES)):
                dot_x = fw - 30 * (len(SCAN_POSES) - i)
                dot_y = 35
                if i < scan_step:
                    cv2.circle(frame, (dot_x, dot_y), 10, (0, 255, 0), -1)
                    cv2.putText(frame, "v", (dot_x - 5, dot_y + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                elif i == scan_step:
                    cv2.circle(frame, (dot_x, dot_y), 10, (0, 255, 255), 2)
                else:
                    cv2.circle(frame, (dot_x, dot_y), 10, (100, 100, 100), 2)
            
            arrow_cx, arrow_cy = fw // 2, fh - 50
            arrow_len = 40
            pose = SCAN_POSES[scan_step]
            if pose == 'LEFT':
                cv2.arrowedLine(frame, (arrow_cx + arrow_len, arrow_cy), (arrow_cx - arrow_len, arrow_cy), (0, 255, 255), 3, tipLength=0.3)
            elif pose == 'RIGHT':
                cv2.arrowedLine(frame, (arrow_cx - arrow_len, arrow_cy), (arrow_cx + arrow_len, arrow_cy), (0, 255, 255), 3, tipLength=0.3)
            elif pose == 'UP':
                cv2.arrowedLine(frame, (arrow_cx, arrow_cy + arrow_len), (arrow_cx, arrow_cy - arrow_len), (0, 255, 255), 3, tipLength=0.3)
            elif pose == 'DOWN':
                cv2.arrowedLine(frame, (arrow_cx, arrow_cy - arrow_len), (arrow_cx, arrow_cy + arrow_len), (0, 255, 255), 3, tipLength=0.3)
            elif pose == 'CENTER':
                cv2.circle(frame, (arrow_cx, arrow_cy), 15, (0, 255, 255), 2)
                cv2.circle(frame, (arrow_cx, arrow_cy), 3, (0, 255, 255), -1)

        with frame_lock:
            latest_frame = frame.copy()
        time.sleep(0.03)

except KeyboardInterrupt:
    logger.info("🛑 Nhận lệnh ngắt (KeyboardInterrupt). Đang dừng chương trình...")
except Exception as e:
    logger.critical(f"❌ Fatal error in main loop: {e}", exc_info=True)
finally:
    turn_off_camera()
    mqtt_client.disconnect()
    logger.info("Chương trình FaceAI đã tắt an toàn.")
