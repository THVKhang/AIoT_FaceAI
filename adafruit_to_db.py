import os
import re
import sys
import time
import threading
import psycopg2
from datetime import datetime
from dotenv import load_dotenv
from Adafruit_IO import MQTTClient

load_dotenv()
conn = None
AIO_USERNAME = os.getenv("AIO_USERNAME")
AIO_KEY = os.getenv("AIO_KEY")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT"))
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

if not AIO_USERNAME or not AIO_KEY:
    raise ValueError("Thiếu AIO_USERNAME hoặc AIO_KEY trong .env")

CANONICAL_FEEDS = {
    "sensor-temp": "sensor-temp",
    "sensor-humid": "sensor-humid",
    "sensor-light": "sensor-light",
    "sensor-motion": "sensor-motion",
    "faceai-result": "faceai-result",
    "button-door": "button-door",
    "button-light": "button-light",
    "fan": "fan",
    "device-log":"device-log"
    
}

# Subscribe nhiều alias để đỡ lệch tên feed khi demo
SUBSCRIBE_FEEDS = list(dict.fromkeys(CANONICAL_FEEDS.keys()))

db_lock = threading.Lock()
last_state_cache = {}


def ensure_metric_history_table():
    sql = """
        CREATE TABLE IF NOT EXISTS metric_history (
            id BIGSERIAL PRIMARY KEY,
            feed_key VARCHAR(50) NOT NULL,
            value_num REAL,
            value_text TEXT,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_metric_history_feed_time
        ON metric_history(feed_key, updated_at DESC);
    """

    with db_lock:
        with conn.cursor() as cur:
            cur.execute(sql)


def get_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )
    conn.autocommit = True
    return conn

def normalize_feed(feed_id: str) -> str:
    return CANONICAL_FEEDS.get(feed_id, feed_id)


def is_number(value: str) -> bool:
    try:
        float(value)
        return True
    except Exception:
        return False


def to_number_or_none(value: str):
    try:
        return float(value)
    except Exception:
        return None


def parse_face_payload(payload: str):
    """
    Hỗ trợ các kiểu:
    - Khang
    - Unknown
    - Khang:0.93
    - Khang|0.93
    - Khang,0.93
    """
    text = str(payload).strip()
    confidence = None
    person_name = text

    match = re.match(r"^\s*([^:|,]+)\s*[:|,]\s*([0-9]*\.?[0-9]+)\s*$", text)
    if match:
        person_name = match.group(1).strip()
        confidence = float(match.group(2))

    lowered = person_name.lower()
    if lowered == "unknown":
        result = "denied"
    else:
        result = "success"

    return person_name, result, confidence, text


def upsert_current_state(feed_key: str, payload: str):
    value_num = to_number_or_none(payload) if is_number(payload) else None
    value_text = None if value_num is not None else str(payload)

    sql = """
        INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
        VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (feed_key)
        DO UPDATE SET
            value_num = EXCLUDED.value_num,
            value_text = EXCLUDED.value_text,
            updated_at = CURRENT_TIMESTAMP;
    """

    with db_lock:
        with conn.cursor() as cur:
            cur.execute(sql, (feed_key, value_num, value_text))
            cur.execute(
                """
                    INSERT INTO metric_history (feed_key, value_num, value_text, updated_at)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                """,
                (feed_key, value_num, value_text),
            )

    last_state_cache[feed_key] = payload


def insert_system_log(event_name: str, source: str, severity: str, details: str):
    sql = """
        INSERT INTO system_logs (event_name, source, severity, log_details)
        VALUES (%s, %s, %s, %s);
    """
    with db_lock:
        with conn.cursor() as cur:
            cur.execute(sql, (event_name, source, severity, details))


def insert_command(feed_key: str, command_value: str, source: str = "gateway", status: str = "success"):
    sql = """
        INSERT INTO commands (feed_key, command_value, source, status, created_at, executed_at)
        VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    """
    with db_lock:
        with conn.cursor() as cur:
            cur.execute(sql, (feed_key, str(command_value), source, status))


def insert_access_log(person_name: str, result: str, confidence, raw_value: str):
    sql = """
        INSERT INTO access_logs (person_name, result, confidence, raw_value, created_at)
        VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP);
    """
    with db_lock:
        with conn.cursor() as cur:
            cur.execute(sql, (person_name, result, confidence, raw_value))


def handle_sensor(feed_key: str, payload: str):
    upsert_current_state(feed_key, payload)

    if feed_key == "sensor-motion":
        if str(payload) == "1":
            insert_system_log(
                "Motion Detected",
                "rule-engine",
                "warning",
                "Phát hiện chuyển động trước cửa",
            )

    elif feed_key == "sensor-light":
        light_value = to_number_or_none(payload)
        if light_value is not None and light_value < 200:
            insert_system_log(
                "Low Light",
                "rule-engine",
                "warning",
                f"sensor-light = {light_value}, thấp hơn ngưỡng 200",
            )

    elif feed_key == "sensor-temp":
        temp_value = to_number_or_none(payload)
        if temp_value is not None and temp_value > 35:
            insert_system_log(
                "High Temperature",
                "rule-engine",
                "warning",
                f"sensor-temp = {temp_value}, vượt ngưỡng 35",
            )

def handle_command(feed_key: str, payload: str):
    upsert_current_state(feed_key, payload)
    insert_command(feed_key, payload, source="adafruit", status="success")

    if feed_key == "button-door":
        event_name = "Door Opened" if str(payload) == "1" else "Door Closed"
        details = f"button-door = {payload}"
    elif feed_key == "button-light":
        event_name = "Light ON" if str(payload) == "1" else "Light OFF"
        details = f"button-light = {payload}"
    else:
        event_name = "Fan Speed Updated"
        details = f"fan = {payload}%"

    insert_system_log(event_name, "adafruit", "info", details)


def handle_face_result(feed_key: str, payload: str):
    upsert_current_state(feed_key, payload)

    person_name, result, confidence, raw_value = parse_face_payload(payload)
    insert_access_log(person_name, result, confidence, raw_value)

    if result == "success":
        insert_system_log(
            "AI Unlock",
            "ai",
            "info",
            f"Recognized {person_name}" + (f" with confidence {confidence}" if confidence is not None else ""),
        )
    else:
        insert_system_log(
            "AI Denied",
            "ai",
            "warning",
            "Unknown face detected, unlock rejected",
        )

        if str(last_state_cache.get("sensor-motion", "0")) == "1":
            insert_system_log(
                "Security Alert",
                "ai",
                "error",
                "Motion detected with unknown face",
            )

def connected(client):
    print("✅ Kết nối Adafruit IO thành công!")
    for feed in SUBSCRIBE_FEEDS:
        client.subscribe(feed)
        print(f"   Subscribed: {feed}")

    insert_system_log(
        "MQTT Connected",
        "adafruit",
        "info",
        "Subscriber connected to Adafruit IO",
    )


def subscribe(client, userdata, mid, granted_qos):
    pass


def disconnected(client):
    print("❌ Mất kết nối Adafruit IO")
    try:
        insert_system_log(
            "MQTT Disconnected",
            "adafruit",
            "error",
            "Subscriber disconnected from Adafruit IO",
        )
    except Exception as e:
        print("Không ghi được log disconnect:", e)

    sys.exit(1)


def message(client, feed_id, payload):
    try:
        raw_feed = str(feed_id)
        canonical_feed = normalize_feed(raw_feed)
        payload = str(payload).strip()

        print(f"[{datetime.now().strftime('%H:%M:%S')}] Feed={raw_feed} -> {canonical_feed} | Payload={payload}")

        if canonical_feed in {"sensor-temp", "sensor-humid", "sensor-light", "sensor-motion"}:
            handle_sensor(canonical_feed, payload)

        elif canonical_feed in {"button-door", "button-light", "fan"}:
            handle_command(canonical_feed, payload)

        elif canonical_feed == "faceai-result":
            handle_face_result(canonical_feed, payload)

        elif canonical_feed == "device-log":
            insert_system_log(
                "Device Log",
                "device",
                "info",
                payload,
            )

        else:
            upsert_current_state(canonical_feed, payload)
            insert_system_log(
                "Unknown Feed Received",
                "adafruit",
                "warning",
                f"Feed={raw_feed}, normalized={canonical_feed}, payload={payload}",
            )

    except Exception as e:
        print("❌ Lỗi xử lý message:", e)
        try:
            insert_system_log(
                "Subscriber Error",
                "adafruit",
                "error",
                f"{type(e).__name__}: {e}",
            )
        except Exception:
            pass

def main():
    global conn
    try:
        conn = get_connection()
        print("✅ Kết nối PostgreSQL thành công")
        ensure_metric_history_table()
    except Exception as e:
        print("❌ Không kết nối được PostgreSQL:", e)
        return

    client = MQTTClient(AIO_USERNAME, AIO_KEY)
    client.on_connect = connected
    client.on_disconnect = disconnected
    client.on_message = message
    client.on_subscribe = subscribe

    print("🚀 Đang kết nối Adafruit IO...")
    client.connect()
    client.loop_background()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Dừng subscriber")
    finally:
        try:
            client.disconnect()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()