create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references auth.users not null,
  event_name text not null,
  event_type text not null,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  venue_name text not null,
  full_address text,
  expected_attendance integer,
  services jsonb default '{"rfid":false,"geofencing":false,"facialRecognition":false}',
  notes text,
  estimated_scope integer,
  status text default 'pending_approval',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
