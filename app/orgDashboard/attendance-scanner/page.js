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

const SCAN_INTERVAL_MS = 2000;
const RESULT_HOLD_MS   = 2500;
const WARMUP_MS        = 1500;

export default function AttendanceScannerPage() {
  const router = useRouter();

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

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const streamRef     = useRef(null);
  const scanTimerRef  = useRef(null);
  const resetTimerRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [apiOnline,   setApiOnline]   = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [scanning,    setScanning]    = useState(false);

  // status: idle | scanning | verified | already_done | rejected
  const [status,     setStatus]     = useState("idle");
  const [result,     setResult]     = useState(null);
  const [checkedIn,  setCheckedIn]  = useState(new Set());   // student_ids already checked in this session
  const [logEntries, setLogEntries] = useState([]);   // display list
  const [totalScans, setTotalScans] = useState(0);

  // ── Health check ──────────────────────────────────────────────────────────────
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

  // ── Camera ────────────────────────────────────────────────────────────────────
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
  const captureAndVerify = useCallback(async (alreadyCheckedIn) => {
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

      console.log("[verify-face response]", { status: res.status, data });

      if (!res.ok || (!data.verified && data.similarity === 0)) {
        // No face or API error — silently reset
        setStatus("idle");
        return;
      }

      setResult(data);

      if (data.verified) {
        const sid = data.student_id;

        if (alreadyCheckedIn.has(sid)) {
          // Already checked in this session — show briefly then skip
          setStatus("already_done");
        } else {
          // New check-in
          setStatus("verified");
          setCheckedIn((prev) => new Set([...prev, sid]));
          const newEntry = {
            name:       data.name,
            student_id: sid,
            time:       new Date().toLocaleTimeString(),
          };
          console.log("Adding to logEntries:", newEntry);
          setLogEntries((prev) => [newEntry, ...prev]);
        }
      } else {
        setStatus("rejected");
      }

      // Auto-reset after showing result — move to next person
      resetTimerRef.current = setTimeout(() => {
        setStatus("idle");
        setResult(null);
      }, RESULT_HOLD_MS);

    } catch {
      setStatus("idle");
    }
  }, []);

  // ── Auto-scan loop ────────────────────────────────────────────────────────────
  // Pass current checkedIn set into captureAndVerify so it always has latest state
  const checkedInRef = useRef(checkedIn);
  useEffect(() => { checkedInRef.current = checkedIn; }, [checkedIn]);

  useEffect(() => {
    if (!cameraReady || !scanning) return;

    scanTimerRef.current = setInterval(() => {
      setStatus((current) => {
        if (current === "idle") {
          captureAndVerify(checkedInRef.current);
        }
        return current;
      });
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(scanTimerRef.current);
  }, [cameraReady, scanning, captureAndVerify]);

  // ── Status config ─────────────────────────────────────────────────────────────
  const statusConfig = {
    idle: {
      border: "border-blue-500/30",
      label:  scanning ? "Scanning…" : "Press Start to begin",
      color:  "text-slate-400",
    },
    scanning: {
      border: "border-yellow-400/60",
      label:  "Analyzing face…",
      color:  "text-yellow-400",
    },
    verified: {
      border: "border-emerald-400/80",
      label:  `✓ Check-in: ${result?.name ?? ""}`,
      color:  "text-emerald-400",
    },
    already_done: {
      border: "border-slate-500/40",
      label:  `${result?.name ?? ""} already checked in`,
      color:  "text-slate-400",
    },
    rejected: {
      border: "border-red-400/80",
      label:  "Not recognized",
      color:  "text-red-400",
    },
  };

  const cfg = statusConfig[status] ?? statusConfig.idle;

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen themed-screen" style={{ backgroundColor: "var(--page-bg)" }}>

      {/* Top bar */}
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
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Active Event</span>
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

        {/* Attendance Summary Card */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div
            className="rounded-2xl border px-6 py-4"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Scans</p>
            <p className="mt-2 text-3xl font-bold" style={{ color: "#3b82f6" }}>{totalScans}</p>
          </div>
          <div
            className="rounded-2xl border px-6 py-4"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Checked In</p>
            <p className="mt-2 text-3xl font-bold" style={{ color: "#10b981" }}>{logEntries.length}</p>
          </div>
          <div
            className="rounded-2xl border px-6 py-4"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
            <p className="mt-2 text-lg font-bold" style={{ color: scanning ? "#f59e0b" : "#6b7280" }}>
              {scanning ? "Scanning" : "Idle"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* Camera panel */}
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
                className={`relative overflow-hidden rounded-2xl border-4 transition-all duration-500 ${cfg.border}`}
                style={{ aspectRatio: "4/3" }}
              >
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Corner brackets */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-3 top-3 h-8 w-8 border-l-2 border-t-2 border-blue-400/50" />
                  <div className="absolute right-3 top-3 h-8 w-8 border-r-2 border-t-2 border-blue-400/50" />
                  <div className="absolute bottom-3 left-3 h-8 w-8 border-b-2 border-l-2 border-blue-400/50" />
                  <div className="absolute bottom-3 right-3 h-8 w-8 border-b-2 border-r-2 border-blue-400/50" />
                </div>

                {/* Scan line */}
                {scanning && status === "idle" && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 animate-[scan_2s_ease-in-out_infinite] bg-blue-400/60" />
                )}

                {/* Status bar */}
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2 bg-black/60 py-2.5 backdrop-blur-sm">
                  {status === "scanning" && <div className="h-3 w-3 animate-ping rounded-full bg-yellow-400" />}
                  {status === "verified"  && <CheckCircle size={15} className="text-emerald-400" />}
                  {status === "rejected"  && <XCircle size={15} className="text-red-400" />}
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>

                {/* Camera not ready overlay */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <p className="text-sm text-slate-400">Starting camera…</p>
                  </div>
                )}
              </div>
            )}

            {/* Result card */}
            {result && status !== "idle" && status !== "scanning" && (
              <div className={`rounded-xl border px-5 py-4 transition-all duration-300 ${
                status === "verified"
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : status === "already_done"
                  ? "border-slate-500/20 bg-slate-500/5"
                  : "border-red-500/30 bg-red-500/10"
              }`}>
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
                {status === "already_done" && (
                  <div className="flex items-center gap-3">
                    <CheckCircle size={28} className="shrink-0 text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-100">{result.name}</p>
                      <p className="text-xs text-slate-400">Already checked in this session</p>
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

            {/* Start / Stop */}
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

            {/* Debug: Test Button */}
            <button
              onClick={() => {
                setLogEntries((prev) => [
                  {
                    name: "Test User",
                    student_id: "STU" + Math.floor(Math.random() * 10000),
                    time: new Date().toLocaleTimeString(),
                  },
                  ...prev,
                ]);
                setTotalScans((n) => n + 1);
              }}
              className="w-full rounded-2xl py-2 text-xs font-semibold border border-slate-500/30 bg-slate-500/10 text-slate-400 transition hover:bg-slate-500/20"
            >
              + Add Test Entry
            </button>
          </div>

          {/* Session log */}
          <div className="flex-1 rounded-2xl border" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--surface)" }}>
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <Users size={16} style={{ color: "#3b82f6" }} />
                <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                  Attendance Record
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{totalScans} scans</span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{ backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}
                >
                  {logEntries.length} present
                </span>
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {logEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Users size={40} className="mb-3 opacity-20" style={{ color: "var(--foreground)" }} />
                  <p className="text-sm font-medium text-slate-400">No participants checked in yet.</p>
                  <p className="mt-1 text-xs text-slate-600">Press "Start Scanning" to begin recording attendance.</p>
                </div>
              ) : (
                <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                  {logEntries.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ backgroundColor: "rgba(16, 185, 129, 0.3)", color: "#10b981" }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{p.student_id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400 font-medium">{p.time}</p>
                        <span className="text-xs font-bold" style={{ color: "#10b981" }}>Checked In</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

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