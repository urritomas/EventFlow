// app/api/verify-face-health/route.js
// Proxies the FastAPI health check to the frontend.

export async function GET() {
  try {
    const FACE_API_URL = process.env.FACE_API_URL ?? "http://localhost:8000";
    const res  = await fetch(`${FACE_API_URL}/api/health`, { cache: "no-store" });
    const data = await res.json();
    return Response.json(data, { status: 200 });
  } catch {
    return Response.json({ status: "offline", active_event: null }, { status: 200 });
  }
}