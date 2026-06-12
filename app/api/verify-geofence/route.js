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
    const { eventId, latitude, longitude, mode = "checkin" } = body || {};

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
      .select("event_id, latitude, longitude, geofence_radius, with_Geo, venue_name, event_date, start_time, end_time, geofence_early_checkin_allowed, geofence_late_checkin_allowed, geofence_early_checkout_allowed, geofence_late_checkout_allowed")
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
    const insideGeofence = distance <= radius;

    const isCheckout = mode === "checkout";
    const now = new Date();
    const eventStart = new Date(`${event.event_date}T${event.start_time || "00:00"}`);
    const eventEnd = event.end_time ? new Date(`${event.event_date}T${event.end_time}`) : null;

    let timeAllowed = true;
    let timeMessage = "";

    if (isCheckout) {
      const earlyWindow = Number(event.geofence_early_checkout_allowed || 0);
      const lateWindow = Number(event.geofence_late_checkout_allowed || 0);

      if (!eventEnd) {
        timeAllowed = true;
        timeMessage = "No event end time configured; checkout time window is open.";
      } else {
        const checkoutStart = new Date(eventEnd.getTime() - earlyWindow * 60 * 1000);
        const checkoutEnd = new Date(eventEnd.getTime() + lateWindow * 60 * 1000);
        timeAllowed = now >= checkoutStart && now <= checkoutEnd;
        timeMessage = `Checkout window: ${checkoutStart.toLocaleTimeString()} - ${checkoutEnd.toLocaleTimeString()}. Now: ${now.toLocaleTimeString()}.`;
      }
    } else {
      const earlyWindow = Number(event.geofence_early_checkin_allowed || 0);
      const lateWindow = Number(event.geofence_late_checkin_allowed || 0);

      const checkinStart = new Date(eventStart.getTime() - earlyWindow * 60 * 1000);
      const checkinEnd = eventEnd
        ? new Date(eventEnd.getTime() + lateWindow * 60 * 1000)
        : new Date(eventStart.getTime() + lateWindow * 60 * 1000);
      timeAllowed = now >= checkinStart && now <= checkinEnd;
      timeMessage = `Check-in window: ${checkinStart.toLocaleTimeString()} - ${checkinEnd.toLocaleTimeString()}. Now: ${now.toLocaleTimeString()}.`;
    }

    const allowed = insideGeofence && timeAllowed;

    return NextResponse.json({
      eventId: eventIdNumber,
      withGeo: true,
      mode,
      allowed,
      insideGeofence,
      timeAllowed,
      distanceMeters: Math.round(distance),
      radiusMeters: radius,
      venueName: event.venue_name || null,
      message: allowed
        ? `${isCheckout ? "Checkout" : "Check-in"} allowed (${Math.round(distance)}m from venue, within ${radius}m). ${timeMessage}`
        : `${isCheckout ? "Checkout" : "Check-in"} blocked. ${!insideGeofence ? `You are outside the geofence (${Math.round(distance)}m from venue, must be within ${radius}m). ` : ""}${!timeAllowed ? timeMessage : ""}`.trim(),
    });
  } catch (error) {
    console.error("[verify-geofence] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
