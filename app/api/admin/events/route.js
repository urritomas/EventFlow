import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  // Do not throw — return a helpful error from the POST handler instead
  console.error('Supabase URL or service role key not configured');
}

const supabase = createClient(supabaseUrl || '', serviceKey || '');

async function detectIdKey() {
  try {
    const { data, error } = await supabase.from('events').select('*').limit(1).maybeSingle();
    if (error) return 'event_id';
    if (!data) return 'event_id';
    if (Object.prototype.hasOwnProperty.call(data, 'event_id')) return 'event_id';
    if (Object.prototype.hasOwnProperty.call(data, 'id')) return 'id';
    return 'event_id';
  } catch (e) {
    console.error('detectIdKey error', e);
    return 'event_id';
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
