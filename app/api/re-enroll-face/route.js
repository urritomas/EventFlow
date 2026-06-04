export async function POST(request) {
  try {
    const body = await request.json();
    const { rfid, eventId, image } = body;  // ← add eventId

    if (!image)   return Response.json({ error: "No image data provided." }, { status: 400 });
    if (!rfid)    return Response.json({ error: "RFID is required." },       { status: 400 });
    if (!eventId) return Response.json({ error: "Event ID is required." },   { status: 400 });

    const FACE_API_URL = process.env.FACE_API_URL ?? "http://localhost:8000";

    const base64Data  = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    const formData = new FormData();
    formData.append("rfid",     rfid);
    formData.append("event_id", String(eventId));
    formData.append(
      "image",
      new Blob([imageBuffer], { type: "image/jpeg" }),
      "capture.jpg"
    );

    const pythonRes = await fetch(`${FACE_API_URL}/api/re-enroll`, {
      method: "POST",
      body:   formData,
    });

    const rawText = await pythonRes.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[re-enroll-face] Non-JSON response:", rawText.slice(0, 200));
      return Response.json(
        { error: "Face API returned an unexpected response. Is the Python server running?" },
        { status: 502 }
      );
    }

    if (!pythonRes.ok) {
      return Response.json(
        { error: data.detail || data.error || "Re-enrollment failed." },
        { status: pythonRes.status }
      );
    }

    return Response.json(data, { status: 200 });

  } catch (err) {
    console.error("[re-enroll-face] Error:", err);
    return Response.json(
      { error: "Internal server error. Is the Python API running?" },
      { status: 500 }
    );
  }
}