import cv2
import time

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Cannot open camera")
    exit()

time.sleep(2) # Warm up
ret, frame = cap.read()
if ret:
    cv2.imwrite("public/test_frame.jpg", frame)
    print("Saved test_frame.jpg")
else:
    print("Failed to grab frame")
cap.release()
