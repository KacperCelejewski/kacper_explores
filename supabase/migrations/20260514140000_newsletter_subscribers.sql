-- Newsletter subscribers with per-user Stripe promo codes
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  discount_code TEXT UNIQUE NOT NULL,
  stripe_promo_code_id TEXT,
  code_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only accessible via service role from API routes
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
