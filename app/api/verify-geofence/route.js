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

function toRad(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { eventId, latitude, longitude } = body || {};

    if (!eventId || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, latitude, and longitude are required." },
        { status: 400 }
      );
    }

    const eventIdNumber = Number(eventId);
    const userLat = Number(latitude);
    const userLng = Number(longitude);

    if (!Number.isFinite(userLat) || !Number.isFinite(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
      return NextResponse.json({ error: "Invalid coordinates provided." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("event_id, latitude, longitude, geofence_radius, with_Geo, venue_name")
      .eq("event_id", eventIdNumber)
      .maybeSingle();

    if (eventError) {
      console.error("[verify-geofence] Event query error:", eventError);
      return NextResponse.json({ error: "Failed to load event location.", details: eventError.message }, { status: 500 });
    }

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (!event.with_Geo) {
      return NextResponse.json({
        eventId: eventIdNumber,
        withGeo: false,
        allowed: true,
        distanceMeters: null,
        radiusMeters: null,
        message: "Geofencing is disabled for this event. Check-in is allowed from any location.",
      });
    }

    const venueLat = Number(event.latitude);
    const venueLng = Number(event.longitude);
    const radius = Number(event.geofence_radius || 100);

    if (!Number.isFinite(venueLat) || !Number.isFinite(venueLng) || !Number.isFinite(radius)) {
      return NextResponse.json({ error: "Event geofence is not configured properly." }, { status: 500 });
    }

    const distance = haversineDistanceMeters(userLat, userLng, venueLat, venueLng);
    const allowed = distance <= radius;

    return NextResponse.json({
      eventId: eventIdNumber,
      withGeo: true,
      allowed,
      distanceMeters: Math.round(distance),
      radiusMeters: radius,
      venueName: event.venue_name || null,
      message: allowed
        ? `You are inside the geofence (${Math.round(distance)}m from venue, within ${radius}m).`
        : `You are outside the geofence (${Math.round(distance)}m from venue, must be within ${radius}m).`,
    });
  } catch (error) {
    console.error("[verify-geofence] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
