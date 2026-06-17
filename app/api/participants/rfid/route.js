import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Supabase URL or service role key not configured");
}

const supabase = createClient(supabaseUrl || "", serviceKey || "");

export async function PUT(req) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
    }

    const body = await req.json();
    const { participantId, rfid } = body || {};

    if (!participantId || !rfid) {
      return NextResponse.json({ error: "participantId and rfid are required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("participants")
      .update({ rfid })
      .eq("participant_id", participantId)
      .select("participant_id, rfid")
      .maybeSingle();

    if (error) {
      console.error("[participants/rfid] Update error:", error);
      return NextResponse.json({ error: "Failed to save RFID.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("[participants/rfid] Unexpected error:", error);
    return NextResponse.json({ error: "Unexpected server error.", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
    }

    const body = await req.json();
    const { participantId } = body || {};

    if (!participantId) {
      return NextResponse.json({ error: "participantId is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("participants")
      .update({ rfid: null })
      .eq("participant_id", participantId)
      .select("participant_id, rfid")
      .maybeSingle();

    if (error) {
      console.error("[participants/rfid] Delete error:", error);
      return NextResponse.json({ error: "Failed to remove RFID.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("[participants/rfid] Unexpected error:", error);
    return NextResponse.json({ error: "Unexpected server error.", details: error.message }, { status: 500 });
  }
}
