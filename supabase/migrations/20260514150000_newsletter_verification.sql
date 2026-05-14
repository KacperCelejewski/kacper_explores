-- Add email verification fields to newsletter_subscribers
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
