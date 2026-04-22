import urllib.request
import sys

print("Testing MJPEG stream...")
try:
    req = urllib.request.Request("http://localhost:5001/video_feed")
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = resp.read(4096)
        print(f"Status: {resp.status}")
        print(f"Content-Type: {resp.headers.get('Content-Type')}")
        print(f"Received {len(data)} bytes")
        
        if b'--frame' in data:
            print("OK: MJPEG boundary found")
        if b'\xff\xd8' in data:
            print("OK: JPEG data found - stream is WORKING!")
        else:
            print("NO JPEG data in first 4KB")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
