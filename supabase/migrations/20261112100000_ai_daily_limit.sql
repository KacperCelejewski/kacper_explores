-- Dzienny limit wywołań AI na konto (zamiana aktywności, nowy dzień, restauracje, lista pakowania, czat).
-- Same nowe kolumny i funkcja, więc stary kod działa z nią dalej: wdrażaj PRZED kodem, który woła consume_ai_call.
-- Limit przekazuje kod (AI_CALLS_PER_DAY), baza tylko liczy atomowo.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ai_calls_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_calls_day DATE;  -- dzień (Warszawa), którego dotyczy ai_calls_used

-- Zajmuje jedno wywołanie atomowo i zwraca true, gdy mieści się w limicie na dziś.
-- UPDATE blokuje wiersz, więc równoległe żądania nie przekroczą limitu. Odmowa niczego nie podbija.
CREATE OR REPLACE FUNCTION public.consume_ai_call(p_user_id UUID, p_daily_limit INT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_day DATE := (now() AT TIME ZONE 'Europe/Warsaw')::date;
  v_rows INT;
BEGIN
  UPDATE public.user_profiles
  SET ai_calls_used = CASE WHEN ai_calls_day = v_day THEN ai_calls_used + 1 ELSE 1 END,
      ai_calls_day = v_day
  WHERE id = p_user_id
    AND p_daily_limit > 0
    AND (ai_calls_day IS DISTINCT FROM v_day OR ai_calls_used < p_daily_limit);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

-- SECURITY DEFINER omija RLS, więc tylko serwer (klucz serwisowy), jak add_credits
REVOKE EXECUTE ON FUNCTION public.consume_ai_call(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_call(UUID, INT) TO service_role;
