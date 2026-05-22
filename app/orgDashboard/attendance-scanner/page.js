"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Users,
  Wifi,
  WifiOff,
  ArrowLeft,
  Clock,
  ShieldCheck,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const SCAN_INTERVAL_MS = 2000;   // scan every 2 seconds
const RESULT_HOLD_MS   = 3500;   // show result for 3.5 seconds before resetting
const WARMUP_MS        = 1500;   // wait for camera to warm up

export default function AttendanceScannerPage() {
  const router = useRouter();

  // ── Auth guard ────────────────────────────────────────────────────────────────
  const [isAuthorized, setIsAuthorized] = useState(false);
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const userRole   = localStorage.getItem("userRole");
    if (!isLoggedIn || userRole !== "organization") {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const videoRef        = useRef(null);
  const canvasRef       = useRef(null);
  const streamRef       = useRef(null);
  const scanTimerRef    = useRef(null);
  const resetTimerRef   = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────────
  const [cameraReady,  setCameraReady]  = useState(false);
  const [cameraError,  setCameraError]  = useState("");
  const [apiOnline,    setApiOnline]    = useState(null); // null=checking, true, false
  const [activeEvent,  setActiveEvent]  = useState(null);
  const [scanning,     setScanning]     = useState(false);

  // status: idle | scanning | verified | checked_out | already_done | rejected | no_face
  const [status,       setStatus]       = useState("idle");
  const [result,       setResult]       = useState(null);
  const [checkedIn,    setCheckedIn]    = useState([]);
  const [totalScans,   setTotalScans]   = useState(0);

  // ── Check API health ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) return;
    const checkHealth = async () => {
      try {
        const res  = await fetch("/api/verify-face-health");
        const data = await res.json();
        setApiOnline(data.status === "ok");
        setActiveEvent(data.active_event || null);
      } catch {
        setApiOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  // ── Start camera ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) return;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setTimeout(() => setCameraReady(true), WARMUP_MS);
        }
      } catch {
        setCameraError("Cannot access camera. Check permissions and refresh.");
      }
    };
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(scanTimerRef.current);
      clearTimeout(resetTimerRef.current);
    };
  }, [isAuthorized]);

  // ── Capture + verify ──────────────────────────────────────────────────────────
  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);

    setStatus("scanning");
    setTotalScans((n) => n + 1);

    try {
      const res  = await fetch("/api/verify-face", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: imageDataUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("idle");
        return;
      }

      if (!data.verified && data.similarity === 0) {
        // No face detected — silently go back to idle
        setStatus("idle");
        return;
      }

      setResult(data);

      if (data.verified) {
        const action = data.action || "verified";

        if (action === "already_completed") {
          setStatus("already_done");
        } else if (action === "checked_out") {
          setStatus("checked_out");
          setCheckedIn((prev) =>
            prev.map((p) =>
              p.student_id === data.student_id
                ? { ...p, checked_out: true, check_out_time: new Date().toLocaleTimeString() }
                : p
            )
          );
        } else {
          // checked_in
          setStatus("verified");
          setCheckedIn((prev) => {
            if (prev.find((p) => p.student_id === data.student_id)) return prev;
            return [
              {
                name:         data.name,
                student_id:   data.student_id,
                time:         new Date().toLocaleTimeString(),
                checked_out:  false,
                check_out_time: null,
              },
              ...prev,
            ];
          });
        }
      } else {
        setStatus("rejected");
      }

      // Auto-reset after showing result
      resetTimerRef.current = setTimeout(() => {
        setStatus("idle");
        setResult(null);
      }, RESULT_HOLD_MS);

    } catch {
      setStatus("idle");
    }
  }, []);

  // ── Auto-scan loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraReady || !scanning) return;

    scanTimerRef.current = setInterval(() => {
      setStatus((current) => {
        if (current === "idle") captureAndVerify();
        return current;
      });
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(scanTimerRef.current);
  }, [cameraReady, scanning, captureAndVerify]);

  // ── UI helpers ────────────────────────────────────────────────────────────────
  const statusConfig = {
    idle: {
      border:  "border-blue-500/30",
      label:   scanning ? "Scanning…" : "Press Start to begin",
      color:   "text-slate-400",
      bg:      "",
    },
    scanning: {
      border:  "border-yellow-400/60",
      label:   "Analyzing face…",
      color:   "text-yellow-400",
      bg:      "",
    },
    verified: {
      border:  "border-emerald-400/80",
      label:   `✓ Check-in: ${result?.name ?? ""}`,
      color:   "text-emerald-400",
      bg:      "bg-emerald-500/5",
    },
    checked_out: {
      border:  "border-blue-400/80",
      label:   `↩ Check-out: ${result?.name ?? ""}`,
      color:   "text-blue-400",
      bg:      "bg-blue-500/5",
    },
    already_done: {
      border:  "border-yellow-400/60",
      label:   `${result?.name ?? ""} already completed`,
      color:   "text-yellow-400",
      bg:      "",
    },
    rejected: {
      border:  "border-red-400/80",
      label:   "Not recognized",
      color:   "text-red-400",
      bg:      "bg-red-500/5",
    },
    no_face: {
      border:  "border-slate-500/30",
      label:   "No face detected",
      color:   "text-slate-500",
      bg:      "",
    },
  };

  const cfg = statusConfig[status] ?? statusConfig.idle;

  if (!isAuthorized) return null;

  return (
    <div
      className="min-h-screen themed-screen"
      style={{ backgroundColor: "var(--page-bg)" }}
    >
      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-20 border-b px-6 py-3 flex items-center gap-4"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
      >
        <button
          onClick={() => router.push("/orgDashboard")}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-2">
          <ShieldCheck size={18} style={{ color: "#3b82f6" }} />
          <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
            Attendance Scanner
          </h1>
        </div>

        {/* API status */}
        <div className="ml-auto flex items-center gap-2">
          {apiOnline === null ? (
            <span className="text-xs text-slate-500">Checking API…</span>
          ) : apiOnline ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Wifi size={13} /> API Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <WifiOff size={13} /> API Offline
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-6 md:p-8">

        {/* Active event banner */}
        {activeEvent && (
          <div
            className="mb-6 rounded-xl border px-5 py-3 flex items-center gap-3"
            style={{ backgroundColor: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.25)" }}
          >
            <Clock size={16} style={{ color: "#3b82f6" }} />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Active Event
              </span>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {activeEvent.event_name}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-slate-400">{activeEvent.event_date}</p>
              <p className="text-xs text-slate-400">{activeEvent.venue_name}</p>
            </div>
          </div>
        )}

        {!activeEvent && apiOnline === false && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            Python API is offline. Start uvicorn and ensure FACE_API_URL is set correctly.
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* ── Camera panel ── */}
          <div className="flex w-full flex-col gap-4 lg:w-[520px] lg:shrink-0">

            {cameraError ? (
              <div className="flex h-80 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10">
                <div className="text-center">
                  <XCircle size={40} className="mx-auto mb-3 text-red-400" />
                  <p className="text-sm text-red-300">{cameraError}</p>
                </div>
              </div>
            ) : (
              <div
                className={`relative overflow-hidden rounded-2xl border-4 transition-all duration-500 ${cfg.border} ${cfg.bg}`}
                style={{ aspectRatio: "4/3" }}
              >
                {/* Live feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Corner brackets */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-3 top-3 h-8 w-8 border-l-2 border-t-2 border-blue-400/50" />
                  <div className="absolute right-3 top-3 h-8 w-8 border-r-2 border-t-2 border-blue-400/50" />
                  <div className="absolute bottom-3 left-3 h-8 w-8 border-b-2 border-l-2 border-blue-400/50" />
                  <div className="absolute bottom-3 right-3 h-8 w-8 border-b-2 border-r-2 border-blue-400/50" />
                </div>

                {/* Scan line animation */}
                {scanning && status === "idle" && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 animate-[scan_2s_ease-in-out_infinite] bg-blue-400/60" />
                )}

                {/* Status overlay */}
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2 bg-black/60 py-2.5 backdrop-blur-sm">
                  {status === "scanning" && (
                    <div className="h-3 w-3 animate-ping rounded-full bg-yellow-400" />
                  )}
                  {status === "verified" && <CheckCircle size={15} className="text-emerald-400" />}
                  {status === "checked_out" && <CheckCircle size={15} className="text-blue-400" />}
                  {status === "rejected" && <XCircle size={15} className="text-red-400" />}
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>

                {/* Not ready overlay */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <p className="text-sm text-slate-400">Starting camera…</p>
                  </div>
                )}
              </div>
            )}

            {/* Result card */}
            {result && status !== "idle" && status !== "scanning" && (
              <div
                className={`rounded-xl border px-5 py-4 transition-all duration-300 ${
                  status === "verified"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : status === "checked_out"
                    ? "border-blue-500/30 bg-blue-500/10"
                    : status === "already_done"
                    ? "border-yellow-500/30 bg-yellow-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                {status === "verified" && (
                  <div className="flex items-center gap-3">
                    <CheckCircle size={28} className="shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-slate-100">{result.name}</p>
                      <p className="text-xs text-slate-400">{result.student_id}</p>
                      <p className="mt-0.5 text-xs text-emerald-400">
                        Checked in · {(result.similarity * 100).toFixed(1)}% confidence
                      </p>
                    </div>
                  </div>
                )}
                {status === "checked_out" && (
                  <div className="flex items-center gap-3">
                    <CheckCircle size={28} className="shrink-0 text-blue-400" />
                    <div>
                      <p className="font-semibold text-slate-100">{result.name}</p>
                      <p className="text-xs text-slate-400">{result.student_id}</p>
                      <p className="mt-0.5 text-xs text-blue-400">
                        Checked out · {(result.similarity * 100).toFixed(1)}% confidence
                      </p>
                    </div>
                  </div>
                )}
                {status === "already_done" && (
                  <div className="flex items-center gap-3">
                    <CheckCircle size={28} className="shrink-0 text-yellow-400" />
                    <div>
                      <p className="font-semibold text-slate-100">{result.name}</p>
                      <p className="text-xs text-yellow-400">Already checked in and out</p>
                    </div>
                  </div>
                )}
                {status === "rejected" && (
                  <div className="flex items-center gap-3">
                    <XCircle size={28} className="shrink-0 text-red-400" />
                    <div>
                      <p className="font-semibold text-slate-100">Not Recognized</p>
                      <p className="text-xs text-red-400">
                        Score: {(result.similarity * 100).toFixed(1)}% — below threshold
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Start / Stop button */}
            <button
              onClick={() => setScanning((s) => !s)}
              disabled={!cameraReady || !apiOnline}
              className={`w-full rounded-2xl py-3.5 text-sm font-bold tracking-wide transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${
                scanning
                  ? "border border-red-500/30 bg-red-500/10 text-red-300"
                  : "bg-blue-500 text-white"
              }`}
            >
              {scanning ? "⏹ Stop Scanning" : "▶ Start Scanning"}
            </button>
          </div>

          {/* ── Session log ── */}
          <div className="flex-1 rounded-2xl border" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--surface)" }}>
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <Users size={16} style={{ color: "#3b82f6" }} />
                <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                  Session Log
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{totalScans} scans</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                >
                  {checkedIn.length} checked in
                </span>
              </div>
            </div>

            <div className="max-h-[480px] overflow-y-auto">
              {checkedIn.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users size={32} className="mb-3 opacity-20" style={{ color: "var(--foreground)" }} />
                  <p className="text-sm text-slate-500">No participants checked in yet.</p>
                  <p className="mt-1 text-xs text-slate-600">Start scanning to record attendance.</p>
                </div>
              ) : (
                <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                  {checkedIn.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 px-5 py-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          p.checked_out
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: "var(--foreground)" }}>
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500">{p.student_id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">In: {p.time}</p>
                        {p.checked_out && (
                          <p className="text-xs text-blue-400">Out: {p.check_out_time}</p>
                        )}
                        {!p.checked_out && (
                          <span className="text-xs text-emerald-400">Present</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scan line keyframe */}
      <style jsx>{`
        @keyframes scan {
          0%   { top: 0%; }
          50%  { top: 95%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}