-- Czwartkowy zrzut: weekly weekend flight deals email
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS airports TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_price INT,
  ADD COLUMN IF NOT EXISTS drop_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS drop_disabled_reason TEXT;

-- Best deal per city and origin for a given ISO week (YYYY-Www)
CREATE TABLE IF NOT EXISTS public.drop_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week TEXT NOT NULL,
  origin TEXT NOT NULL,
  city_code TEXT NOT NULL,
  city_name TEXT NOT NULL,
  price INT NOT NULL,
  departure_at TIMESTAMPTZ NOT NULL,
  return_at TIMESTAMPTZ NOT NULL,
  airline TEXT NOT NULL,
  transfers INT NOT NULL,
  link TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  UNIQUE (week, origin, city_code)
);

-- Short Polish teaser and local budget per city for a given week
CREATE TABLE IF NOT EXISTS public.city_teasers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week TEXT NOT NULL,
  city_code TEXT NOT NULL,
  teaser TEXT NOT NULL,
  local_budget TEXT NOT NULL,
  UNIQUE (week, city_code)
);

-- One row per subscriber per weekly send (idempotency)
CREATE TABLE IF NOT EXISTS public.drop_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week TEXT NOT NULL,
  subscriber_id UUID NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ,
  resend_id TEXT,
  UNIQUE (week, subscriber_id)
);

-- Only accessible via service role from API routes
ALTER TABLE public.drop_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_teasers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_sends ENABLE ROW LEVEL SECURITY;
