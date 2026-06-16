import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase URL or service role key not configured');
}

const supabase = createClient(supabaseUrl || '', serviceKey || '');

async function detectIdKey() {
  try {
    const { data, error } = await supabase.from('events').select('*').limit(1).maybeSingle();
    if (error) return 'event_id';
    if (!data) return 'event_id';
    if (Object.prototype.hasOwnProperty.call(data, 'event_id')) return 'event_id';
    const cols = Object.keys(data);
    const candidate = cols.find(c => c.toLowerCase() === 'id');
    if (candidate) {
      const sample = await supabase.from('events').select(candidate).limit(1).maybeSingle();
      if (!sample.error && sample.data && Object.prototype.hasOwnProperty.call(sample.data, candidate)) return candidate;
    }
    return 'event_id';
  } catch (e) {
    console.error('detectIdKey error', e);
    return 'event_id';
  }
}

function normalizeEventRows(rows, idKey) {
  if (!Array.isArray(rows)) return rows;
  return rows.map(row => {
    if (idKey === 'id' && Object.prototype.hasOwnProperty.call(row, 'id')) {
      return { ...row, event_id: row.id };
    }
    return row;
  });
}

export async function GET(req) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase service role key or URL not configured on server' }, { status: 500 });
    }
    const idKey = await detectIdKey();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'pending-events') {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order(idKey === 'id' ? 'id' : 'event_id', { ascending: false });

      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }

      const normalized = normalizeEventRows(data || [], idKey);
      const pending = normalized
        .filter(e => !e.is_accepted)
        .map(e => ({
          id: e.event_id,
          name: e.event_name,
          organizer: e.event_type,
          date: e.event_date,
          participants: e.expected_attendance,
          is_accepted: e.is_accepted,
          org_login_id: e.org_login_id,
        }));

      return NextResponse.json({ data: pending });
    }

    if (action === 'public-events') {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_accepted', true)
        .eq('is_active', true)
        .order(idKey === 'id' ? 'id' : 'event_id', { ascending: true });

      if (error) {
        console.error('[Admin API] public-events error:', error);
        return NextResponse.json({ error }, { status: 500 });
      }

      const normalized = normalizeEventRows(data || [], idKey);
      return NextResponse.json({ data: normalized });
    }

    if (action === 'org-events') {
      const orgLoginId = req.headers.get('x-org-login-id');
      console.log('[Admin API] org-events request, orgLoginId header:', orgLoginId);
      let query = supabase.from('events').select('*');
      if (orgLoginId) {
        query = query.eq('org_login_id', parseInt(orgLoginId, 10));
      }
      const { data, error } = await query.order(idKey === 'id' ? 'id' : 'event_id', { ascending: false });
      const normalized = normalizeEventRows(data || [], idKey);
      return NextResponse.json({ data: normalized });
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order(idKey === 'id' ? 'id' : 'event_id', { ascending: false });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    const normalized = normalizeEventRows(data || [], idKey);
    return NextResponse.json({ data: normalized });
  } catch (err) {
    console.error('Admin events GET error', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase service role key or URL not configured on server' }, { status: 500 });
    }
    const body = await req.json();
    const { action, id, fields } = body;

    if (!action) return NextResponse.json({ error: 'missing action' }, { status: 400 });
    if (!id && action !== 'insert') return NextResponse.json({ error: 'missing id' }, { status: 400 });

    const idKey = await detectIdKey();

    if (action === 'delete') {
      const { error: attError } = await supabase.from('attendance').delete().eq('event_id', id);
      if (attError) console.error('Error deleting attendance:', attError);

      const { error: regError } = await supabase.from('event_participants').delete().eq('event_id', id);
      if (regError) console.error('Error deleting registrations:', regError);

      const { data, error } = await supabase.from('events').delete().eq(idKey, id).select();
      if (error) return NextResponse.json({ error }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'update') {
      if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'missing fields' }, { status: 400 });
      const { data, error } = await supabase.from('events').update(fields).eq(idKey, id).select();
      if (error) return NextResponse.json({ error }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (action === 'insert') {
      if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'missing fields' }, { status: 400 });
      const { data, error } = await supabase.from('events').insert([fields]).select();
      if (error) return NextResponse.json({ error }, { status: 500 });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Admin events API error', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
