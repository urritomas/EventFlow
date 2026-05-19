# EventFlow Backend Integration Guide

## Overview

Your EventFlow application has been successfully integrated with Supabase. The following components are now connected:

1. **Supabase Server Client** (`utils/supabase/server.ts`) - For Server Components
2. **Supabase Browser Client** (`utils/supabase/client.ts`) - For Client Components
3. **Supabase Middleware** (`utils/supabase/middleware.ts`) - For request handling
4. **Hiring Details Form** (`app/hiringDetails/page.js`) - Submits to `clients` and `events` tables
5. **Login Page** (`app/login/page.js`) - Authenticates against `clients` and `participants` tables

## Architecture

### Client-Side Integration

All form pages use the browser Supabase client for direct database operations:

```typescript
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
```

This allows Client Components to:
- Insert event requests
- Query organization credentials
- Create participant accounts
- Show real-time feedback during submission

### Server-Side Integration

Server Components can use the server client:

```typescript
import { createClient } from "@/utils/supabase/server";

const supabase = await createClient();
const { data } = await supabase.from("events").select();
```

## Form Submission Flow

### 1. Hiring Details Form (`app/hiringDetails/page.js`)

**Submission Process:**
1. User fills out event request form
2. Click "Request a proposal" button
3. Three-step insert operation:
   - **Step 1:** Create client (organization) record if new:
     ```javascript
     const { data: clientData, error: clientError } = await supabase
       .from("clients")
       .insert([{
         name: formState.organization,
         contact_email: formState.email,
         contact_name: formState.fullName,
         contact_phone: formState.phone,
         subscription_plan: 'starter',
         status: 'active'
       }])
       .select();
     ```
   - **Step 2:** Create login record for organization:
     ```javascript
     const { error: loginError } = await supabase
       .from("logins")
       .insert([{
         email: formState.email,
         login_type: 'organization',
         linked_entity_id: clientData[0].id,
         linked_entity_type: 'client',
         is_active: true
       }])
       .select();
     ```
   - **Step 3:** Create event record linked to client:
     ```javascript
     await supabase.from("events").insert([{
       client_id: clientId,
       name: eventName,
       type: eventType,
       expected_attendance: attendance,
       event_date: date,
       start_time: startTime,
       end_time: endTime,
       venue_name: venue,
       full_address: address,
       services: {
         rfid: Boolean,
         geofencing: Boolean,
         facialRecognition: Boolean
       },
       notes: notes,
       estimated_scope: calculatedCost,
       status: "pending_approval"
     }])
     ```

**Success Response:**
- Form clears
- Green success message shows: "✓ Request submitted successfully! We'll review and contact you soon."

**Error Handling:**
- Red error message displays with error details
- Form retains user input for correction
- Submit button returns to normal state

**Database Tables Used:**
- `clients` - Organizations/companies
- `events` - Event requests
- `logins` - Organization login credentials

### 2. Login Page (`app/login/page.js`)

Three separate login flows with Supabase integration using the unified `logins` table:

#### Organization Login
**Form Fields:**
- Organization Name
- Organization Email
- Password

**Process:**
1. Query `logins` table by email: `email: formState.orgEmail, login_type: 'organization'`
2. If found: Verify password hash and fetch linked client data
3. If not found: Show "Organization not found" error
4. On success: Redirect to `/dashboard/organization`

**Database Queries:**
```javascript
// Check if organization login exists
const { data: loginData } = await supabase
  .from("logins")
  .select("*, clients(*)")
  .eq("email", formState.orgEmail)
  .eq("login_type", "organization")
  .single();

// If login exists, get full organization details
if (loginData) {
  const orgId = loginData.linked_entity_id;
  const { data: orgData } = await supabase
    .from("clients")
    .select("*")
    .eq("id", orgId)
    .single();
}
```

#### Personal Login (Participant)
**Form Fields:**
- First Name
- Email
- Password

**Process:**
1. Query `logins` table by email: `email: formState.personalEmail, login_type: 'personal'`
2. If not found: Create new participant AND new login record
3. If found: Authenticate existing participant
4. On success: Redirect to `/dashboard/participant`

**Database Operations:**
```javascript
// Check if participant login exists
const { data: loginData } = await supabase
  .from("logins")
  .select("*")
  .eq("email", formState.personalEmail)
  .eq("login_type", "personal")
  .single();

if (!loginData) {
  // Create new participant
  const { data: newParticipant } = await supabase
    .from("participants")
    .insert([{
      email: formState.personalEmail,
      first_name: formState.firstName,
      enrollment_status: 'pending'
    }])
    .select()
    .single();

  // Create login record for participant
  const { error: loginError } = await supabase
    .from("logins")
    .insert([{
      email: formState.personalEmail,
      login_type: 'personal',
      linked_entity_id: newParticipant.id,
      linked_entity_type: 'participant',
      is_active: true
    }])
    .select();
}
```

#### Admin Login
**Form Fields:**
- Admin Email
- Master Password
- Admin Code

**Process:**
1. Query `logins` table: `email: formState.adminEmail, login_type: 'admin'`
2. Verify admin credentials against `admin_users` table
3. Check if email exists in `admin_users` with active status
4. On success: Redirect to `/dashboard/admin`

**Database Queries:**
```javascript
// Check if admin login exists
const { data: adminData } = await supabase
  .from("admin_users")
  .select("id, email, role, is_active")
  .eq("email", formState.adminEmail)
  .eq("is_active", true)
  .single();

if (adminData) {
  // Admin authenticated - check login table
  const { data: loginData } = await supabase
    .from("logins")
    .select("*")
    .eq("email", formState.adminEmail)
    .eq("login_type", "admin")
    .single();

  // Update last login
  await supabase
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", adminData.id);
}
```

---

## Database Schema

### Core Tables

#### `clients` table (Organizations)
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  subscription_plan TEXT DEFAULT 'starter',
  api_key TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

**Used By:**
- Hiring Details form (insert)
- Organization login (query via logins table)
- Event management dashboard

---

#### `events` table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  expected_attendance INTEGER,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  venue_name TEXT,
  full_address TEXT,
  services JSONB,
  notes TEXT,
  estimated_scope INTEGER,
  status TEXT DEFAULT 'pending_approval',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

**Used By:**
- Hiring Details form (insert)
- Admin dashboard (query, update)
- Organization dashboard (query their events)

**Services JSON Structure:**
```json
{
  "rfid": true,
  "geofencing": false,
  "facialRecognition": true
}
```

---

#### `participants` table (Individual Attendees)
```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  enrollment_status TEXT DEFAULT 'pending',
  biometric_enrollment_date TIMESTAMP,
  face_embedding_id UUID REFERENCES face_embeddings(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Used By:**
- Personal login (query/insert via logins table)
- Attendance tracking
- Event registration (via event_participants)
- Facial recognition enrollment

---

### Authentication Tables

#### `logins` table (Unified Login Management)
```sql
CREATE TABLE logins (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  login_type TEXT NOT NULL,
  linked_entity_id UUID,
  linked_entity_type TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

**Login Types:**
- `'organization'` - References a `clients` record
- `'personal'` - References a `participants` record
- `'admin'` - References an `admin_users` record

**Used By:**
- Organization Login (query by email + login_type)
- Personal Login (query by email + login_type)
- Admin Login (query by email + login_type)
- Account security (login_attempts, locked_until)

---

#### `admin_users` table (Administrator Accounts)
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'moderator',
  permissions TEXT[] DEFAULT array['view_events', 'view_organizations'],
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

**Roles:**
- `'super_admin'` - Full system access
- `'admin'` - Event approval and organization management
- `'moderator'` - Limited event viewing and reporting

**Used By:**
- Admin Login verification
- Admin dashboard authorization
- Event approval workflow

---

### Relationship Tables

#### `event_participants` table (Junction Table)
```sql
CREATE TABLE event_participants (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  participant_id UUID REFERENCES participants(id),
  registration_status TEXT DEFAULT 'registered',
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, participant_id)
);
```

**Used By:**
- Event registration
- Attendance tracking
- Participant event history

---

### Supporting Tables (Already Exist in Your DB)

#### `face_embeddings` table
- Stores facial recognition vector embeddings
- Linked to participants for biometric matching

#### `attendance_logs` table
- Records check-in/check-out events
- Tracks verification method (RFID, facial, geofencing, manual)

#### `system_verification` table
- Tracks verification methods and their status

---

## Current Implementation Status

### ✅ Completed

- [x] Supabase client configuration (server, client, middleware)
- [x] Hiring details form submits to `clients` and `events` tables
- [x] Login form queries three separate login types
- [x] Participant auto-registration on first login
- [x] Real-time success/error feedback in forms
- [x] Loading states during submission
- [x] Form reset after successful submission
- [x] Environment variables configured in `.env.local`
- [x] Unified `logins` table for all authentication types
- [x] SQL migration scripts for database updates

### ⚠️ Partially Complete

- ⚠️ Admin authentication (basic implementation, needs database setup)
- ⚠️ Password validation (currently not checking password strength)
- ⚠️ Organization updates (can only create, not update existing)
- ⚠️ Database schema migration (scripts provided, awaiting execution)

### ❌ Not Yet Implemented

- ❌ Database migration execution (run SQL scripts in Supabase)
- ❌ Row Level Security (RLS) policies on tables
- ❌ Password hashing (bcrypt or similar)
- ❌ Proper authentication & authorization middleware
- ❌ Admin dashboard (`/dashboard/admin`)
- ❌ Organization dashboard (`/dashboard/organization`)
- ❌ Participant dashboard (`/dashboard/participant`)
- ❌ Email notifications on event approval
- ❌ Attendance tracking with RFID/Geofencing/Facial recognition
- ❌ Certificate generation
- ❌ Login attempt rate limiting

---

## Next Steps

### Phase 1: Database Setup & Security ⚡ START HERE
1. **Run migration scripts** in SUPABASE_SETUP.md (Step 1-4)
   - Modify existing tables (clients, events, participants)
   - Create new tables (logins, admin_users, event_participants)
   - Enable RLS and create policies
2. **Add admin user** to `admin_users` table for testing
3. **Test login flows** against new `logins` table
4. **Implement password hashing** (use bcrypt)
5. **Add form validation** (email format, required fields)

### Phase 2: Update Form Submissions
1. Update hiring details form to create login record
2. Update login forms to use `logins` table queries
3. Add password hashing for new accounts
4. Test all three login flows

### Phase 3: Build Admin Dashboard
1. Create `/dashboard/admin` page
2. Query pending event requests from `events` table
3. Implement approve/reject functionality
4. Add event modification interface
5. Show system metrics and statistics

### Phase 4: Build Organization Dashboard
1. Create `/dashboard/organization` page
2. List organization's events (via `client_id`)
3. Show attendance reports
4. Display team members
5. Generate certificates
4. Generate certificates
5. Manage event settings

### Phase 4: Build Participant Dashboard
1. Create `/dashboard/participant` page
2. List registered events
3. Show attendance history
4. Allow facial biometric enrollment
5. Download certificates

### Phase 5: Implement Full Features
1. RFID scanning system
2. Geofencing validation
3. Facial recognition enrollment and verification
4. Attendance reports and analytics
5. Email notifications

---

## Testing Your Implementation

### Test Hiring Details Form
1. Navigate to `/hiringDetails`
2. Fill in all required fields
3. Select services (RFID, Geofencing, etc.)
4. Click "Request a proposal"
5. Check Supabase database for new `clients` and `events` records

### Test Organization Login
1. Navigate to `/login`
2. Stay on "Organization Login" tab
3. Enter organization email (from a submitted form)
4. Enter any password
5. Should show success message and redirect

### Test Personal Login
1. Navigate to `/login`
2. Switch to "Personal Login" tab
3. Enter email and first name
4. Click "Sign in as Participant"
5. Check Supabase for new `participants` record

---

## Supabase Console Access

1. Go to [supabase.com](https://supabase.com)
2. Sign in with your account
3. Select your EventFlow project
4. Use the SQL Editor to run queries:
   ```sql
   SELECT * FROM clients;
   SELECT * FROM events;
   SELECT * FROM participants;
   ```

---

## Environment Variables

Required in `.env.local` (already configured):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_public_xxxxx
```

Never commit these values to version control. Keep them in `.env.local` only.

---

## Debugging

### View Supabase Logs
1. Go to Supabase Dashboard > Logs
2. Check for insert/select operations
3. Look for error messages with details

### Browser Console
1. Open DevTools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab for API requests to Supabase

### Test Queries
In Supabase SQL Editor:
```sql
-- Check if clients table exists
SELECT * FROM clients LIMIT 10;

-- Check recent events
SELECT * FROM events ORDER BY created_at DESC LIMIT 10;

-- Check participants
SELECT * FROM participants;
```

---

## Security Considerations

🚨 **Current Limitations:**
- Passwords are not hashed (use environment-based secrets instead)
- No authentication middleware enforcing login
- RLS policies not implemented
- Admin verification is basic

✅ **Recommended Improvements:**
1. Implement Supabase Auth with built-in password hashing
2. Use RLS policies to restrict data access
3. Add middleware to check user authentication
4. Use secure admin role verification
5. Hash sensitive data before storing

---

## Support Files

- **SUPABASE_SETUP.md** - Complete database schema SQL
- **hiringDetails/page.js** - Form with Supabase integration
- **login/page.js** - Three login modes with Supabase queries
