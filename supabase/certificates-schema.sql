-- Certificate records issued after eligible RFID checkout.
CREATE TABLE IF NOT EXISTS public.certificates (
  certificate_id serial PRIMARY KEY,
  event_id integer NOT NULL,
  participant_id integer NOT NULL,
  attendance_id integer,
  verification_id text NOT NULL UNIQUE,
  presence_percent integer,
  eligibility_reason text,
  email_sent_at timestamptz,
  recipient_email text,
  issued_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (event_id, participant_id)
);

CREATE INDEX IF NOT EXISTS certificates_participant_idx ON public.certificates (participant_id);
CREATE INDEX IF NOT EXISTS certificates_event_idx ON public.certificates (event_id);
