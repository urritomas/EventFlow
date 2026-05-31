-- ============================================================================
-- EventFlow Behavior Classification Database Setup
-- ============================================================================
-- This file contains SQL statements to set up database tables, triggers,
-- and functions for the behavior classification system.
--
-- Run these statements in your Supabase project SQL editor.
-- ============================================================================

-- ============================================================================
-- Step 1: Create Behavior Metrics Cache Table
-- ============================================================================
-- This table caches behavior classifications for improved query performance
-- and enables efficient historical tracking.

CREATE TABLE IF NOT EXISTS public.participant_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  behavior_category TEXT NOT NULL CHECK (behavior_category IN ('Regular', 'Late', 'Irregular', 'High-Risk')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
  attendance_rate INTEGER NOT NULL DEFAULT 0 CHECK (attendance_rate >= 0 AND attendance_rate <= 100),
  total_events_registered INTEGER NOT NULL DEFAULT 0,
  total_events_attended INTEGER NOT NULL DEFAULT 0,
  late_check_ins INTEGER NOT NULL DEFAULT 0,
  absences INTEGER NOT NULL DEFAULT 0,
  consecutive_missed_events INTEGER NOT NULL DEFAULT 0,
  average_lateness INTEGER NOT NULL DEFAULT 0,
  last_attendance_date DATE,
  explanation TEXT,
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT unique_participant_behavior UNIQUE(participant_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participant_behavior_category 
  ON public.participant_behavior(behavior_category);

CREATE INDEX IF NOT EXISTS idx_participant_behavior_risk 
  ON public.participant_behavior(risk_level);

CREATE INDEX IF NOT EXISTS idx_participant_behavior_updated 
  ON public.participant_behavior(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_participant_behavior_participant 
  ON public.participant_behavior(participant_id);

-- ============================================================================
-- Step 2: Create Indexes for Attendance Table (If Not Already Present)
-- ============================================================================
-- These indexes significantly improve the performance of behavior
-- classification calculations.

CREATE INDEX IF NOT EXISTS idx_attendance_participant_verified 
  ON public.attendance(participant_id, verified, verified_at);

CREATE INDEX IF NOT EXISTS idx_attendance_event_date 
  ON public.attendance(event_id, verified_at);

CREATE INDEX IF NOT EXISTS idx_attendance_participant_event 
  ON public.attendance(participant_id, event_id);

-- ============================================================================
-- Step 3: Create Indexes for Event Participants Table
-- ============================================================================
-- These indexes optimize queries for participant registrations.

CREATE INDEX IF NOT EXISTS idx_event_participants_participant 
  ON public.event_participants(participant_id, registration_status);

CREATE INDEX IF NOT EXISTS idx_event_participants_event 
  ON public.event_participants(event_id, registration_status);

-- ============================================================================
-- Step 4: Create Function to Calculate Behavior Metrics
-- ============================================================================
-- This function encapsulates the behavior calculation logic at the database
-- level for potential use in triggers and direct SQL calls.
--
-- Note: This is a reference implementation. The actual calculations are
-- performed in the TypeScript utility (utils/behaviorClassification.ts)
-- for better maintainability and consistency.

CREATE OR REPLACE FUNCTION public.calculate_participant_metrics(
  p_participant_id UUID
)
RETURNS TABLE(
  total_registered BIGINT,
  total_attended BIGINT,
  attendance_rate INTEGER,
  late_count BIGINT,
  absence_count BIGINT,
  avg_lateness INTEGER
) AS $$
DECLARE
  v_registered_count BIGINT;
  v_attended_count BIGINT;
  v_rate INTEGER;
  v_late_count BIGINT;
  v_avg_lateness INTEGER;
BEGIN
  -- Get registration count
  SELECT COUNT(DISTINCT ep.event_id)
  INTO v_registered_count
  FROM public.event_participants ep
  WHERE ep.participant_id = p_participant_id
    AND ep.registration_status = 'registered';

  -- If no registrations, try using attendance as proxy
  IF v_registered_count = 0 THEN
    SELECT COUNT(DISTINCT a.event_id)
    INTO v_registered_count
    FROM public.attendance a
    WHERE a.participant_id = p_participant_id;
  END IF;

  -- Get attendance count (verified check-ins)
  SELECT COUNT(*)
  INTO v_attended_count
  FROM public.attendance a
  WHERE a.participant_id = p_participant_id
    AND a.verified = true;

  -- Calculate attendance rate
  IF v_registered_count > 0 THEN
    v_rate := ROUND((v_attended_count::NUMERIC / v_registered_count::NUMERIC) * 100)::INTEGER;
  ELSE
    v_rate := 0;
  END IF;

  -- Count late check-ins
  SELECT COUNT(*)
  INTO v_late_count
  FROM public.attendance a
  JOIN public.events e ON a.event_id = e.event_id
  WHERE a.participant_id = p_participant_id
    AND a.verified = true
    AND a.verified_at > (e.event_date || ' ' || e.start_time)::TIMESTAMP WITH TIME ZONE + INTERVAL '15 minutes';

  -- Calculate average lateness
  SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (a.verified_at - (e.event_date || ' ' || e.start_time)::TIMESTAMP WITH TIME ZONE)) / 60))::INTEGER, 0)
  INTO v_avg_lateness
  FROM public.attendance a
  JOIN public.events e ON a.event_id = e.event_id
  WHERE a.participant_id = p_participant_id
    AND a.verified = true
    AND a.verified_at > (e.event_date || ' ' || e.start_time)::TIMESTAMP WITH TIME ZONE;

  RETURN QUERY SELECT 
    v_registered_count,
    v_attended_count,
    v_rate,
    v_late_count,
    (v_registered_count - v_attended_count),
    GREATEST(v_avg_lateness, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Step 5: Create Audit Trigger Function
-- ============================================================================
-- This trigger logs when attendance records are updated, which can be used
-- for auditing and monitoring behavior classification recalculations.

CREATE TABLE IF NOT EXISTS public.behavior_calculation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL,
  triggered_by TEXT NOT NULL,
  event_id UUID,
  calculation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_behavior_log_participant 
  ON public.behavior_calculation_log(participant_id);

CREATE INDEX IF NOT EXISTS idx_behavior_log_timestamp 
  ON public.behavior_calculation_log(calculation_timestamp DESC);

-- ============================================================================
-- Step 6: Create Trigger Function for Attendance Changes
-- ============================================================================
-- This function logs when attendance records change, enabling real-time
-- tracking of when behavior classifications need recalculation.

CREATE OR REPLACE FUNCTION public.log_attendance_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the attendance change
  INSERT INTO public.behavior_calculation_log (
    participant_id,
    triggered_by,
    event_id,
    status
  ) VALUES (
    NEW.participant_id,
    TG_OP,
    NEW.event_id,
    'pending'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for attendance inserts
DROP TRIGGER IF EXISTS trigger_attendance_inserted ON public.attendance;
CREATE TRIGGER trigger_attendance_inserted
AFTER INSERT ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.log_attendance_change();

-- Create trigger for attendance updates
DROP TRIGGER IF EXISTS trigger_attendance_updated ON public.attendance;
CREATE TRIGGER trigger_attendance_updated
AFTER UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.log_attendance_change();

-- ============================================================================
-- Step 7: Create Function for Event Participant Changes
-- ============================================================================
-- This trigger logs when event participants change registration status.

CREATE OR REPLACE FUNCTION public.log_registration_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.behavior_calculation_log (
    participant_id,
    triggered_by,
    event_id,
    status
  ) VALUES (
    NEW.participant_id,
    'registration_' || TG_OP,
    NEW.event_id,
    'pending'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event_participants changes
DROP TRIGGER IF EXISTS trigger_registration_changed ON public.event_participants;
CREATE TRIGGER trigger_registration_changed
AFTER INSERT OR UPDATE ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.log_registration_change();

-- ============================================================================
-- Step 8: Enable Row Level Security (RLS) on Behavior Table
-- ============================================================================
-- Uncomment these lines if you want to enable RLS for the behavior table
-- This ensures users can only see their own behavior data

-- ALTER TABLE public.participant_behavior ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view their own behavior data"
-- ON public.participant_behavior
-- FOR SELECT
-- USING (
--   participant_id = auth.uid()
-- );

-- CREATE POLICY "System can update behavior data"
-- ON public.participant_behavior
-- FOR UPDATE
-- USING (true);

-- ============================================================================
-- Step 9: Create View for Behavior Summary by Event
-- ============================================================================
-- This view provides a convenient way to query behavior statistics for events

CREATE OR REPLACE VIEW public.event_behavior_summary AS
SELECT 
  ep.event_id,
  e.event_name,
  e.event_date,
  COUNT(DISTINCT ep.participant_id) as total_participants,
  COUNT(DISTINCT CASE WHEN pb.behavior_category = 'Regular' THEN ep.participant_id END) as regular_count,
  COUNT(DISTINCT CASE WHEN pb.behavior_category = 'Late' THEN ep.participant_id END) as late_count,
  COUNT(DISTINCT CASE WHEN pb.behavior_category = 'Irregular' THEN ep.participant_id END) as irregular_count,
  COUNT(DISTINCT CASE WHEN pb.behavior_category = 'High-Risk' THEN ep.participant_id END) as high_risk_count,
  COUNT(DISTINCT CASE WHEN pb.risk_level = 'Critical' THEN ep.participant_id END) as critical_risk_count,
  ROUND(AVG(pb.attendance_rate)::NUMERIC, 2) as avg_attendance_rate
FROM public.event_participants ep
JOIN public.events e ON ep.event_id = e.event_id
LEFT JOIN public.participant_behavior pb ON ep.participant_id = pb.participant_id
WHERE ep.registration_status = 'registered'
GROUP BY ep.event_id, e.event_name, e.event_date
ORDER BY e.event_date DESC;

-- ============================================================================
-- Step 10: Create View for Participant Behavior Trends
-- ============================================================================
-- This view helps track behavior changes over time

CREATE OR REPLACE VIEW public.participant_behavior_trends AS
SELECT 
  p.participant_id,
  p.name,
  p.email,
  pb.behavior_category,
  pb.risk_level,
  pb.attendance_rate,
  pb.total_events_registered,
  pb.total_events_attended,
  pb.last_attendance_date,
  pb.last_updated,
  CASE 
    WHEN pb.behavior_category = 'Regular' THEN 'Excellent'
    WHEN pb.behavior_category = 'Late' THEN 'Needs Punctuality Improvement'
    WHEN pb.behavior_category = 'Irregular' THEN 'Needs Consistency'
    WHEN pb.behavior_category = 'High-Risk' THEN 'Requires Intervention'
    ELSE 'Unknown'
  END as status_message
FROM public.participants p
LEFT JOIN public.participant_behavior pb ON p.participant_id = pb.participant_id
ORDER BY pb.last_updated DESC NULLS LAST;

-- ============================================================================
-- Step 11: Grant Permissions
-- ============================================================================
-- Adjust these permissions based on your security requirements

-- Allow authenticated users to read behavior data
GRANT SELECT ON public.participant_behavior TO authenticated;
GRANT SELECT ON public.behavior_calculation_log TO authenticated;
GRANT SELECT ON public.event_behavior_summary TO authenticated;
GRANT SELECT ON public.participant_behavior_trends TO authenticated;

-- Allow service role to update behavior data (for API)
GRANT ALL ON public.participant_behavior TO service_role;
GRANT ALL ON public.behavior_calculation_log TO service_role;

-- ============================================================================
-- Step 12: Sample Queries for Testing
-- ============================================================================
-- Use these queries to verify the setup and test functionality

-- Check behavior metrics for a specific participant
-- SELECT * FROM public.calculate_participant_metrics('participant-uuid-here'::UUID);

-- View behavior summary for an event
-- SELECT * FROM public.event_behavior_summary WHERE event_id = 'event-uuid-here'::UUID;

-- View all high-risk participants
-- SELECT * FROM public.participant_behavior_trends 
-- WHERE behavior_category = 'High-Risk'
-- ORDER BY last_updated DESC;

-- View recent calculation logs
-- SELECT * FROM public.behavior_calculation_log 
-- ORDER BY created_at DESC 
-- LIMIT 50;

-- Get statistics of all participants' behavior
-- SELECT 
--   behavior_category,
--   COUNT(*) as count,
--   ROUND(AVG(attendance_rate)::NUMERIC, 2) as avg_attendance,
--   MAX(attendance_rate) as max_attendance,
--   MIN(attendance_rate) as min_attendance
-- FROM public.participant_behavior
-- GROUP BY behavior_category
-- ORDER BY count DESC;

-- ============================================================================
-- End of Behavior Classification Database Setup
-- ============================================================================
