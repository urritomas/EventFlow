import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Supabase URL or service role key not configured");
}

const supabase = createClient(supabaseUrl || "", serviceKey || "");

export async function POST(req) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfigured: missing Supabase credentials." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { eventId, participantId } = body || {};

    if (!eventId || !participantId) {
      return NextResponse.json(
        { error: "Missing required fields: eventId and participantId are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("event_participants")
      .insert({
        event_id: Number(eventId),
        participant_id: Number(participantId),
        registered_at: new Date().toISOString(),
        review_status: "pending",
        registration_status: "registered",
      })
      .select("*")
      .single();

    if (error) {
      console.error("[register-event] Database error:", error);
      return NextResponse.json(
        { error: "Registration failed.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, registration: data });
  } catch (error) {
    console.error("[register-event] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
