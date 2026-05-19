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
3. Two-step insert operation:
   - **Step 1:** Create client (organization) record if new:
     ```javascript
     await supabase.from("clients").insert([{
       name: organization,
       contact_email: email,
       contact_name: fullName,
       contact_phone: phone
     }])
     ```
   - **Step 2:** Create event record linked to client:
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

### 2. Login Page (`app/login/page.js`)

Three separate login flows with Supabase integration:

#### Organization Login
**Form Fields:**
- Organization Name
- Organization Email
- Password

**Process:**
1. Query `clients` table by email: `email: formState.orgEmail`
2. If found: User is authenticated (basic check in this version)
3. If not found: Show "Organization not found" error
4. On success: Redirect to `/dashboard/organization`

**Database Query:**
```javascript
const { data: orgData } = await supabase
  .from("clients")
  .select("id, name")
  .eq("contact_email", formState.orgEmail)
  .single();
```

#### Personal Login (Participant)
**Form Fields:**
- First Name
- Email
- Password

**Process:**
1. Query `participants` table by email
2. If not found: Create new participant record
3. If found: Authenticate existing participant
4. On success: Redirect to `/dashboard/participant`

**Database Operations:**
```javascript
// Check if participant exists
const { data: participantData } = await supabase
  .from("participants")
  .select("id")
  .eq("email", formState.personalEmail)
  .single();

// Create new if doesn't exist
if (!participantData) {
  const { data: newParticipant } = await supabase
    .from("participants")
    .insert([{
      email: formState.personalEmail,
      first_name: formState.firstName
    }])
    .select()
    .single();
}
```

#### Admin Login
**Form Fields:**
- Admin Email
- Master Password
- Admin Code

**Process:**
1. Verify admin credentials (basic implementation)
2. On success: Redirect to `/dashboard/admin`

**Status:** Currently basic verification; should be enhanced with proper admin table validation.

---

## Database Schema

### Required Tables

#### `clients` table
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

**Used By:**
- Hiring Details form (insert)
- Organization login (query)

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

**Services JSON Structure:**
```json
{
  "rfid": true,
  "geofencing": false,
  "facialRecognition": true
}
```

---

#### `participants` table
```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  face_embedding_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Used By:**
- Personal login (query/insert)
- Attendance tracking

---

## Current Implementation Status

### ✅ Completed

- [x] Supabase client configuration (server, client, middleware)
- [x] Hiring details form submits to `clients` and `events` tables
- [x] Login form queries `clients` and `participants` tables
- [x] Participant auto-registration on first login
- [x] Real-time success/error feedback in forms
- [x] Loading states during submission
- [x] Form reset after successful submission
- [x] Environment variables configured in `.env.local`

### ⚠️ Partially Complete

- ⚠️ Admin authentication (basic implementation, needs admin table)
- ⚠️ Password validation (currently not checking password strength)
- ⚠️ Organization updates (can only create, not update existing)

### ❌ Not Yet Implemented

- ❌ Row Level Security (RLS) policies on tables
- ❌ Proper authentication & authorization middleware
- ❌ Admin dashboard (`/dashboard/admin`)
- ❌ Organization dashboard (`/dashboard/organization`)
- ❌ Participant dashboard (`/dashboard/participant`)
- ❌ Email notifications on event approval
- ❌ Attendance tracking
- ❌ Facial recognition enrollment
- ❌ RFID/Geofencing validation
- ❌ Certificate generation
- ❌ Password hashing (using insecure passwords currently)

---

## Next Steps

### Phase 1: Stabilize Current Implementation
1. Create all required tables in Supabase
2. Add proper password hashing before storing
3. Implement RLS policies for data security
4. Add form validation (email format, required fields)

### Phase 2: Build Admin Dashboard
1. Create `/dashboard/admin` page
2. Query pending event requests
3. Implement approve/reject functionality
4. Add event modification interface
5. Show system metrics

### Phase 3: Build Organization Dashboard
1. Create `/dashboard/organization` page
2. List organization's events
3. Show attendance reports
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
