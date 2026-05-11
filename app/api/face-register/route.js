// app/api/face-verify/route.js
// Next.js API route — middleman between the attendance page and FastAPI.
// Receives base64 image + event_id from the frontend,
// converts the image to binary, and forwards to the Python FastAPI server.

export async function POST(request) {
  try {
    const body = await request.json();
    const { image, eventId } = body;

    if (!image) {
      return Response.json(
        { error: "image is required." },
        { status: 400 }
      );
    }

    // Use eventId from request, or fall back to the env default
    const resolvedEventId = eventId ?? process.env.ACTIVE_EVENT_ID;

    if (!resolvedEventId) {
      return Response.json(
        { error: "No active event configured. Set ACTIVE_EVENT_ID in .env.local." },
        { status: 503 }
      );
    }

    // Convert base64 → binary buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Build multipart FormData for FastAPI
    const formData = new FormData();
    formData.append("event_id",       String(resolvedEventId));
    formData.append("log_attendance", "true");
    formData.append(
      "image",
      new Blob([imageBuffer], { type: "image/png" }),
      "capture.png"
    );

    // Forward to FastAPI
    const pythonRes = await fetch(
      `${process.env.FACE_API_URL}/api/verify`,
      { method: "POST", body: formData }
    );

    const data = await pythonRes.json();

    if (!pythonRes.ok) {
      return Response.json(
        { error: data.detail || "Verification failed." },
        { status: pythonRes.status }
      );
    }

    return Response.json(data, { status: 200 });

  } catch (err) {
    console.error("[face-verify] Error:", err);
    return Response.json(
      { error: "Internal server error. Is the Python API running?" },
      { status: 500 }
    );
  }
}