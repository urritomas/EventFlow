-- Link events to the organization login that created them.
-- Run in Supabase SQL editor before deploying org-scoped Google auth.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS org_login_id integer REFERENCES public.login_details(login_id);

CREATE INDEX IF NOT EXISTS events_org_login_id_idx ON public.events (org_login_id);

-- Optional: track how the account signs in (password vs google).
ALTER TABLE public.login_details
  ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'password';

-- Allow Google-only accounts without a password hash.
ALTER TABLE public.login_details
  ALTER COLUMN hashed_password DROP NOT NULL;

-- Org accounts must be approved by admin before they can log in.
ALTER TABLE public.login_details
  ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'approved';

-- New org sign-ups set account_status to 'pending' in application code.
-- Existing rows keep default 'approved' so current orgs are not locked out.

