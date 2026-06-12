BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS geofence_late_checkin_threshold_minutes integer DEFAULT 15;

COMMIT;
