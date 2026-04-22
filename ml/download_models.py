import os
import sys
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
if not os.path.exists(MODELS_DIR):
    os.makedirs(MODELS_DIR)

FILES_TO_DOWNLOAD = [
    {
        "url": "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt",
        "filename": "deploy.prototxt"
    },
    {
        "url": "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel",
        "filename": "res10_300x300_ssd_iter_140000.caffemodel"
    },
    {
        "url": "https://storage.cmusatyalab.org/openface-models/nn4.small2.v1.t7",
        "filename": "openface_nn4.small2.v1.t7"
    }
]

def download_file(url, filepath):
    if os.path.exists(filepath):
        print(f"✅ {os.path.basename(filepath)} already exists.")
        return
    
    print(f"⬇️ Downloading {os.path.basename(filepath)}...")
    try:
        urllib.request.urlretrieve(url, filepath)
        print(f"✅ Downloaded {os.path.basename(filepath)} successfully.")
    except Exception as e:
        print(f"❌ Failed to download {os.path.basename(filepath)}: {e}")

if __name__ == "__main__":
    print("📦 Checking and downloading Deep Learning models...")
    for item in FILES_TO_DOWNLOAD:
        path = os.path.join(MODELS_DIR, item["filename"])
        download_file(item["url"], path)
    print("🎉 All models are ready!")
