"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, User, IdCard, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function FaceRegistrationForm() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Request camera access
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        setError("Unable to access camera. Please allow camera permissions.");
        console.error("Error accessing camera:", err);
      });

    return () => {
      // Cleanup stream
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureFace = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL("image/png");
    setCapturedImage(imageDataUrl);
    setIsCapturing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !studentId || !capturedImage) {
      setError("Please fill all fields and capture your face.");
      return;
    }

    try {
      const response = await fetch("/api/face-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          studentId,
          image: capturedImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Registration failed");
        return;
      }

      const data = await response.json();
      alert(data.message || "Face registered successfully!");
      router.push("/login");
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Submit error:", err);
    }
  };

  return (
    <div className="glass-card w-full min-w-[min(100%,17rem)] max-w-full rounded-2xl border border-white/10 bg-surface-container-low/60 p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)] sm:p-10">
      <div className="mb-6 text-center">
        <h2 className="font-heading text-2xl font-semibold text-on-surface sm:text-h3">Face Registration</h2>
        <p className="mt-2 text-sm text-on-surface-variant sm:text-base">Register your face for event access</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <Input
          label="Full Name"
          name="name"
          placeholder="Enter your full name"
          leftIcon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Student ID"
          name="studentId"
          placeholder="Enter your student ID"
          leftIcon={IdCard}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
        />

        <div className="space-y-3">
          <label className="block text-sm font-medium text-on-surface">Face Capture</label>
          <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-lg border border-surface-tint/30 bg-black">
            {capturedImage ? (
              <img src={capturedImage} alt="Captured face" className="h-full w-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <Button
            type="button"
            onClick={captureFace}
            disabled={isCapturing}
            className="w-full"
          >
            <Camera className="size-5" aria-hidden />
            <span>{capturedImage ? "Recapture Face" : "Capture Face"}</span>
          </Button>
        </div>

        {error && (
          <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-surface-tint to-brand-deep py-4 text-base font-semibold text-on-secondary shadow-[0_0_18px_rgba(81,153,245,0.35)] transition duration-300 hover:shadow-[0_0_26px_rgba(81,153,245,0.55)] active:scale-[0.98] sm:text-lg"
        >
          <span>Register Face</span>
          <ArrowRight className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}