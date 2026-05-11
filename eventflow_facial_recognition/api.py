"""
EventFlow - Facial Recognition Module
File: api.py

FastAPI server — uses Supabase with your existing schema.

Tables used:
  participants    — participant_id (serial), name, student_id, email
  face_embeddings — embedding_id (serial), participant_id, embedding, is_active
  attendance      — attendance_id (serial), participant_id, event_id, similarity, verified
  events          — your existing table, event_id (int4)

Run with:
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload

Environment variables (eventflow_facial_recognition/.env):
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_SERVICE_KEY=your-service-role-key
"""

import os
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

from face_recognition_module.face_engine import FaceEngine

# ── Config ────────────────────────────────────────────────────────────────────
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eventflow.api")

# ── App state ─────────────────────────────────────────────────────────────────
supabase: Optional[Client] = None
engine:   Optional[FaceEngine] = None
gallery:  list[dict] = []


# ── Gallery ───────────────────────────────────────────────────────────────────

def reload_gallery() -> None:
    """
    Loads all active face embeddings from Supabase into memory.
    Joins face_embeddings → participants to get name and student_id.
    Called at startup and after every register/re-enroll.
    """
    global gallery

    response = (
        supabase.table("face_embeddings")
        .select(
            "embedding_id, participant_id, embedding, "
            "participants(participant_id, name, student_id)"
        )
        .eq("is_active", True)
        .execute()
    )

    rows = response.data or []
    gallery = []

    for row in rows:
        emb = np.array(row["embedding"], dtype=np.float32)
        norm = np.linalg.norm(emb)
        if norm == 0:
            continue
        gallery.append({
            "participant_id": row["participants"]["participant_id"],
            "name":           row["participants"]["name"],
            "student_id":     row["participants"]["student_id"],
            "embedding":      emb / norm,  # pre-normalized for fast dot-product
        })

    logger.info("Gallery reloaded: %d participant(s).", len(gallery))


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global supabase, engine
    logger.info("Starting EventFlow API...")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    engine = FaceEngine(
        model_name="buffalo_l",
        det_size=(640, 640),
        threshold=0.45,
        use_gpu=False,
    )
    reload_gallery()
    logger.info("EventFlow API ready.")
    yield
    logger.info("Shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="EventFlow Facial Recognition API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        # Add your deployed frontend URL when going live:
        # "https://your-eventflow-app.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Utility ───────────────────────────────────────────────────────────────────

def decode_image(file_bytes: bytes) -> np.ndarray:
    """Decodes raw JPEG/PNG bytes from the browser into a BGR numpy array."""
    arr   = np.frombuffer(file_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(
            status_code=400,
            detail="Could not decode image. Send a valid JPEG or PNG."
        )
    return frame


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    """Confirms the server, model, and gallery are ready."""
    return {
        "status":       "ok",
        "gallery_size": len(gallery),
        "model":        "buffalo_l",
    }


# ── Registration ──────────────────────────────────────────────────────────────

@app.post("/api/register")
async def register_participant(
    name:       str        = Form(...),
    student_id: str        = Form(...),
    image:      UploadFile = File(...),
):
    """
    Enrolls a new participant.

    Steps:
      1. Extract 512-D face embedding from the uploaded image.
      2. Insert row into `participants`.
      3. Insert embedding into `face_embeddings` (is_active=True).
      4. Reload in-memory gallery.

    Errors:
      422 — no face detected in image
      409 — student_id already registered
    """
    # Extract embedding
    frame     = decode_image(await image.read())
    embedding = engine.detect_and_embed(frame)

    if embedding is None:
        raise HTTPException(
            status_code=422,
            detail="No face detected. Ensure the participant is clearly visible and well-lit."
        )

    # Insert participant
    try:
        p_res = (
            supabase.table("participants")
            .insert({"name": name, "student_id": student_id})
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=409,
            detail=f"Student ID '{student_id}' is already registered. "
                   "Use /api/re-enroll to update their face data."
        )

    participant = p_res.data[0]

    # Insert embedding
    supabase.table("face_embeddings").insert({
        "participant_id": participant["participant_id"],
        "embedding":      embedding.tolist(),  # list of 512 floats → FLOAT4[]
        "is_active":      True,
    }).execute()

    reload_gallery()

    logger.info(
        "Registered: %s (student_id=%s, participant_id=%d)",
        name, student_id, participant["participant_id"]
    )

    return {
        "success":        True,
        "message":        f"{name} registered successfully.",
        "participant_id": participant["participant_id"],
    }


@app.post("/api/re-enroll")
async def re_enroll_participant(
    student_id: str        = Form(...),
    image:      UploadFile = File(...),
):
    """
    Replaces the face embedding for an existing participant.
    The old embedding is marked inactive (kept for audit history).
    A fresh embedding is inserted as the new active one.

    Errors:
      404 — student_id not found
      422 — no face detected in image
    """
    # Look up participant by student_id
    p_res = (
        supabase.table("participants")
        .select("participant_id, name")
        .eq("student_id", student_id)
        .single()
        .execute()
    )
    if not p_res.data:
        raise HTTPException(
            status_code=404,
            detail=f"Student ID '{student_id}' not found."
        )

    participant = p_res.data

    # Extract new embedding
    frame     = decode_image(await image.read())
    embedding = engine.detect_and_embed(frame)
    if embedding is None:
        raise HTTPException(status_code=422, detail="No face detected in the image.")

    # Deactivate current active embedding
    supabase.table("face_embeddings").update({"is_active": False}).eq(
        "participant_id", participant["participant_id"]
    ).eq("is_active", True).execute()

    # Insert new active embedding
    supabase.table("face_embeddings").insert({
        "participant_id": participant["participant_id"],
        "embedding":      embedding.tolist(),
        "is_active":      True,
    }).execute()

    reload_gallery()

    logger.info("Re-enrolled: %s (student_id=%s)", participant["name"], student_id)

    return {
        "success": True,
        "message": f"Face updated for '{participant['name']}'.",
    }


# ── Verification ──────────────────────────────────────────────────────────────

@app.post("/api/verify")
async def verify_participant(
    event_id:       int        = Form(...),   # int4 to match your events table
    image:          UploadFile = File(...),
    log_attendance: bool       = Form(True),
):
    """
    Verifies a face against the registered gallery.

    Steps:
      1. Decode image and extract embedding.
      2. Cosine similarity match against in-memory gallery.
      3. If matched and log_attendance=True, upsert into `attendance`.

    Returns verified=True/False with name, student_id, and similarity score.
    """
    if not gallery:
        raise HTTPException(
            status_code=503,
            detail="No registered participants. Register participants first."
        )

    frame     = decode_image(await image.read())
    embedding = engine.detect_and_embed(frame)

    if embedding is None:
        return {
            "verified":   False,
            "similarity": 0.0,
            "threshold":  engine.threshold,
            "message":    "No face detected in the image.",
        }

    match, score = engine.match(embedding, gallery)

    if match and log_attendance:
        # Upsert — updates existing row if participant already checked in
        supabase.table("attendance").upsert(
            {
                "participant_id": match["participant_id"],
                "event_id":       event_id,
                "similarity":     float(score),
                "verified":       True,
            },
            on_conflict="participant_id,event_id",
        ).execute()

        logger.info(
            "Verified: %s (student_id=%s, event_id=%d, score=%.4f)",
            match["name"], match["student_id"], event_id, score,
        )

    if match:
        return {
            "verified":        True,
            "name":            match["name"],
            "student_id":      match["student_id"],
            "participant_id":  match["participant_id"],
            "similarity":      round(score, 4),
            "threshold":       engine.threshold,
            "message":         f"Welcome, {match['name']}!",
        }

    return {
        "verified":   False,
        "similarity": round(score, 4),
        "threshold":  engine.threshold,
        "message":    "Face not recognized.",
    }


# ── Participants ──────────────────────────────────────────────────────────────

@app.get("/api/participants")
def list_participants():
    """Returns all registered participants without embedding data."""
    res = (
        supabase.table("participants")
        .select("participant_id, name, student_id, email, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return {"count": len(res.data), "participants": res.data}


@app.delete("/api/participants/{student_id}")
def delete_participant(student_id: str):
    """
    Deletes a participant by student_id.
    Cascades automatically to face_embeddings and attendance (ON DELETE CASCADE).
    """
    res = (
        supabase.table("participants")
        .delete()
        .eq("student_id", student_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(
            status_code=404,
            detail=f"Student ID '{student_id}' not found."
        )
    reload_gallery()
    return {"success": True, "message": f"Participant '{student_id}' deleted."}


# ── Attendance ────────────────────────────────────────────────────────────────

@app.get("/api/attendance")
def get_attendance(event_id: Optional[int] = None):
    """
    Returns attendance records joined with participant and event info.
    Optionally filtered by event_id (int).

    Example: GET /api/attendance?event_id=3
    """
    query = (
        supabase.table("attendance")
        .select(
            "attendance_id, similarity, verified, verified_at, "
            "participants(name, student_id), "
            "events(event_name)"
        )
        .order("verified_at", desc=True)
    )

    if event_id is not None:
        query = query.eq("event_id", event_id)

    res = query.execute()

    records = [
        {
            "attendance_id": r["attendance_id"],
            "name":          r["participants"]["name"],
            "student_id":    r["participants"]["student_id"],
            "event_name":    r["events"]["event_name"],
            "similarity":    round(r["similarity"], 4),
            "verified":      r["verified"],
            "verified_at":   r["verified_at"],
        }
        for r in (res.data or [])
    ]

    return {"count": len(records), "records": records}