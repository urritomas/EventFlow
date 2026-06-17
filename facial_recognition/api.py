"""
EventFlow - Facial Recognition Module
File: api.py

FastAPI server — active event is fetched dynamically from Supabase.
No hardcoded event IDs. The active event is whichever row in `events`
has is_active = true.

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
import httpx
# Monkey-patch to force HTTP/1.1 — fixes Windows connection issues with Supabase
_original_init = httpx.Client.__init__
def _patched_init(self, *args, **kwargs):
    kwargs.pop("http2", None)
    kwargs["http2"] = False
    _original_init(self, *args, **kwargs)
httpx.Client.__init__ = _patched_init
from supabase import create_client, Client

from face_recognition_module.face_engine import FaceEngine



# ── Config ────────────────────────────────────────────────────────────────────
load_dotenv()

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eventflow.api")

# ── App state ─────────────────────────────────────────────────────────────────
supabase:      Optional[Client]    = None
engine:        Optional[FaceEngine] = None
gallery:       list[dict]           = []
active_event:  Optional[dict]       = None  # { event_id, event_name, ... }


# ── Active event ──────────────────────────────────────────────────────────────

def fetch_active_event() -> Optional[dict]:
    """
    Fetches the single event where is_active = true from Supabase.
    Returns the full event row as a dict, or None if no event is active.
    """
    res = (
        supabase.table("events")
        .select("event_id, event_name, event_type, event_date, venue_name")
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0]
    return None


# ── Gallery ───────────────────────────────────────────────────────────────────

def reload_gallery() -> None:
    """
    Loads all active global face embeddings (event_id IS NULL) into the
    in-memory gallery, making face recognition reusable across any event.
    """
    global gallery, active_event

    active_event = fetch_active_event()

    res = (
        supabase.table("face_embeddings")
        .select(
            "embedding_id, participant_id, embedding, "
            "participants(participant_id, name, rfid)"
        )
        .eq("is_active", True)
        .is_("event_id", None)
        .execute()
    )

    rows    = res.data or []
    gallery = []

    for row in rows:
        emb  = np.array(row["embedding"], dtype=np.float32)
        norm = np.linalg.norm(emb)
        if norm == 0:
            continue
        gallery.append({
            "participant_id": row["participants"]["participant_id"],
            "name":           row["participants"]["name"],
            "rfid":           row["participants"]["rfid"],
            "embedding":      emb / norm,
        })

    logger.info(
        "Gallery reloaded (global embeddings) | %d participant(s) | active_event=%s",
        len(gallery),
        active_event["event_name"] if active_event else "none",
    )


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global supabase, engine
    logger.info("Starting EventFlow API...")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    engine   = FaceEngine(
        model_name="buffalo_sc",
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
        "https://event-flow-mu-pink.vercel.app",
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


def require_active_event() -> dict:
    """
    Returns the active event or raises 503 if none is set.
    Call this at the start of any route that needs an active event.
    """
    if active_event is None:
        raise HTTPException(
            status_code=503,
            detail="No active event. Set is_active=true on an event in Supabase."
        )
    return active_event


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    """Returns server status, active event info, and gallery size."""
    return {
        "status":       "ok",
        "active_event": active_event,   # None if no event is active
        "gallery_size": len(gallery),
        "model":        "buffalo_sc",
    }


# ── Active event management ───────────────────────────────────────────────────

@app.get("/api/active-event")
def get_active_event():
    """Returns the currently active event."""
    event = fetch_active_event()
    if event is None:
        return {"active_event": None, "message": "No active event."}
    return {"active_event": event}


@app.post("/api/active-event/{event_id}")
def set_active_event(event_id: int):
    """
    Switches the active event to the given event_id.
    Deactivates the previous active event and reloads the gallery.

    Call this from your admin panel when starting a new event.
    """
    # Verify the event exists
    check = (
        supabase.table("events")
        .select("event_id, event_name")
        .eq("event_id", event_id)
        .single()
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail=f"Event ID {event_id} not found.")

    # Use the SQL function to safely switch active event
    supabase.rpc("set_active_event", {"new_event_id": event_id}).execute()

    # Reload gallery for the new active event
    reload_gallery()

    logger.info("Active event switched to: %s (id=%d)", check.data["event_name"], event_id)

    return {
        "success":      True,
        "message":      f"Active event set to '{check.data['event_name']}'.",
        "active_event": active_event,
        "gallery_size": len(gallery),
    }


@app.post("/api/reload-gallery")
def trigger_reload():
    """
    Manually reloads the gallery from Supabase.
    Useful after bulk-registering participants outside the API.
    """
    reload_gallery()
    return {
        "success":      True,
        "active_event": active_event,
        "gallery_size": len(gallery),
    }


# ── Registration ──────────────────────────────────────────────────────────────

@app.post("/api/register")
async def register_participant(
    name:       str        = Form(...),
    email:      str        = Form(...),
    rfid:       Optional[str] = Form(None),
    image:      UploadFile = File(...),
    event_id:   Optional[int] = Form(None),
):
    # Extract embedding
    frame     = decode_image(await image.read())
    embedding = engine.detect_and_embed(frame)

    if embedding is None:
        raise HTTPException(
            status_code=422,
            detail="No face detected. Ensure the participant is clearly visible and well-lit."
        )

    # Get or create participant by email (fallback to rfid if provided)
    existing = (
        supabase.table("participants")
        .select("participant_id, name, rfid")
        .eq("email", email)
        .execute()
    )

    if existing.data:
        participant = existing.data[0]
        if rfid and not participant.get("rfid"):
            supabase.table("participants").update({"rfid": rfid}).eq("participant_id", participant["participant_id"]).execute()
            participant["rfid"] = rfid
    else:
        insert_data = {"name": name, "email": email}
        if rfid:
            insert_data["rfid"] = rfid
        p_res = (
            supabase.table("participants")
            .insert(insert_data)
            .execute()
        )
        participant = p_res.data[0]

    # Check if already has a global face embedding (event_id IS NULL)
    already = (
        supabase.table("face_embeddings")
        .select("embedding_id")
        .eq("participant_id", participant["participant_id"])
        .is_("event_id", None)
        .eq("is_active", True)
        .execute()
    )

    if already.data:
        raise HTTPException(
            status_code=409,
            detail=(
                f"'{participant['name']}' already has a global face registration. Use /api/re-enroll to update."
            )
        )

    # Insert global embedding (no event_id)
    supabase.table("face_embeddings").insert({
        "participant_id": participant["participant_id"],
        "embedding":      embedding.tolist(),
        "is_active":      True,
    }).execute()

    reload_gallery()

    logger.info(
        "Registered face globally: %s (rfid=%s)",
        participant["name"], rfid or participant.get("rfid"),
    )

    return {
        "success":        True,
        "message":        f"{participant['name']}'s face registered globally.",
        "participant_id": participant["participant_id"],
    }


@app.post("/api/re-enroll")
async def re_enroll_participant(
    rfid:       str        = Form(...),
    image:      UploadFile = File(...),
):
    p_res = (
        supabase.table("participants")
        .select("participant_id, name")
        .eq("rfid", rfid)
        .single()
        .execute()
    )
    if not p_res.data:
        raise HTTPException(status_code=404, detail=f"RFID '{rfid}' not found.")

    participant = p_res.data

    frame     = decode_image(await image.read())
    embedding = engine.detect_and_embed(frame)
    if embedding is None:
        raise HTTPException(status_code=422, detail="No face detected in the image.")

    supabase.table("face_embeddings").delete().eq(
        "participant_id", participant["participant_id"]
    ).is_("event_id", None).execute()

    supabase.table("face_embeddings").insert({
        "participant_id": participant["participant_id"],
        "embedding":      embedding.tolist(),
        "is_active":      True,
    }).execute()

    reload_gallery()

    return {
        "success":    True,
        "message":    f"Face updated for '{participant['name']}' (global registration).",
    }


# ── Verification ──────────────────────────────────────────────────────────────

@app.post("/api/verify-face")
async def verify_participant(
    image:          UploadFile = File(...),
    log_attendance: bool       = Form(True),
):
    event = require_active_event()

    if not gallery:
        raise HTTPException(
            status_code=503,
            detail=f"No participants registered for '{event['event_name']}' yet."
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

    action = "verified"

    if match and log_attendance:
        # Check if already has a log for this event
        existing = (
            supabase.table("attendance")
            .select("attendance_id")
            .eq("participant_id", match["participant_id"])
            .eq("event_id", event["event_id"])
            .execute()
        )

        if not existing.data:
            # First scan — check in
            supabase.table("attendance").insert({
                "participant_id":      match["participant_id"],
                "event_id":            event["event_id"],
                "check_in_similarity": float(score),
                "verified":         True,
            }).execute()
            action = "checked_in"

        else:
            action = "already_completed"

        logger.info(
            "%s: %s (rfid=%s, event='%s', score=%.4f)",
            action.upper(), match["name"], match["rfid"],
            event["event_name"], score,
        )

    if match:
        messages = {
            "checked_in":        f"Welcome, {match['name']}! Check-in recorded.",
            "checked_out":       f"Goodbye, {match['name']}! Check-out recorded.",
            "already_completed": f"{match['name']} has already checked in and out.",
            "verified":          f"Welcome, {match['name']}!",
        }
        return {
            "verified":       True,
            "action":         action,
            "name":           match["name"],
            "rfid":           match["rfid"],
            "participant_id": match["participant_id"],
            "similarity":     round(score, 4),
            "threshold":      engine.threshold,
            "event_name":     event["event_name"],
            "message":        messages.get(action, f"Welcome, {match['name']}!"),
        }

    return {
        "verified":   False,
        "similarity": round(score, 4),
        "threshold":  engine.threshold,
        "message":    "Face not recognized or not registered for this event.",
    }


# ── Participants ──────────────────────────────────────────────────────────────

@app.get("/api/participants")
def list_participants(event_id: Optional[int] = None):
    """
    Lists participants. If event_id is given, only returns those registered
    for that event. Defaults to the active event if no event_id provided.
    """
    filter_id = event_id if event_id is not None else (
        active_event["event_id"] if active_event else None
    )

    if filter_id is not None:
        res = (
            supabase.table("face_embeddings")
            .select("participants(participant_id, name, rfid, email, created_at)")
            .eq("event_id", filter_id)
            .eq("is_active", True)
            .execute()
        )
        participants = [row["participants"] for row in (res.data or [])]
    else:
        res = (
            supabase.table("participants")
            .select("participant_id, name, rfid, email, created_at")
            .order("created_at", desc=True)
            .execute()
        )
        participants = res.data or []

    return {"count": len(participants), "participants": participants}


@app.delete("/api/participants/{rfid}")
def delete_participant(rfid: str):
    """Deletes a participant. Cascades to face_embeddings and attendance."""
    res = (
        supabase.table("participants")
        .delete()
        .eq("rfid", rfid)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail=f"RFID '{rfid}' not found.")
    reload_gallery()
    return {"success": True, "message": f"Participant '{rfid}' deleted."}


# ── Attendance ────────────────────────────────────────────────────────────────

@app.get("/api/attendance")
def get_attendance(event_id: Optional[int] = None):
    filter_id = event_id if event_id is not None else (
        active_event["event_id"] if active_event else None
    )

    if filter_id is None:
        return {"count": 0, "records": [], "message": "No active event."}

    res = (
        supabase.table("attendance")
        .select(
            "attendance_id, check_in_similarity, check_out_similarity, "
            "check_in_time, check_out_time, verified, "
            "participants(name, rfid), "
            "events(event_name)"
        )
        .eq("event_id", filter_id)
        .order("check_in_time", desc=True)
        .execute()
    )

    records = [
        {
            "attendance_id":               r["attendance_id"],
            "name":                 r["participants"]["name"],
            "rfid":           r["participants"]["rfid"],
            "event_name":           r["events"]["event_name"],
            "check_in_similarity":  round(r["check_in_similarity"], 4) if r["check_in_similarity"] else None,
            "check_out_similarity": round(r["check_out_similarity"], 4) if r["check_out_similarity"] else None,
            "check_in_time":          r["check_in_time"],
            "check_out_time":         r["check_out_time"],
            "verified":          r["verified"],
        }
        for r in (res.data or [])
    ]

    return {"count": len(records), "records": records}