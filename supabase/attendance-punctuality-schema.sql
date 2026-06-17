-- Attendance Punctuality and Clustering Enhancement Migration
-- Run once inside your Supabase project SQL Editor.
-- This adds columns needed for proper punctuality and clustering calculations.

BEGIN;

-- Add similarity and late tracking to attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_in_similarity numeric(3, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS late_minutes numeric(5, 2) DEFAULT NULL;

-- Index for faster punctuality queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'attendance'
      AND indexname = 'idx_attendance_punctuality'
  ) THEN
    CREATE INDEX idx_attendance_punctuality
      ON public.attendance(participant_id, is_late, check_in_time);
  END IF;
END;
$$;

-- Create view for clustering performance metrics (optional, for analytics)
CREATE OR REPLACE VIEW public.vw_participant_performance AS
SELECT 
  p.participant_id,
  p.name,
  p.email,
  p.rfid,
  COUNT(ap.event_id) as total_events_registered,
  COUNT(a.attendance_id) as total_events_attended,
  COUNT(a.attendance_id) FILTER (WHERE a.verified = true) as verified_attendances,
  COUNT(a.attendance_id) FILTER (WHERE a.is_late = true) as late_checkins,
  AVG(a.late_minutes) as avg_late_minutes,
  ROUND(
    CASE 
      WHEN COUNT(ap.event_id) > 0 
      THEN (COUNT(a.attendance_id) FILTER (WHERE a.verified = true) * 100.0 / COUNT(ap.event_id))
      ELSE 0 
    END, 2
  ) as attendance_rate,
  ROUND(
    CASE 
      WHEN COUNT(a.attendance_id) > 0 
      THEN (1.0 - (COUNT(a.attendance_id) FILTER (WHERE a.is_late = true) * 1.0 / COUNT(a.attendance_id))) 
      ELSE 0.5 
    END, 4
  ) as punctuality_score
FROM public.participants p
LEFT JOIN public.event_participants ap ON p.participant_id = ap.participant_id
LEFT JOIN public.attendance a ON p.participant_id = a.participant_id
GROUP BY p.participant_id, p.name, p.email, p.rfid;

COMMIT;

-- Usage notes:
-- 1. The is_late column should be set by the check-in/out API when recording attendance
-- 2. For geofenced events, late is defined as check-in > 15 minutes after event start_time
-- 3. The check_in_similarity stores face recognition match confidence (0.0-1.0)
-- 4. Use vw_participant_performance for quick analytics queries