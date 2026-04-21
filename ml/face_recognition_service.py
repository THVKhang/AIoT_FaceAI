import os
import sys
import time
import math
import cv2
import json
import requests
import numpy as np
import mediapipe as mp
from dotenv import load_dotenv
from Adafruit_IO import MQTTClient
from deepface import DeepFace

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
API_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")
API_UPLOAD = f"{API_BASE_URL}/api/faces/upload"
API_IDENTIFY = f"{API_BASE_URL}/api/faces/identify"

CAMERA_URL = os.getenv("CAMERA_URL", "0")
if CAMERA_URL.isdigit():
    CAMERA_URL = int(CAMERA_URL)

# State
is_camera_on = False
is_register_mode = False
cap = None
last_unlock_time = 0
COOLDOWN_PERIOD = 10

# Mediapipe Face Detection
mp_face_detection = mp.solutions.face_detection
face_detection = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.7)

# Stability Tracking
STABILITY_FRAMES_REQ = 30 # about 1-2 seconds depending on FPS
MOVEMENT_THRESHOLD = 0.05 # 5% of screen width/height
stable_frames = 0
last_face_center = None

mqtt_client = MQTTClient(AIO_USERNAME, AIO_KEY)

def turn_on_camera():
    global cap, is_camera_on
    if not is_camera_on:
        print(f"📹 Đang bật Camera (URL: {CAMERA_URL})...")
        cap = cv2.VideoCapture(CAMERA_URL)
        if cap.isOpened():
            is_camera_on = True
            print("✅ Camera đã được bật.")
        else:
            print("❌ Không thể mở Camera.")

def turn_off_camera():
    global cap, is_camera_on
    if is_camera_on and cap is not None:
        print("🛑 Đang tắt Camera...")
        cap.release()
        cv2.destroyAllWindows()
        is_camera_on = False
        print("✅ Camera đã tắt.")

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

print("🚀 Đang kết nối Adafruit IO...")
mqtt_client.connect()
mqtt_client.loop_background()

# Tải sẵn DeepFace model
print("🧠 Đang khởi tạo mô hình Facenet...")
try:
    DeepFace.build_model("Facenet")
except Exception as e:
    pass

def extract_vector(frame):
    # Dùng Facenet để lấy vector 128 chiều
    try:
        objs = DeepFace.represent(img_path=frame, model_name="Facenet", enforce_detection=False)
        if len(objs) > 0:
            return objs[0]["embedding"]
    except Exception as e:
        print(f"Lỗi extract vector: {e}")
    return None


def process_registration(frame):
    global is_register_mode
    print("📤 Đang trích xuất vector đăng ký...")
    vector = extract_vector(frame)
    if not vector:
        print("❌ Không trích xuất được vector.")
        return
    
    _, buffer = cv2.imencode('.jpg', frame)
    
    try:
        res = requests.post(API_UPLOAD, data={'vector': json.dumps(vector)}, files={'file': ('face.jpg', buffer.tobytes(), 'image/jpeg')})
        if res.status_code == 200:
            print("✅ Đã gửi yêu cầu đăng ký lên Admin duyệt (Pending)!")
        else:
            print(f"❌ Lỗi gửi API: {res.text}")
    except Exception as e:
        print(f"❌ Lỗi gọi API Upload: {e}")
    finally:
        is_register_mode = False

def process_identify(frame):
    global last_unlock_time
    print("🔍 Đang nhận diện khuôn mặt...")
    vector = extract_vector(frame)
    if not vector:
        return
    
    try:
        res = requests.post(API_IDENTIFY, json={'vector': vector})
        data = res.json()
        if res.status_code == 200 and data.get("success"):
            user = data["user"]
            print(f"🔓 NHẬN DIỆN THÀNH CÔNG: {user['name']} (Distance: {user['distance']:.2f})")
            mqtt_client.publish(FEED_DOOR, "1")
            last_unlock_time = time.time()
        else:
            print(f"⛔ Khuôn mặt không hợp lệ hoặc chưa được duyệt.")
    except Exception as e:
        print(f"❌ Lỗi gọi API Identify: {e}")

try:
    while True:
        if not is_camera_on or cap is None:
            time.sleep(1)
            continue
            
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.1)
            continue
            
        # Cooldown check for identify
        if not is_register_mode and (time.time() - last_unlock_time < COOLDOWN_PERIOD):
            cv2.putText(frame, f"Cooldown: {int(COOLDOWN_PERIOD - (time.time() - last_unlock_time))}s", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            cv2.imshow("Face AI Client", frame)
            cv2.waitKey(1)
            continue

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_detection.process(rgb_frame)
        
        if results.detections:
            # Lấy khuôn mặt to nhất / tự tin nhất
            detection = results.detections[0]
            bboxC = detection.location_data.relative_bounding_box
            cx = bboxC.xmin + bboxC.width / 2
            cy = bboxC.ymin + bboxC.height / 2
            
            # Tính độ ổn định (không di chuyển quá nhiều)
            if last_face_center:
                dx = abs(cx - last_face_center[0])
                dy = abs(cy - last_face_center[1])
                if dx < MOVEMENT_THRESHOLD and dy < MOVEMENT_THRESHOLD:
                    stable_frames += 1
                else:
                    stable_frames = 0
            else:
                stable_frames = 1
                
            last_face_center = (cx, cy)
            
            # Vẽ Box
            h, w, c = frame.shape
            x, y, bw, bh = int(bboxC.xmin * w), int(bboxC.ymin * h), int(bboxC.width * w), int(bboxC.height * h)
            cv2.rectangle(frame, (x, y), (x+bw, y+bh), (0, 255, 0) if stable_frames > STABILITY_FRAMES_REQ else (0, 0, 255), 2)
            
            # Tiến trình ổn định
            progress = min(100, int((stable_frames / STABILITY_FRAMES_REQ) * 100))
            cv2.putText(frame, f"Stability: {progress}%", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            
            if stable_frames >= STABILITY_FRAMES_REQ:
                stable_frames = 0 # reset
                last_face_center = None
                
                if is_register_mode:
                    process_registration(frame.copy())
                else:
                    process_identify(frame.copy())
        else:
            stable_frames = 0
            last_face_center = None

        if is_register_mode:
            cv2.putText(frame, "MODE: REGISTRATION", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
            
        cv2.imshow("Face AI Client", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

except KeyboardInterrupt:
    print("\n🛑 Dừng chương trình.")
finally:
    turn_off_camera()
    mqtt_client.disconnect()
