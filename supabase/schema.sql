-- ============================================================
-- Kacper Explores — Supabase Schema
-- Wklej w: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Profil użytkownika (tworzony automatycznie po rejestracji)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  credits_remaining INT NOT NULL DEFAULT 5,         -- 5 darmowych planów po rejestracji
  subscription_tier TEXT NOT NULL DEFAULT 'free',   -- 'free' | 'pro'
  subscription_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips (zapisane plany podróży)
CREATE TABLE IF NOT EXISTS public.trips (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city TEXT NOT NULL,
  country TEXT,
  flight_data JSONB,
  ai_plan_json JSONB,
  quiz_answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Płatności (audit log)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT,
  amount_cents INT,
  currency TEXT DEFAULT 'pln',
  credits_added INT DEFAULT 0,
  plan_type TEXT,  -- 'pack_5' | 'subscription_pro'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ────────────────────────────────────────

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- user_profiles: tylko własny profil
CREATE POLICY "read_own_profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "update_own_profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- trips: tylko własne wyjazdy
CREATE POLICY "read_own_trips" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- payments: tylko własne płatności
CREATE POLICY "read_own_payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Trigger: utwórz profil przy rejestracji ──────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, credits_remaining, subscription_tier)
  VALUES (NEW.id, 1, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── Funkcja: service role — aktualizacja kredytów z webhooka ─

CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_credits INT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    credits_remaining = credits_remaining + p_credits,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
