# Database Migration Checklist

Complete this checklist to migrate your existing EventFlow database with the new tables and features.

## 📋 Pre-Migration

- [ ] Backup your Supabase database
- [ ] Note your Supabase project URL and credentials
- [ ] Have access to Supabase SQL Editor
- [ ] Read through SUPABASE_SETUP.md migration scripts

---

## 🔧 Step 1: Modify Existing Tables

In your Supabase SQL Editor, run these migration scripts:

### A. Add fields to `clients` table
```sql
ALTER TABLE public.clients
ADD COLUMN contact_phone text,
ADD COLUMN subscription_plan text DEFAULT 'starter',
ADD COLUMN api_key text,
ADD COLUMN status text DEFAULT 'active';

CREATE INDEX idx_clients_email ON public.clients(contact_email);
```
- [ ] Executed

### B. Update `events` table
```sql
ALTER TABLE public.events
DROP COLUMN IF EXISTS organization_name,
DROP COLUMN IF EXISTS contact_name,
DROP COLUMN IF EXISTS contact_email;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS event_type text,
ADD COLUMN IF NOT EXISTS start_time time,
ADD COLUMN IF NOT EXISTS end_time time,
ADD COLUMN IF NOT EXISTS venue_name text,
ADD COLUMN IF NOT EXISTS full_address text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS estimated_scope integer,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_approval';

CREATE INDEX idx_events_client_id ON public.events(client_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_date ON public.events(event_date);
```
- [ ] Executed

### C. Update `participants` table
```sql
ALTER TABLE public.participants
DROP COLUMN IF EXISTS event_id;

ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS enrollment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS biometric_enrollment_date timestamp;

CREATE INDEX idx_participants_email ON public.participants(email);
```
- [ ] Executed

---

## 🆕 Step 2: Create New Tables

### A. Create `event_participants` junction table
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

create index idx_event_participants_event on public.event_participants(event_id);
create index idx_event_participants_participant on public.event_participants(participant_id);
```
- [ ] Executed

### B. Create `logins` table (Unified Authentication)
```sql
create table public.logins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  login_type text not null,
  linked_entity_id uuid,
  linked_entity_type text,
  is_active boolean default true,
  last_login timestamp with time zone,
  login_attempts integer default 0,
  locked_until timestamp with time zone,
  email_verified boolean default false,
  email_verified_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_logins_email on public.logins(email);
create index idx_logins_type on public.logins(login_type);
create index idx_logins_entity on public.logins(linked_entity_id);
create index idx_logins_active on public.logins(is_active);
```
- [ ] Executed

### C. Create `admin_users` table
```sql
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text,
  last_name text,
  role text default 'moderator',
  permissions text[] default array['view_events', 'view_organizations'],
  is_active boolean default true,
  last_login timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_admin_users_email on public.admin_users(email);
```
- [ ] Executed

---

## 🔐 Step 3: Enable Row Level Security (Optional but Recommended)

```sql
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
```
- [ ] Executed

---

## ✅ Step 4: Add Test Data

### A. Create a test admin user
```sql
-- First, create a login entry for the admin
INSERT INTO public.logins (email, password_hash, login_type, is_active)
VALUES ('admin@eventflow.local', 'temp_password_hash', 'admin', true);

-- Get the login ID from the INSERT above, then create the admin user
INSERT INTO public.admin_users (email, first_name, last_name, role, is_active)
VALUES ('admin@eventflow.local', 'Admin', 'User', 'super_admin', true);
```
- [ ] Executed

### B. Verify your existing data still exists
```sql
SELECT COUNT(*) FROM public.clients;
SELECT COUNT(*) FROM public.events;
SELECT COUNT(*) FROM public.participants;
SELECT COUNT(*) FROM public.logins;
SELECT COUNT(*) FROM public.admin_users;
```
- [ ] Verified

---

## 🧪 Step 5: Test the Migrations

### A. Test Hiring Details Form
1. Navigate to http://localhost:3000/hiringDetails
2. Fill in all fields
3. Click "Request a proposal"
4. Check Supabase:
   - New `clients` record created
   - New `events` record created
   - New `logins` record created
- [ ] Working

### B. Test Organization Login
1. Navigate to http://localhost:3000/login
2. Stay on "Organization Login" tab
3. Enter email from submitted hiring form
4. Enter any password
5. Check for success message
- [ ] Working

### C. Test Personal Login
1. Navigate to http://localhost:3000/login
2. Switch to "Personal Login" tab
3. Enter new email
4. Enter first name
5. Click "Sign in as Participant"
6. Check Supabase for new `participants` and `logins` records
- [ ] Working

### D. Test Admin Login
1. Navigate to http://localhost:3000/login
2. Click hidden admin reveal (click "Need additional access?" 3+ times)
3. Enter admin email: admin@eventflow.local
4. Enter any password
5. Check for success message
- [ ] Working

---

## 🚀 What's Next

After completing migration:

1. **Update form submissions** to use the new logins table
2. **Implement password hashing** (bcrypt) for real passwords
3. **Build admin dashboard** at `/dashboard/admin`
4. **Build organization dashboard** at `/dashboard/organization`
5. **Build participant dashboard** at `/dashboard/participant`

See **BACKEND_INTEGRATION.md** for detailed implementation guides.

---

## 📞 Troubleshooting

### Error: "Table already exists"
- Your table already exists - skip that CREATE TABLE statement
- You can run ALTER statements multiple times safely

### Error: "Column already exists"
- The column already exists in your table
- Your migrations may be partially applied
- Use `DROP COLUMN IF EXISTS` to make it safe

### Error: "Foreign key constraint failed"
- Ensure referenced table exists first
- Run migrations in order (Step 1 → Step 2)
- Don't delete records with child references

### Forms not submitting data
- Check browser console for errors (F12)
- Verify environment variables in `.env.local`
- Ensure database tables exist with correct schema
- Check Supabase logs for SQL errors

### Login not working
- Verify `logins` table exists
- Check that email matches exactly (case-sensitive)
- Ensure `is_active` is true for the login record
- Verify `linked_entity_id` references correct table

---

## 📊 Database Structure Overview

```
clients (organizations)
  └─> events (event requests)
  └─> logins (organization login credentials)

participants (individuals)
  └─> logins (personal login credentials)
  └─> event_participants (junction table)
       └─> events (attended events)

admin_users (system administrators)
  └─> logins (admin login credentials)
```

---

## ✨ Summary

Once complete, your EventFlow database will support:

✅ Three separate login types (organization, personal, admin)
✅ Unified authentication table (`logins`)
✅ Event-to-participant relationships (`event_participants`)
✅ Administrator accounts with role-based permissions
✅ Proper indexes for fast queries
✅ Security-ready structure with RLS support
