"""
EventFlow - Facial Recognition Module
File: test_camera.py

Standalone test — NO database required.
Tests that:
  1. InsightFace loads correctly (buffalo_l model)
  2. Webcam opens and reads frames
  3. Face detection works
  4. Embedding extraction works

Run from inside eventflow_facial_recognition/:
    python test_camera.py

Press Q or ESC to quit.
"""

import cv2
import numpy as np
from insightface.app import FaceAnalysis

# ── 1. Load InsightFace model ─────────────────────────────────────────────────
print("[1/3] Loading InsightFace buffalo_l model...")
print("      (First run will download ~320 MB — this is normal)\n")

app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]   # change to CUDAExecutionProvider if GPU
)
app.prepare(ctx_id=-1, det_size=(640, 640))
print("[1/3] Model loaded OK.\n")

# ── 2. Open webcam ────────────────────────────────────────────────────────────
print("[2/3] Opening webcam...")
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)   # CAP_DSHOW = Windows DirectShow

if not cap.isOpened():
    print("[ERROR] Could not open webcam.")
    print("        Make sure no other app (Teams, Zoom, etc.) is using it.")
    exit(1)

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

# Warm up
for _ in range(20):
    cap.read()

print("[2/3] Webcam ready.\n")
print("[3/3] Running live detection — press Q or ESC to quit.\n")

# ── 3. Live detection loop ────────────────────────────────────────────────────
while True:
    ret, frame = cap.read()
    if not ret or frame is None:
        print("[ERROR] Failed to read frame.")
        break

    display = frame.copy()
    faces = app.get(frame)

    if faces:
        for face in faces:
            # Draw bounding box
            x1, y1, x2, y2 = [int(v) for v in face.bbox]
            cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # Draw 5 landmarks
            if face.kps is not None:
                for kp in face.kps:
                    cv2.circle(display, (int(kp[0]), int(kp[1])), 3, (0, 0, 255), -1)

            # Show embedding info
            emb = face.embedding
            norm = float(np.linalg.norm(emb))
            info = f"Embedding: {emb.shape} | Norm: {norm:.3f}"
            cv2.putText(display, info, (x1, max(y1 - 10, 20)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)

        status = f"Faces detected: {len(faces)}"
        color = (0, 255, 0)
    else:
        status = "No face detected"
        color = (0, 0, 255)

    # Status bar
    cv2.putText(display, status, (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
    cv2.putText(display, "Q / ESC: Quit", (10, display.shape[0] - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 180, 180), 1)

    cv2.imshow("EventFlow — Camera Test (No DB)", display)

    key = cv2.waitKey(30) & 0xFF   # 30ms — more stable than 1ms on Windows
    if key in (ord("q"), 27):
        break

cap.release()
cv2.destroyAllWindows()
print("\n[DONE] Test complete. If you saw bounding boxes, everything is working.")