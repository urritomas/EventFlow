-- Performance Group Registration: Review & Vetting Migration
-- Run once inside your Supabase project SQL Editor.
-- This file is written to be rerunnable, but avoid running duplicated constraint/index blocks twice.

BEGIN;

-- 1) Ensure the review-related columns exist on event_participants
ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS organizer_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid;

-- 2) Guard the allowed review states
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'event_participants_review_status_check'
  ) THEN
    ALTER TABLE public.event_participants
      ADD CONSTRAINT event_participants_review_status_check
      CHECK (review_status IN ('pending', 'accepted', 'declined'));
  END IF;
END;
$$;

-- 3) Index for faster pending-review lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'event_participants'
      AND indexname = 'idx_event_participants_review_status'
  ) THEN
    CREATE INDEX idx_event_participants_review_status
      ON public.event_participants(event_id, review_status);
  END IF;
END;
$$;

-- 4) Optional per-event review configuration for organizations
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS review_config jsonb DEFAULT '{"requirePerformanceReview": true, "minimumScore": 40, "region": ""}'::jsonb;

COMMIT;
