# EventFlow Database Setup Guide

## Supabase Configuration

Your EventFlow project has been integrated with Supabase. The following environment variables are already configured in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable key

## Required Database Tables & Schema

Create the following tables in your Supabase project:

### 1. `clients` table (Organizations)
```sql
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text not null,
  contact_name text not null,
  contact_phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

### 2. `events` table
```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  type text not null,
  expected_attendance integer,
  event_date date,
  start_time time,
  end_time time,
  venue_name text,
  full_address text,
  services jsonb default '{"rfid":false,"geofencing":false,"facialRecognition":false}',
  notes text,
  estimated_scope integer,
  status text default 'pending_approval',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

### 3. `participants` table
```sql
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text not null,
  face_embedding_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 4. `attendance` table
```sql
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  verification_method text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

### 5. `attendance_report` table
```sql
create table public.attendance_report (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  total_expected integer,
  total_attended integer,
  attendance_rate numeric,
  generated_at timestamp with time zone default timezone('utc'::text, now())
);
```

### 6. `face_embeddings` table
```sql
create table public.face_embeddings (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  embedding vector(512),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(participant_id)
);
```

### 7. `event_clients` table (Junction table for many-to-many relationships)
```sql
create table public.event_clients (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  role text default 'organizer',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(event_id, client_id)
);
```

## Data Flow

### Hiring Details Form Submission
When a user submits the hiring details form:

1. **Client (Organization) is created** in the `clients` table with:
   - Organization name
   - Contact email, name, phone

2. **Event is created** in the `events` table with:
   - Event name, type, date, time
   - Venue information
   - Expected attendance
   - Services (RFID, Geofencing, Facial Recognition) as JSON
   - Status: `pending_approval` (admin must approve)
   - Estimated scope/cost

3. **Services JSON structure**:
   ```json
   {
     "rfid": true,
     "geofencing": false,
     "facialRecognition": true
   }
   ```

## Supabase Client Usage

### Server-Side (Server Components)
```typescript
import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from('events').select()
}
```

### Client-Side (Client Components)
```typescript
import { createClient } from '@/utils/supabase/client'

export default function Page() {
  const supabase = createClient()
  
  const handleInsert = async () => {
    await supabase.from('events').insert([{ ... }])
  }
}
```

### Middleware
```typescript
import { createClient } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = createClient(request)
  return response
}
```

## Security Policies

Implement Row Level Security (RLS) policies in Supabase:

1. **Clients** - Allow users to view/edit only their own organization
2. **Events** - Allow users to view/edit events for their organization
3. **Participants** - Allow participants to view only their own data
4. **Attendance** - Allow organizations to view attendance for their events

## Admin Portal Features

The admin portal will:
- View all pending event approvals
- Approve or reject event requests
- Edit event configurations
- Monitor system usage

## Next Steps

1. Create the tables in your Supabase project using the SQL above
2. Enable RLS on all tables
3. Set up authentication (Google, GitHub, etc.)
4. Update the admin login page to authenticate admins
5. Create admin dashboard for event approval workflow
