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
