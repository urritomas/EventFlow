import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  if (!key) throw new Error("Missing Supabase key");
  return createClient(supabaseUrl, key);
}

const EVENT_PARTICIPANT_COLUMNS = [
  "id",
  "event_id",
  "participant_id",
  "review_status",
  "organizer_notes",
  "reviewed_at",
  "registration_status",
  "created_at",
].join(", ");

const PARTICIPANT_COLUMNS = [
  "participant_id",
  "name",
  "email",
  "rfid",
].join(", ");

function isColumnMissingError(error) {
  const code = String(error.code || "");
  const message = String(error.message || "");
  return code === "42703" || /column .+ does not exist/i.test(message);
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "Missing eventId parameter." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const eventIdNumber = Number(eventId);

    let rows;
    try {
      const result = await supabase
        .from("event_participants")
        .select(EVENT_PARTICIPANT_COLUMNS)
        .eq("event_id", eventIdNumber)
        .order("created_at", { ascending: true });

      if (result.error) throw result.error;
      rows = result.data || [];
    } catch (queryError) {
      console.error("[registration-review] event_participants query error:", queryError);
      return NextResponse.json({
        error: "Failed to load registrations. Ensure event_participants has review_status, registration_status, organizer_notes, reviewed_at, reviewer_id.",
        details: queryError instanceof Error ? queryError.message : String(queryError),
      }, { status: 500 });
    }

    const eventResult = await supabase
      .from("events")
      .select("start_time, geofence_late_checkin_threshold_minutes")
      .eq("event_id", eventIdNumber)
      .maybeSingle();

    const eventStart = eventResult.data?.start_time || null;
    const lateThreshold = Number(eventResult.data?.geofence_late_checkin_threshold_minutes || 15);

    const participantIds = Array.from(new Set((rows || [])
      .map((r) => r.participant_id)
      .filter((id) => Number.isInteger(id))));

    const participantsById = {};
    if (participantIds.length > 0) {
      const { data: participants } = await supabase
        .from("participants")
        .select(PARTICIPANT_COLUMNS)
        .in("participant_id", participantIds);

      (participants || []).forEach((row) => {
        participantsById[Number(row.participant_id)] = row;
      });
    }

    let attendanceByParticipant = {};
    if (participantIds.length > 0) {
      const { data: attendanceRecords } = await supabase
        .from("attendance")
        .select("participant_id, event_id, check_in_time, check_out_time, verified")
        .in("participant_id", participantIds)
        .eq("event_id", eventIdNumber);

      for (const pid of participantIds) {
        const logs = (attendanceRecords || []).filter((row) => row.participant_id === pid);
        const totalEvents = logs.length;
        const verifiedCount = logs.filter((log) => log.verified).length;
        const attendanceRate = totalEvents > 0 ? Math.round((verifiedCount / totalEvents) * 100) : 0;

        let lateCount = 0;
        if (eventStart) {
          const [hours, minutes] = String(eventStart).split(":").map(Number);
          const eventStartDate = new Date();
          eventStartDate.setHours(hours || 0, minutes || 0, 0, 0);
          const lateCutoff = new Date(eventStartDate.getTime() + lateThreshold * 60 * 1000);

          for (const log of logs) {
            if (!log.check_in_time) continue;
            const checkInTime = new Date(log.check_in_time);
            if (checkInTime > lateCutoff) {
              lateCount += 1;
            }
          }
        }

        attendanceByParticipant[pid] = {
          attendanceRate,
          totalEventsAttended: verifiedCount,
          totalEventsRegistered: totalEvents,
          absences: Math.max(0, totalEvents - verifiedCount),
          lateCheckIns: lateCount,
        };
      }
    }

    const normalized = (rows || [])
      .filter((reg) => participantsById[reg.participant_id] !== undefined)
      .map((reg) => {
        const participant = participantsById[reg.participant_id] || {};
        const cluster = attendanceByParticipant[reg.participant_id] || null;

        return {
          id: reg.id,
          eventId: reg.event_id,
          participantId: reg.participant_id,
          reviewStatus: reg.review_status,
          organizerNotes: reg.organizer_notes,
          reviewedAt: reg.reviewed_at,
          registrationStatus: reg.registration_status,
          registeredAt: reg.created_at,
          name: participant.name || "Unknown",
          email: participant.email || null,
          rfid: participant.rfid || null,
          performanceScore: Number.isFinite(reg.performanceScore) ? Math.round(reg.performanceScore) : null,
          metrics: cluster,
          lateThreshold,
          lateCount: cluster?.lateCheckIns || 0,
          isFrequentlyLate: (cluster?.lateCheckIns || 0) >= lateThreshold,
        };
      });

    return NextResponse.json({
      eventId,
      total: normalized.length,
      pending: normalized.filter((item) => item.reviewStatus === "pending").length,
      registrations: normalized,
    });
  } catch (error) {
    console.error("[registration-review] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { eventId, participantId, action, organizerNotes } = body || {};

    if (!eventId || !participantId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, participantId, and action are required." },
        { status: 400 }
      );
    }

    if (!["accepted", "declined"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be either 'accepted' or 'declined'." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    try {
      const { data, error } = await supabase
        .from("event_participants")
        .update({
          review_status: action,
          organizer_notes: organizerNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("event_id", Number(eventId))
        .eq("participant_id", Number(participantId))
        .select(EVENT_PARTICIPANT_COLUMNS);

      if (error) {
        console.error("[registration-review] Database error:", error);
        if (isColumnMissingError(error)) {
          return NextResponse.json(
            {
              error: "Database migration required.",
              details: "Run supabase/performance-registrations-schema.sql in your Supabase SQL Editor, then restart `npm run dev`.",
              raw: error.message || "",
            },
            { status: 500 }
          );
        }
        return NextResponse.json({ error: "Failed to update registration status.", details: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: "Registration not found for the specified event and participant." },
          { status: 404 }
        );
      }

      const updated = data[0];
      const participant = (await supabase
        .from("participants")
        .select(PARTICIPANT_COLUMNS)
        .eq("participant_id", updated.participant_id)
        .maybeSingle()).data || {};

      return NextResponse.json({
        ok: true,
        eventId: updated.event_id,
        participantId: updated.participant_id,
        action,
        participantName: participant.name || "Participant",
        participantEmail: participant.email || null,
        reviewStatus: updated.review_status,
        organizerNotes: updated.organizer_notes,
      });
    } catch (queryError) {
      const message = String(queryError.message || "");
      if (isColumnMissingError(queryError)) {
        return NextResponse.json(
          {
            error: "Database migration required.",
            details: "Run supabase/performance-registrations-schema.sql in your Supabase SQL Editor, then restart `npm run dev`.",
            raw: message,
          },
          { status: 500 }
        );
      }
      throw queryError;
    }
  } catch (error) {
    console.error("[registration-review] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
