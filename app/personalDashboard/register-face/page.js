"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import { Camera, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";

export default function RegisterFacePage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isReenrolling, setIsReenrolling] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRFID, setUserRFID] = useState("");

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

  useEffect(() => {
    const firstName = localStorage.getItem("firstName") || "";
    const lastName = localStorage.getItem("lastName") || "";
    const email = localStorage.getItem("email") || "";
    const rfid = localStorage.getItem("rfid") || "";
    setUserName(`${firstName} ${lastName}`.trim());
    setUserEmail(email);
    setUserRFID(rfid);
  }, []);

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setCapturedImage(canvasRef.current.toDataURL("image/jpeg"));
    setErrorMessage("");
  };

  const retake = () => setCapturedImage(null);

  const handleRegisterFace = async () => {
    if (!capturedImage) return setErrorMessage("Please capture your face first.");
    if (!userName.trim()) return setErrorMessage("User name not found. Please log in again.");
    if (!userEmail.trim()) return setErrorMessage("User email not found. Please log in again.");

    setIsSubmitting(true);
    setStatusMessage("Processing your face…");
    setErrorMessage("");

    try {
      const response = await fetch("/api/register-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName.trim(),
          email: userEmail.trim(),
          rfid: userRFID.trim() || null,
          image: capturedImage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error || data.detail || "Failed to register face.";
        const alreadyMatch = errMsg.toLowerCase().includes("already registered");
        
        if (alreadyMatch) {
          setAlreadyRegistered(true);
          setStatusMessage("");
          setIsSubmitting(false);
          return;
        }
        
        throw new Error(errMsg);
      }

      setStatusMessage(`✓ ${data.message || "Face registered successfully!"} Redirecting…`);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setTimeout(() => router.push("/personalDashboard"), 2000);
    } catch (err) {
      setErrorMessage(err.message || "Failed to register face. Please try again.");
      setIsSubmitting(false);
      setStatusMessage("");
    }
  };

  const handleReenrollFace = async () => {
    if (!userRFID.trim()) return setErrorMessage("RFID not found. Please set your RFID in the dashboard first.");
    if (!capturedImage) return setErrorMessage("Please capture your face first.");

    setIsReenrolling(true);
    setStatusMessage("Updating your face…");
    setErrorMessage("");

    try {
      const response = await fetch("/api/re-enroll-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfid: userRFID.trim(),
          image: capturedImage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || "Failed to re-enroll face.");
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

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Camera Preview</p>
            {cameraError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
                <p className="text-sm text-red-300">{cameraError}</p>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-slate-900" style={{ aspectRatio: "4/3" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-300 ${capturedImage ? "opacity-0" : "opacity-100"}`}
                />
                {capturedImage && (
                  <img src={capturedImage} alt="Captured face" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {!capturedImage && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-56 w-44 rounded-full border-2 border-dashed border-emerald-400/70" />
                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-emerald-300 backdrop-blur-sm">
                      {cameraReady ? "Position your face in the oval" : "Starting camera…"}
                    </span>
                  </div>
                )}
                {capturedImage && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-1.5 backdrop-blur-sm">
                    <CheckCircle size={14} className="text-white" />
                    <span className="text-xs font-semibold text-white">Face captured</span>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

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

          {alreadyRegistered && userRFID && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Your RFID</p>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userRFID}
                  disabled
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-slate-100 opacity-70"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-300">{errorMessage}</p>
                {errorMessage.toLowerCase().includes("already") && !alreadyRegistered && (
                  <p className="text-xs text-red-400 mt-2">You can update your face registration instead.</p>
                )}
              </div>
            </div>
          )}

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
