"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import { Camera, CheckCircle, ArrowLeft, AlertCircle, User, Mail } from "lucide-react";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/client";

function RegisterFacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdFromUrl = searchParams.get("eventId");
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ── Form fields ──────────────────────────────────────────────────────────────
  const [rfid, setRfid] = useState("");
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");

  // ── Camera / capture state ───────────────────────────────────────────────────
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [cameraReady,   setCameraReady]   = useState(false);
  const [cameraError,   setCameraError]   = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage,  setErrorMessage]  = useState("");
  const [isReenrolling, setIsReenrolling] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  // ── Check if user already registered ──────────────────────────────────────────
  useEffect(() => {
    if (!eventIdFromUrl) return;
    const key = `faceRegistered_event_${eventIdFromUrl}`;
    const registered = window.localStorage.getItem(key) === "true";
    setAlreadyRegistered(registered);
    console.log("eventIdFromUrl:", eventIdFromUrl);
  }, [eventIdFromUrl]);

  // ── Auto-start camera on mount ───────────────────────────────────────────────
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch {
        setCameraError("Unable to access camera. Please allow camera permissions and refresh.");
      }
    };
    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);



  // ── Capture frame ─────────────────────────────────────────────────────────────
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width  = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setCapturedImage(canvasRef.current.toDataURL("image/jpeg"));
    setErrorMessage("");
  };

  const retake = () => setCapturedImage(null);

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleRegisterFace = async () => {
    if (!name.trim())        return setErrorMessage("Please enter your full name.");
    if (!email.trim())       return setErrorMessage("Please enter your email address.");
    if (!rfid.trim())        return setErrorMessage("Please enter your RFID.");
    if (!capturedImage)      return setErrorMessage("Please capture your face first.");
    if (!eventIdFromUrl)     return setErrorMessage("No event selected. Please register for an event first.");

    setIsSubmitting(true);
    setStatusMessage("Processing your face…");
    setErrorMessage("");

    if (!rfid.trim()) return setErrorMessage("Please enter your RFID.");

    try {
      const response = await fetch("/api/register-face", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:  name.trim(),
          email: email.trim(),
          rfid:  rfid.trim(),
          eventId:   eventIdFromUrl,
          image: capturedImage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if already registered error (409)
        if (response.status === 409) {
          setErrorMessage(data.error || "Already registered");
          setAlreadyRegistered(true);
          setIsSubmitting(false);
          return;
        }
        throw new Error(data.error || "Failed to register face.");
      }

      window.localStorage.setItem(`faceRegistered_event_${eventIdFromUrl}`, "true");
      setStatusMessage(`✓ ${data.message || "Face registered successfully!"} Redirecting…`);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setTimeout(() => router.push("/personalDashboard"), 2000);

    } catch (err) {
      setErrorMessage(err.message || "Failed to register face. Please try again.");
      setIsSubmitting(false);
      setStatusMessage("");
    }
  };

  // ── Re-enroll handler ────────────────────────────────────────────────────────
  const handleReenrollFace = async () => {
    console.log("Re-enroll eventIdFromUrl:", eventIdFromUrl);
    console.log("Re-enroll rfid:", rfid); 
    if (!rfid.trim())    return setErrorMessage("Please enter your RFID.");
    if (!capturedImage)  return setErrorMessage("Please capture your face first.");

    setIsReenrolling(true);
    setStatusMessage("Updating your face…");
    setErrorMessage("");

    try {
      const response = await fetch("/api/re-enroll-face", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfid:  rfid.trim(),
          eventId:   eventIdFromUrl,
          image: capturedImage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to re-enroll face.");
      }

      setStatusMessage(`✓ ${data.message || "Face updated successfully!"} Redirecting…`);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setTimeout(() => router.push("/personalDashboard"), 2000);

    } catch (err) {
      setErrorMessage(err.message || "Failed to re-enroll face. Please try again.");
      setIsReenrolling(false);
      setStatusMessage("");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen themed-screen" style={{ backgroundColor: "var(--page-bg)" }}>
      <SiteHeader showBack={true} />
      <div className="max-w-2xl mx-auto p-6 md:p-10">

        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400">
              <Camera size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">
                {alreadyRegistered ? "Update Face ID" : "Face ID Registration"}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {alreadyRegistered
                  ? "Capture your face to update your registration."
                  : "Fill in your details and capture your face to register."}
              </p>
            </div>
          </div>

          {/* ── Event indicator ── */}
          
          {eventIdFromUrl ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs text-slate-400">
                Registering face for event ID:{" "}
                <span className="text-emerald-400 font-semibold">{eventIdFromUrl}</span>
              </p>
              </div>
          ) : (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-xs text-red-400">
                No event selected. Please go back and register for an event first.
              </p>
            </div>
          )}


          {/* ── Always-visible camera preview ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Camera Preview
            </p>

            {cameraError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
                <p className="text-sm text-red-300">{cameraError}</p>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-slate-900" style={{ aspectRatio: "4/3" }}>

                {/* Live video — always mounted, hidden only when showing captured image */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-300 ${capturedImage ? "opacity-0" : "opacity-100"}`}
                />

                {/* Captured image overlaid on top */}
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured face"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* Face guide oval — shown only on live feed */}
                {!capturedImage && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-56 w-44 rounded-full border-2 border-dashed border-emerald-400/70" />
                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-emerald-300 backdrop-blur-sm">
                      {cameraReady ? "Position your face in the oval" : "Starting camera…"}
                    </span>
                  </div>
                )}

                {/* Captured badge */}
                {capturedImage && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-1.5 backdrop-blur-sm">
                    <CheckCircle size={14} className="text-white" />
                    <span className="text-xs font-semibold text-white">Face captured</span>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {/* Capture / Retake button */}
            {!cameraError && (
              <div className="flex gap-3">
                {!capturedImage ? (
                  <button
                    onClick={captureFrame}
                    disabled={!cameraReady || isSubmitting}
                    className="flex-1 rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cameraReady ? "Capture Face" : "Starting camera…"}
                  </button>
                ) : (
                  <button
                    onClick={retake}
                    disabled={isSubmitting}
                    className="flex-1 rounded-2xl border border-slate-500/30 bg-slate-500/10 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-500/20 disabled:opacity-50"
                  >
                    Retake
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Personal info fields ── */}
          {alreadyRegistered && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Your RFID
              </p>

              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="RFID"
                  value={rfid}
                  onChange={(e) => setRfid(e.target.value)}
                  disabled={isReenrolling}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* ── Personal info fields ── */}
          {!alreadyRegistered && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Your Information
              </p>

              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
                />
              </div>

              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
                />
              </div>

              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="RFID"
                  value={rfid}
                  onChange={(e) => setRfid(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
                />
              </div>
            </div>
          )}



          {/* Error */}
          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-300">{errorMessage}</p>
                {errorMessage.includes("already registered") && !alreadyRegistered && (
                  <p className="text-xs text-red-400 mt-2">
                    You can update your face registration instead.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit or Re-enroll */}
          {alreadyRegistered ? (
            <button
              onClick={handleReenrollFace}
              disabled={isReenrolling || !capturedImage}
              className="w-full rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReenrolling ? "Updating Face…" : "Update My Face"}
            </button>
          ) : (
            <button
              onClick={handleRegisterFace}
              disabled={isSubmitting || !capturedImage}
              className="w-full rounded-2xl bg-emerald-400 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Processing…" : "Register Face"}
            </button>
          )}

          {/* Success */}
          {statusMessage && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
              <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-300">{statusMessage}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterFacePage />
    </Suspense>
  );
}