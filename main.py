import sys
import time
import random
from Adafruit_IO import MQTTClient
AIO_USERNAME="khangtranWoT"
AIO_KEY="aio_eWqQ735iGzDKG5xfzILKGlCB9Srq"
AIO_FEED_SENSOR_1="v1"
AIO_FEED_SENSOR_2="v2"
AIO_FEED_SENSOR_3="v3"
AIO_FEED_LIGHT="v10"
AIO_FEED_COLOR="v11"
AIO_FEED_FAN="v12"
AIO_FEED_FACE="v13"

SUB_FEEDS = [AIO_FEED_LIGHT, AIO_FEED_COLOR, AIO_FEED_FAN, AIO_FEED_FACE]

def connected(client):
    print("✅ Kết nối thành công ...")
    for f in SUB_FEEDS:
        client.subscribe(f)
        print("🔔 Subscribed:", f)

def subscribe(client, userdata, mid, granted_qos):
    print("✅ Subscribe callback ...", mid, granted_qos)

def disconnected(client):
    print("❌ Ngắt kết nối ...")
    sys.exit(1)

def message(client, feed_id, payload):
    print(f"📩 Nhận dữ liệu: {feed_id} = {payload}")

client = MQTTClient(AIO_USERNAME, AIO_KEY)
client.on_connect = connected  # type: ignore[assignment]
client.on_disconnect = disconnected  # type: ignore[assignment]
client.on_message = message  # type: ignore[assignment]
client.on_subscribe = subscribe  # type: ignore[assignment]
client.connect()
client.loop_background()

while True:
    value = random.randint(0, 100)
    print("Cap nhat:", value)
    client.publish()