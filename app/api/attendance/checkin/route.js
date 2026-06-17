import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase URL or service role key not configured');
}

const supabase = createClient(supabaseUrl || '', serviceKey || '');

const combineMethods = (existing, incoming) => {
  const base = (existing || '').toString();
  const next = (incoming || '').toString();
  if (!base) return next;
  if (!next) return base;
  if (base === next) return base;

  const set = new Set([...base.split('+'), ...next.split('+')].filter(Boolean));
  const normalized = Array.from(set).sort();
  if (normalized.length === 1) return normalized[0];
  return normalized.join('+');
};

const jsonResponse = (statusCode, payload) => {
  try {
    return NextResponse.json(payload, { status: statusCode });
  } catch (jsonErr) {
    console.error('[attendance/checkin] JSON response error:', jsonErr);
    return new Response(JSON.stringify(payload), {
      status: statusCode,
      headers: { 'content-type': 'application/json' },
    });
  }
};

export async function POST(req) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse(500, { ok: false, error: 'Server misconfigured.' });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error('[attendance/checkin] Body parse error:', parseErr);
      return jsonResponse(400, { ok: false, error: 'Invalid JSON body.' });
    }

    const { eventId, participantId, method } = body || {};

    if (!eventId || !participantId) {
      return jsonResponse(400, { ok: false, error: 'eventId and participantId are required.' });
    }

    const now = new Date().toISOString();
    const verificationMethod = method || 'manual';

    const { data: existing, error: existingError } = await supabase
      .from('attendance')
      .select('attendance_id, check_in_time, verification_method')
      .eq('event_id', eventId)
      .eq('participant_id', participantId)
      .is('check_out_time', null)
      .maybeSingle();

    if (existingError) {
      console.error('[attendance/checkin] Existing check error:', existingError);
      return jsonResponse(500, { ok: false, error: 'Failed to check existing attendance.', details: existingError.message });
    }

    if (existing) {
      const merged = combineMethods(existing.verification_method, verificationMethod);
      const sameMethod = merged === existing.verification_method;

      if (sameMethod) {
        return jsonResponse(409, {
          ok: false,
          error: 'Already checked in with this method.',
          data: existing,
        });
      }

      const { data: updated, error: updateError } = await supabase
        .from('attendance')
        .update({
          verification_method: merged,
          check_in_time: existing.check_in_time,
        })
        .eq('attendance_id', existing.attendance_id)
        .select('attendance_id, check_in_time, verification_method')
        .single();

      if (updateError) {
        console.error('[attendance/checkin] Merge update error:', updateError);
        return jsonResponse(500, { ok: false, error: 'Failed to merge check-in methods.', details: updateError.message });
      }

      return jsonResponse(200, { ok: true, data: updated });
    }

    let inserted = null;
    let insertError = null;

    try {
      const result = await supabase
        .from('attendance')
        .insert({
          event_id: eventId,
          participant_id: participantId,
          check_in_time: now,
          verified: true,
          verification_method: verificationMethod,
        })
        .select('attendance_id, check_in_time, verification_method');

      inserted = result.data;
      insertError = result.error;
    } catch (insertErr) {
      console.error('[attendance/checkin] Insert exception:', insertErr);
      return jsonResponse(500, { ok: false, error: 'Exception while inserting attendance record.', details: String(insertErr) });
    }

    if (insertError) {
      console.error('[attendance/checkin] Insert error:', insertError);
      return jsonResponse(500, {
        ok: false,
        error: 'Failed to record check-in.',
        details: insertError.message || insertError.details || JSON.stringify(insertError),
      });
    }

    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!row) {
      console.error('[attendance/checkin] Insert returned no row');
      return jsonResponse(500, { ok: false, error: 'Check-in insert did not return a record.' });
    }

    return jsonResponse(200, { ok: true, data: row });
  } catch (err) {
    console.error('[attendance/checkin] Unexpected error:', err);
    return jsonResponse(500, { ok: false, error: 'Unexpected server error.', details: err?.message || String(err) });
  }
}

export async function PUT(req) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse(500, { ok: false, error: 'Server misconfigured.' });
    }

    const body = await req.json();
    const { eventId, participantId, rfid } = body;

    if (!eventId || !participantId) {
      return jsonResponse(400, { ok: false, error: 'eventId and participantId are required.' });
    }

    const now = new Date().toISOString();

    const { data: openAttendance, error: findError } = await supabase
      .from('attendance')
      .select('attendance_id, check_in_time, verification_method, participants(rfid)')
      .eq('event_id', eventId)
      .eq('participant_id', participantId)
      .is('check_out_time', null)
      .maybeSingle();

    if (findError) {
      console.error('[attendance/checkout] Find error:', findError);
      return jsonResponse(500, { ok: false, error: 'Failed to find check-in record.', details: findError.message });
    }

    if (!openAttendance) {
      return jsonResponse(404, {
        ok: false,
        error: 'No active check-in found for this participant.',
      });
    }

    if (rfid !== undefined && rfid !== null) {
      const participantRfid = openAttendance.participants?.rfid;
      if (participantRfid && String(participantRfid).trim() !== String(rfid).trim()) {
        return jsonResponse(403, {
          ok: false,
          error: 'RFID mismatch. This card does not match the checked-in user.',
        });
      }
    }

    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_out_time: now,
        check_out_verified: true,
        check_out_method: rfid ? 'rfid' : 'manual',
      })
      .eq('attendance_id', openAttendance.attendance_id)
      .select('attendance_id, check_out_time')
      .single();

    if (error) {
      console.error('[attendance/checkout] Update error:', error);
      return jsonResponse(500, { ok: false, error: 'Failed to record check-out.', details: error.message });
    }

    return jsonResponse(200, { ok: true, data });
  } catch (err) {
    console.error('[attendance/checkout] Unexpected error:', err);
    return jsonResponse(500, { ok: false, error: 'Unexpected server error.', details: err?.message || String(err) });
  }
}
