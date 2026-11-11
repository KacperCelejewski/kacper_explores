-- Uprawnienia (kredyty, Pro, wyjazdy) zapisuje tylko serwer kluczem serwisowym.
-- Zalogowanemu zostaje odczyt własnych danych: read_own_profile, read_own_trips, read_own_payments.
-- Wdrażaj po kodzie, który zapisuje przez createServiceClient(): stary kod odejmuje kredyty
-- i zapisuje wyjazdy sesją użytkownika, a po tej migracji przestałby to robić.

-- Na wypadek, gdyby ktoś wyłączył RLS w panelu: bez RLS polityki niczego nie blokują
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- USING (true) dawało każdemu z kluczem anon wszystkie wyjazdy razem z user_id.
-- Udostępnianie i galeria czytają kluczem serwisowym z is_public = true.
DROP POLICY IF EXISTS "public_read_trips" ON public.trips;

-- Wyjazd zapisuje /api/generate po sprawdzeniu kredytów. Z przeglądarki dało się
-- wstawić dowolny plan, od razu publiczny, bez wydania kredytu.
DROP POLICY IF EXISTS "insert_own_trips" ON public.trips;

-- Pozwalała zmienić każdą kolumnę własnego profilu, także credits_remaining,
-- subscription_tier, subscription_expires_at i stripe_customer_id.
-- Bez polityki UPDATE profil zmienia tylko serwer, także w kolumnach dodanych później.
DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;

-- SECURITY DEFINER omija RLS, a EXECUTE miał każdy (PUBLIC), więc samym kluczem anon
-- dało się dopisać kredyty dowolnemu kontu. Wołają ją tylko trasy serwera.
REVOKE EXECUTE ON FUNCTION public.add_credits(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INT) TO service_role;

-- Kredyt za pełny feedback raz na wyjazd i tylko za własny: /api/feedback zajmuje
-- tę kolumnę warunkiem IS NULL i dopiero wtedy woła add_credits.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS feedback_credited_at TIMESTAMPTZ;

-- Analityka quizu i log Gemini: tylko klucz serwisowy (RLS bez polityk, jak api_usage_log).
-- Kluczem anon dało się je czytać, dopisywać i kasować; /api/track zapisuje kluczem serwisowym.
ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemini_usage_log ENABLE ROW LEVEL SECURITY;
-- Widok liczony z uprawnieniami pytającego, więc nie omija RLS na quiz_events
ALTER VIEW public.quiz_funnel SET (security_invoker = true);
