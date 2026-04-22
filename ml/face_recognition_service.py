import os
import sys

# Fix Windows terminal encoding for emoji/unicode
os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import time
import cv2
import json
import requests
import threading
import numpy as np
from dotenv import load_dotenv
from Adafruit_IO import MQTTClient

load_dotenv()
load_dotenv(".env.local", override=True)

AIO_USERNAME = os.getenv("AIO_USERNAME")
AIO_KEY = os.getenv("AIO_KEY")

if not AIO_USERNAME or not AIO_KEY:
    print("❌ Thiếu AIO_USERNAME hoặc AIO_KEY trong file .env hoặc .env.local")
    sys.exit(1)

# Feeds
FEED_DOOR = "button-door"
FEED_CMD = "faceai-cmd"

# API Endpoints
# Always use localhost for face API since Python service runs locally
API_BASE_URL = os.getenv("FACE_API_URL", "http://localhost:3000")
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

# Visual overlay state (shown on camera stream)
overlay_result = None       # 'valid', 'stranger', 'registered'
overlay_name = ""
overlay_distance = 0.0
overlay_expire_time = 0     # timestamp when overlay should disappear
OVERLAY_DURATION = 5        # show overlay for 5 seconds

# Multi-angle registration scan
SCAN_POSES = ['CENTER', 'LEFT', 'RIGHT', 'UP', 'DOWN']
SCAN_LABELS = ['Nhin thang camera', 'Quay mat sang TRAI', 'Quay mat sang PHAI', 'Ngua mat LEN TREN', 'Cui mat XUONG DUOI']
SCAN_PAUSE = 3              # seconds to wait between poses
scan_step = 0               # current pose index (0-4)
scan_vectors = []            # collected vectors
scan_frame_snapshot = None   # frame captured at center pose for upload
scan_captured_time = 0       # timestamp of last pose capture (for pause)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Face Detection: OpenCV DNN ResNet SSD
detector_prototxt = os.path.join(MODELS_DIR, "deploy.prototxt")
detector_model = os.path.join(MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel")
face_detector = cv2.dnn.readNetFromCaffe(detector_prototxt, detector_model)

# Face Recognition: OpenFace (128D)
embedder_model = os.path.join(MODELS_DIR, "openface_nn4.small2.v1.t7")
face_embedder = cv2.dnn.readNetFromTorch(embedder_model)

# Stability Tracking
STABILITY_FRAMES_REQ = 8
MOVEMENT_THRESHOLD_PX = 40
stable_frames = 0
last_face_center = None

# Vector extraction
VECTOR_DIM = 128

# ============================================================
# Shared Frame Buffer (Thread-safe)
# ============================================================
latest_frame = None
frame_lock = threading.Lock()

# Display frame (with overlays for browser) separate from raw capture
display_frame = None
display_lock = threading.Lock()

# ============================================================
# Camera Capture Thread
# Runs independently - always grabs frames as fast as possible
# ============================================================
raw_frame = None
raw_lock = threading.Lock()

def camera_capture_loop():
    """Dedicated thread that continuously reads frames from the camera."""
    global raw_frame, latest_frame
    while True:
        if not is_camera_on or cap is None:
            time.sleep(0.1)
            continue
        try:
            ret, frame = cap.read()
            if ret and frame is not None:
                frame = cv2.flip(frame, 1)  # Flip horizontal (mirror)
                with raw_lock:
                    raw_frame = frame.copy()
                # Also update latest_frame immediately so MJPEG always has something
                with frame_lock:
                    latest_frame = frame.copy()
            else:
                time.sleep(0.05)
        except Exception as e:
            print(f"⚠️ Camera capture error: {e}", flush=True)
            time.sleep(0.1)

capture_thread = threading.Thread(target=camera_capture_loop, daemon=True)
capture_thread.start()

# ============================================================
# MJPEG Streaming Server (http.server - no Flask dependency for stream)
# ============================================================
from http.server import HTTPServer, BaseHTTPRequestHandler
import socketserver
import logging

def _make_placeholder():
    """Create a black placeholder frame with 'Waiting for camera...' text."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(img, "Waiting for camera...", (120, 240),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (100, 100, 100), 2)
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
    print("📸 KÍCH HOẠT CHẾ ĐỘ ĐĂNG KÝ MULTI-ANGLE (5 poses)", flush=True)

class MJPEGHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/video_feed' or self.path.startswith('/video_feed?'):
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            try:
                while True:
                    # Read latest_frame without lock (atomic reference read in CPython)
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
                    time.sleep(0.05)  # ~20 FPS
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass
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
    
    def log_message(self, format, *args):
        pass  # Suppress request logs

class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True

def start_stream_server():
    server = ThreadedHTTPServer(('0.0.0.0', STREAM_PORT), MJPEGHandler)
    print(f"🌐 MJPEG Stream Server khởi động tại http://localhost:{STREAM_PORT}/video_feed")
    server.serve_forever()

# Start Flask in daemon thread
stream_thread = threading.Thread(target=start_stream_server, daemon=True)
stream_thread.start()

# ============================================================
# MQTT + Camera
# ============================================================
mqtt_client = MQTTClient(AIO_USERNAME, AIO_KEY)

def turn_on_camera():
    global cap, is_camera_on
    if not is_camera_on:
        print(f"📹 Đang bật Camera (URL: {CAMERA_URL})...", flush=True)
        # Use DirectShow (CAP_DSHOW) to prevent MSMF errors on Windows
        cap = cv2.VideoCapture(CAMERA_URL, cv2.CAP_DSHOW)
        if cap.isOpened():
            is_camera_on = True
            print("✅ Camera đã được bật.", flush=True)
        else:
            print("❌ Không thể mở Camera.", flush=True)

def turn_off_camera():
    global cap, is_camera_on, latest_frame, raw_frame
    if cap is not None:
        print("🛑 Đang tắt Camera...", flush=True)
        is_camera_on = False
        time.sleep(0.2)  # Let capture thread stop reading
        cap.release()
        with frame_lock:
            latest_frame = None
        with raw_lock:
            raw_frame = None
        print("✅ Camera đã tắt.", flush=True)

def connected(client):
    print("✅ Đã kết nối Adafruit IO!")
    client.subscribe(FEED_CMD)
    print(f"   Đang lắng nghe: {FEED_CMD}")

def disconnected(client):
    print("❌ Mất kết nối Adafruit IO.")
    sys.exit(1)

def message(client, feed_id, payload):
    global is_register_mode
    payload = str(payload).strip().lower()
    print(f"📥 Nhận lệnh từ {feed_id}: {payload}")
    
    if feed_id == FEED_CMD:
        if payload == "on":
            turn_on_camera()
        elif payload == "off":
            turn_off_camera()
        elif payload == "register":
            print("📸 KÍCH HOẠT CHẾ ĐỘ ĐĂNG KÝ (Vui lòng nhìn thẳng vào camera 2 giây)")
            is_register_mode = True
            if not is_camera_on:
                turn_on_camera()

mqtt_client.on_connect = connected
mqtt_client.on_disconnect = disconnected
mqtt_client.on_message = message

# Start camera immediately
turn_on_camera()

print("🚀 Đang kết nối Adafruit IO...", flush=True)
try:
    mqtt_client.connect()
    mqtt_client.loop_background()
except Exception as e:
    print(f"⚠️ Không thể kết nối MQTT: {e}", flush=True)

# ============================================================
# Vector Extraction
# ============================================================
def extract_vector(face_bgr):
    """
    Trích xuất vector đặc trưng 128 chiều từ khuôn mặt đã crop sử dụng OpenFace.
    """
    try:
        # OpenFace expects 96x96 RGB image
        face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
        blob = cv2.dnn.blobFromImage(face_rgb, 1.0/255.0, (96, 96), (0, 0, 0), swapRB=False, crop=False)
        face_embedder.setInput(blob)
        vector = face_embedder.forward()
        return vector[0].tolist()
    except Exception as e:
        print(f"Lỗi extract vector: {e}")
        return None

def process_registration(frame, face_rect):
    """
    Multi-angle registration: captures one vector per call.
    Called each time stability is reached during register_mode.
    scan_step tracks which pose we're on (0=center, 1=left, 2=right, 3=up, 4=down).
    After all 5 poses are captured, uploads all vectors to the API.
    """
    global is_register_mode, overlay_result, overlay_name, overlay_expire_time
    global scan_step, scan_vectors, scan_frame_snapshot, scan_captured_time
    
    x, y, w, h = face_rect
    face_crop = frame[y:y+h, x:x+w]
    
    pose_name = SCAN_POSES[scan_step]
    print(f"📸 Scan step {scan_step+1}/5: {pose_name} - extracting vector...", flush=True)
    
    vector = extract_vector(face_crop)
    if not vector:
        print(f"❌ Không trích xuất được vector cho pose {pose_name}.")
        return
    
    scan_vectors.append(vector)
    
    # Save center frame for the upload photo
    if scan_step == 0:
        scan_frame_snapshot = frame.copy()
    
    print(f"✅ Pose {pose_name} captured! ({scan_step+1}/5)", flush=True)
    scan_step += 1
    scan_captured_time = time.time()  # Start pause timer
    
    # Check if all 5 poses are done
    if scan_step >= len(SCAN_POSES):
        print("🎉 All 5 poses captured! Uploading...", flush=True)
        
        upload_frame = scan_frame_snapshot if scan_frame_snapshot is not None else frame
        _, buffer = cv2.imencode('.jpg', upload_frame)
        
        try:
            res = requests.post(
                API_UPLOAD,
                data={'vectors': json.dumps(scan_vectors)},
                files={'file': ('face.jpg', buffer.tobytes(), 'image/jpeg')},
                timeout=10
            )
            if res.status_code == 200:
                print("✅ Đã gửi 5 vectors lên Admin duyệt (Pending)!")
                overlay_result = 'registered'
                overlay_name = "Pending Approval"
                overlay_expire_time = time.time() + OVERLAY_DURATION
            else:
                print(f"❌ Lỗi gửi API: {res.text}")
        except Exception as e:
            print(f"❌ Lỗi gọi API Upload: {e}")
        finally:
            # Reset scan state
            is_register_mode = False
            scan_step = 0
            scan_vectors = []
            scan_frame_snapshot = None

def process_identify(frame, face_rect):
    global last_unlock_time, overlay_result, overlay_name, overlay_distance, overlay_expire_time
    
    # Skip if we just failed recently (5 sec cooldown to avoid spam)
    if not hasattr(process_identify, '_fail_cd'):
        process_identify._fail_cd = 0
    if time.time() - process_identify._fail_cd < 5:
        return
    
    x, y, w, h = face_rect
    face_crop = frame[y:y+h, x:x+w]
    
    print("🔍 Đang nhận diện khuôn mặt...", flush=True)
    vector = extract_vector(face_crop)
    if not vector:
        return
    
    try:
        res = requests.post(API_IDENTIFY, json={'vector': vector}, timeout=10)
        data = res.json()
        if res.status_code == 200 and data.get("success"):
            user = data["user"]
            print(f"🔓 NHẬN DIỆN THÀNH CÔNG: {user['name']} (Distance: {user['distance']:.2f})")
            mqtt_client.publish(FEED_DOOR, "1")
            last_unlock_time = time.time()
            overlay_result = 'valid'
            overlay_name = user['name']
            overlay_distance = user['distance']
            overlay_expire_time = time.time() + OVERLAY_DURATION
            process_identify._fail_cd = 0  # Reset fail cooldown on success
        else:
            best_dist = data.get("bestDistance", "N/A")
            print(f"⛔ Khuôn mặt không khớp. Best distance: {best_dist}")
            overlay_result = 'stranger'
            overlay_name = "Unknown"
            overlay_distance = float(best_dist) if isinstance(best_dist, (int, float)) else 0
            overlay_expire_time = time.time() + 3
            process_identify._fail_cd = time.time()  # Start fail cooldown
    except Exception as e:
        print(f"❌ Lỗi gọi API Identify: {e}")
        process_identify._fail_cd = time.time()

# ============================================================
# AI Processing Loop (separate from camera capture)
# ============================================================
print("🧠 Face AI Service đã khởi động (OpenCV DNN + OpenFace DL Pipeline).", flush=True)
print(f"   📺 Xem camera tại: http://localhost:{STREAM_PORT}/video_feed", flush=True)
print("   Chờ lệnh từ Web UI...", flush=True)

frame_count = 0
last_faces = []

try:
    while True:
        if not is_camera_on or cap is None:
            time.sleep(0.5)
            continue
        
        # Grab latest frame from capture thread (non-blocking)
        with raw_lock:
            frame = raw_frame.copy() if raw_frame is not None else None
        
        if frame is None:
            time.sleep(0.05)
            continue
            
        # Cooldown check for identify
        if not is_register_mode and (time.time() - last_unlock_time < COOLDOWN_PERIOD):
            remaining = int(COOLDOWN_PERIOD - (time.time() - last_unlock_time))
            cv2.putText(frame, f"Cooldown: {remaining}s", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            with frame_lock:
                latest_frame = frame.copy()
            time.sleep(0.1)
            continue

        frame_count += 1
        
        # Optimize FPS by running DNN detection every 3 frames
        if frame_count % 3 == 0:
            # Detect faces with DNN
            h, w = frame.shape[:2]
            blob = cv2.dnn.blobFromImage(cv2.resize(frame, (300, 300)), 1.0,
                                         (300, 300), (104.0, 177.0, 123.0))
            face_detector.setInput(blob)
            detections = face_detector.forward()
            
            faces = []
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence > 0.6: # 60% confidence threshold
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    (startX, startY, endX, endY) = box.astype("int")
                    
                    # Ensure bounding box is within frame dimensions
                    startX = max(0, startX)
                    startY = max(0, startY)
                    endX = min(w, endX)
                    endY = min(h, endY)
                    
                    fw = endX - startX
                    fh = endY - startY
                    if fw > 80 and fh > 80: # Minimum face size
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
            
            # Determine box color based on overlay state
            now = time.time()
            if overlay_result and now < overlay_expire_time:
                if overlay_result == 'valid':
                    box_color = (0, 255, 0)  # Green
                elif overlay_result == 'registered':
                    box_color = (255, 0, 255)  # Magenta
                else:
                    box_color = (0, 0, 255)  # Red
            elif stable_frames >= STABILITY_FRAMES_REQ:
                box_color = (0, 255, 0)
            else:
                box_color = (0, 0, 255)
            
            cv2.rectangle(frame, (x, y), (x+w, y+h), box_color, 2)
            
            # Draw overlay info (recognized name, checkmark, etc.)
            if overlay_result and now < overlay_expire_time:
                if overlay_result == 'valid':
                    # Green banner with checkmark and name
                    banner_y = max(0, y - 50)
                    cv2.rectangle(frame, (x, banner_y), (x + w, y), (0, 150, 0), -1)
                    cv2.putText(frame, f"OK {overlay_name}", (x + 5, y - 15),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    cv2.putText(frame, f"Dist: {overlay_distance:.2f}", (x + 5, y - 35),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 255, 200), 1)
                    # Draw checkmark
                    ck_x, ck_y = x + w - 40, y - 35
                    cv2.line(frame, (ck_x, ck_y + 10), (ck_x + 10, ck_y + 20), (0, 255, 0), 3)
                    cv2.line(frame, (ck_x + 10, ck_y + 20), (ck_x + 25, ck_y), (0, 255, 0), 3)
                    # Door open indicator
                    cv2.putText(frame, "DOOR OPENED", (10, frame.shape[0] - 20),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                elif overlay_result == 'stranger':
                    banner_y = max(0, y - 40)
                    cv2.rectangle(frame, (x, banner_y), (x + w, y), (0, 0, 180), -1)
                    cv2.putText(frame, "X STRANGER", (x + 5, y - 12),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                elif overlay_result == 'registered':
                    banner_y = max(0, y - 40)
                    cv2.rectangle(frame, (x, banner_y), (x + w, y), (150, 0, 150), -1)
                    cv2.putText(frame, "REGISTERED!", (x + 5, y - 12),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            else:
                # Clear expired overlay
                if overlay_result and now >= overlay_expire_time:
                    overlay_result = None
                # Show stability progress
                progress = min(100, int((stable_frames / STABILITY_FRAMES_REQ) * 100))
                cv2.putText(frame, f"Stability: {progress}%", (x, y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            
            if stable_frames >= STABILITY_FRAMES_REQ:
                stable_frames = 0
                last_face_center = None
                
                if is_register_mode:
                    # Enforce pause between scan steps
                    elapsed = time.time() - scan_captured_time
                    if scan_step == 0 or elapsed >= SCAN_PAUSE:
                        process_registration(frame.copy(), largest)
                    # else: still in pause, skip (visual countdown shown below)
                else:
                    process_identify(frame.copy(), largest)
        else:
            stable_frames = 0
            last_face_center = None

        # ---- Registration mode visual guide ----
        if is_register_mode and scan_step < len(SCAN_POSES):
            fh, fw = frame.shape[:2]
            # Dark overlay bar at top
            cv2.rectangle(frame, (0, 0), (fw, 80), (40, 40, 40), -1)
            
            # Check if in pause (waiting for user to change pose)
            elapsed_since_capture = time.time() - scan_captured_time
            in_pause = scan_step > 0 and elapsed_since_capture < SCAN_PAUSE
            
            if in_pause:
                remaining = int(SCAN_PAUSE - elapsed_since_capture) + 1
                cv2.putText(frame, f"Captured! Next in {remaining}s...", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                cv2.putText(frame, f">> {SCAN_LABELS[scan_step]} <<", (10, 65),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            else:
                # Step counter
                cv2.putText(frame, f"REGISTRATION: Step {scan_step+1}/5", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
                # Current pose instruction
                label = SCAN_LABELS[scan_step]
                cv2.putText(frame, f">> {label} <<", (10, 65),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            
            # Progress dots (completed poses)
            for i in range(len(SCAN_POSES)):
                dot_x = fw - 30 * (len(SCAN_POSES) - i)
                dot_y = 35
                if i < scan_step:
                    cv2.circle(frame, (dot_x, dot_y), 10, (0, 255, 0), -1)  # green filled
                    cv2.putText(frame, "v", (dot_x - 5, dot_y + 5),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                elif i == scan_step:
                    cv2.circle(frame, (dot_x, dot_y), 10, (0, 255, 255), 2)  # yellow outline
                else:
                    cv2.circle(frame, (dot_x, dot_y), 10, (100, 100, 100), 2)  # gray outline
            
            # Draw arrow for current pose direction
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

        # Update display frame with overlays (bounding box, text)
        with frame_lock:
            latest_frame = frame.copy()
        
        # Small delay to not hog CPU on the AI loop
        time.sleep(0.03)

except KeyboardInterrupt:
    print("\n🛑 Dừng chương trình.")
finally:
    turn_off_camera()
    mqtt_client.disconnect()
