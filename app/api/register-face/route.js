// app/api/register-face/route.js
// Forwards face registration requests to the FastAPI Python backend.

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, studentId, email, eventId, image } = body;

    if (!image)     return Response.json({ error: "No image data provided." }, { status: 400 });
    if (!name)      return Response.json({ error: "Name is required." },       { status: 400 });
    if (!studentId) return Response.json({ error: "Student ID is required." }, { status: 400 });
    if (!email)     return Response.json({ error: "Email is required." },      { status: 400 });

    const FACE_API_URL = process.env.FACE_API_URL ?? "http://localhost:8000";

    // Convert base64 → binary
    const base64Data  = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Build multipart form for FastAPI
    const formData = new FormData();
    formData.append("name",       name);
    formData.append("student_id", studentId);
    formData.append("email",      email);
    formData.append(
      "image",
      new Blob([imageBuffer], { type: "image/jpeg" }),
      "capture.jpg"
    );

    const pythonRes = await fetch(`${FACE_API_URL}/api/register`, {
      method: "POST",
      body:   formData,
    });

    const rawText = await pythonRes.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[register-face] Non-JSON response:", rawText.slice(0, 200));
      return Response.json(
        { error: "Face API returned an unexpected response. Is the Python server running?" },
        { status: 502 }
      );
    }

    if (!pythonRes.ok) {
      return Response.json(
        { error: data.detail || data.error || "Registration failed." },
        { status: pythonRes.status }
      );
    }

    return Response.json(data, { status: 200 });

  } catch (err) {
    console.error("[register-face] Error:", err);
    return Response.json(
      { error: "Internal server error. Is the Python API running?" },
      { status: 500 }
    );
  }
}