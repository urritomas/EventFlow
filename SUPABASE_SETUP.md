# EventFlow Database Setup Guide

## Supabase Configuration

Your EventFlow project has been integrated with Supabase. The following environment variables are already configured in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable key

## Migration Scripts

Run these SQL statements in your Supabase project to update existing tables and add missing ones.

### Step 1: Modify Existing Tables

#### Alter `clients` table
```sql
-- Add missing fields to clients table
ALTER TABLE public.clients
ADD COLUMN contact_phone text,
ADD COLUMN subscription_plan text DEFAULT 'starter',
ADD COLUMN api_key text,
ADD COLUMN status text DEFAULT 'active';

-- Create index for faster lookups
CREATE INDEX idx_clients_email ON public.clients(contact_email);
```

#### Alter `events` table
```sql
-- Remove duplicate organization fields (use client_id instead)
ALTER TABLE public.events
DROP COLUMN IF EXISTS organization_name,
DROP COLUMN IF EXISTS contact_name,
DROP COLUMN IF EXISTS contact_email;

-- Add missing fields from hiring form
ALTER TABLE public.events
ADD COLUMN event_type text,
ADD COLUMN start_time time,
ADD COLUMN end_time time,
ADD COLUMN venue_name text,
ADD COLUMN full_address text,
ADD COLUMN notes text,
ADD COLUMN estimated_scope integer,
ADD COLUMN status text DEFAULT 'pending_approval';

-- Ensure expected_attendance exists
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS expected_attendance integer;

-- Create indexes for faster queries
CREATE INDEX idx_events_client_id ON public.events(client_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_date ON public.events(event_date);
```

#### Alter `participants` table
```sql
-- Remove event_id (participants attend multiple events)
ALTER TABLE public.participants
DROP COLUMN IF EXISTS event_id;

-- Add missing fields for personal login
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS enrollment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS biometric_enrollment_date timestamp;

-- Create index for faster lookups
CREATE INDEX idx_participants_email ON public.participants(email);
```

---

### Step 2: Create New Tables

#### Create `event_participants` junction table
```sql
create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  registration_status text default 'registered',
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(event_id, participant_id)
);

-- Create indexes
create index idx_event_participants_event on public.event_participants(event_id);
create index idx_event_participants_participant on public.event_participants(participant_id);
```

#### Create `logins` table (unified login management)
```sql
create table public.logins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  login_type text not null, -- 'organization', 'personal', 'admin'
  linked_entity_id uuid, -- references clients.id, participants.id, or admin_users.id
  linked_entity_type text, -- 'client', 'participant', 'admin'
  is_active boolean default true,
  last_login timestamp with time zone,
  login_attempts integer default 0,
  locked_until timestamp with time zone,
  email_verified boolean default false,
  email_verified_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create indexes for fast lookups
create index idx_logins_email on public.logins(email);
create index idx_logins_type on public.logins(login_type);
create index idx_logins_entity on public.logins(linked_entity_id);
create index idx_logins_active on public.logins(is_active);
```

**logins table breakdown:**
- `login_type`: 'organization', 'personal', or 'admin'
- `linked_entity_id`: ID of the associated client, participant, or admin user
- `linked_entity_type`: Type of entity ('client', 'participant', 'admin')
- `login_attempts`: Tracks failed attempts for security
- `locked_until`: Account lockout time after failed attempts

#### Create `admin_users` table
```sql
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text,
  last_name text,
  role text default 'moderator', -- 'super_admin', 'admin', 'moderator'
  permissions text[] default array['view_events', 'view_organizations'],
  is_active boolean default true,
  last_login timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create index for email lookup
create index idx_admin_users_email on public.admin_users(email);
```

---

### Step 3: Verify Existing Tables

Ensure these tables still exist and have all required fields:

#### `system_verification` table
```sql
-- Confirm this table exists
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'system_verification';
```

#### `face_embeddings` table
```sql
-- Confirm this table exists with all required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'face_embeddings';
```

#### `attendance_logs` table
```sql
-- Verify attendance_logs has proper structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'attendance_logs';
```

---

### Step 4: Enable Row Level Security (RLS)

Add these policies to protect data:

```sql
-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Create policies (customize based on your auth setup)
-- These are basic examples - adjust based on your Supabase Auth configuration

-- Clients can view their own data
CREATE POLICY "Clients can view own data" ON public.clients
  FOR SELECT USING (
    auth.uid() = (
      SELECT linked_entity_id FROM public.logins 
      WHERE email = auth.jwt() ->> 'email' 
      AND login_type = 'organization'
    )
  );

-- Participants can view their own data
CREATE POLICY "Participants can view own data" ON public.participants
  FOR SELECT USING (
    auth.uid() = (
      SELECT linked_entity_id FROM public.logins 
      WHERE email = auth.jwt() ->> 'email' 
      AND login_type = 'personal'
    )
  );

-- Admins can view all data
CREATE POLICY "Admins can view all data" ON public.logins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE email = auth.jwt() ->> 'email' 
      AND is_active = true
    )
  );
```

---

## Required Database Tables & Schema

Below are the complete table structures for reference:

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
