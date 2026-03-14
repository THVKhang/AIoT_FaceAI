import os
import sys
import time
import random
from dotenv import load_dotenv
from Adafruit_IO import MQTTClient

load_dotenv()

AIO_USERNAME = os.getenv("AIO_USERNAME")
AIO_KEY = os.getenv("AIO_KEY")

FEED_TEMP = "sensor-temp"
FEED_HUMID = "sensor-humid"
FEED_LIGHT = "sensor-light"
FEED_MOTION = "sensor-motion"
FEED_FACE_RESULT = "faceai-result"
FEED_DOOR = "button-door"
FEED_LIGHT_BTN = "button-light"
FEED_FAN = "fan"
FEED_DEVICE_LOG = "device-log"

SUB_FEEDS = [FEED_DOOR, FEED_LIGHT_BTN, FEED_FAN]

def connected(client):
    print("✅ Kết nối Adafruit IO thành công!")
    for f in SUB_FEEDS:
        client.subscribe(f)
        print(f"   Đã nhận dữ liệu từ: {f}")

def subscribe(client, userdata, mid, granted_qos):
    pass

def disconnected(client):
    print("❌ Đã ngắt kết nối...")
    sys.exit(1)

def message(client, feed_id, payload):
    print(f"\n📥 Feed: {feed_id} | Lệnh: {payload}")

    if feed_id == FEED_LIGHT_BTN:
        if payload == "1":
            print("💡 => Bật đèn")
            client.publish(FEED_DEVICE_LOG, "Light turned on successfully")
        else:
            print("💡 => Tắt đèn")
            client.publish(FEED_DEVICE_LOG, "Light turned off successfully")

    elif feed_id == FEED_FAN:
        print(f"🌪️ => THỰC THI: Cấp xung PWM chỉnh tốc độ quạt thành {payload}%")
        client.publish(FEED_DEVICE_LOG, f"Fan speed set to {payload}%")

    elif feed_id == FEED_DOOR:
        if payload == "1":
            print("🚪 => Mở cửa")
            client.publish(FEED_DEVICE_LOG, "Door opened successfully")
        else:
            print("🚪 => Đóng cửa")
            client.publish(FEED_DEVICE_LOG, "Door closed successfully")

client = MQTTClient(AIO_USERNAME, AIO_KEY)
client.on_connect = connected
client.on_disconnect = disconnected
client.on_message = message
client.on_subscribe = subscribe

client.connect()
client.loop_background()

print("🚀 BẮT ĐẦU CHẠY GIẢ LẬP HỆ THỐNG SMART DOOR...")

while True:
    temp = random.randint(28, 35)
    humid = random.randint(50, 80)
    light = random.randint(50, 800)
    motion = 1 if random.random() < 0.2 else 0

    print(f"\n📡 Temp: {temp}°C | Humid: {humid}% | Light: {light} | Motion: {motion}")

    client.publish(FEED_TEMP, temp)
    client.publish(FEED_HUMID, humid)
    client.publish(FEED_LIGHT, light)
    client.publish(FEED_MOTION, motion)

    if motion == 1:
        print("⚠️ [CẢNH BÁO] Phát hiện có người trước cửa!")
        print("🤖 [AI PROCESSING] Đang bật Camera quét khuôn mặt...")
        time.sleep(2)

        face_result = random.choice(["Khang", "Quy_Bao", "Do_Khoa", "Unknown"])
        print(f"👤 [AI RESULT] Kết quả nhận diện: {face_result}")

        client.publish(FEED_FACE_RESULT, face_result)

        if face_result == "Khang":
            print("✅ Valid -> Door Unlock!")
            client.publish(FEED_DEVICE_LOG, "Known face recognized: Khang")
            client.publish(FEED_DOOR, 1)
        else:
            print("⛔ Invalid -> Door Locked!")
            client.publish(FEED_DEVICE_LOG, f"Unknown or unauthorized face: {face_result}")

    time.sleep(15)