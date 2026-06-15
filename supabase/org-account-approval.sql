-- Org account approval: run this in Supabase SQL editor.

ALTER TABLE public.login_details
  ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'approved';

ALTER TABLE public.login_details
  ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'password';

ALTER TABLE public.login_details
  ALTER COLUMN hashed_password DROP NOT NULL;

-- Keep existing organization accounts usable; only new sign-ups start as pending in app code.
UPDATE public.login_details
SET account_status = 'approved'
WHERE login_type = 1 AND (account_status IS NULL OR account_status = '');
