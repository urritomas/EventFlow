BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS geofence_late_checkin_threshold_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS geofence_early_checkout_allowed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS geofence_late_checkout_allowed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS geofence_checkout_window integer DEFAULT 0;

COMMIT;
