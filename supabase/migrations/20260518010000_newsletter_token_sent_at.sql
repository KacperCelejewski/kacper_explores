-- Track when the verification token was last sent so expiry
-- resets each time a new token is issued (resend flow).
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS token_sent_at TIMESTAMPTZ;

-- Back-fill existing rows: use created_at as a safe default
UPDATE public.newsletter_subscribers
SET token_sent_at = created_at
WHERE token_sent_at IS NULL;
