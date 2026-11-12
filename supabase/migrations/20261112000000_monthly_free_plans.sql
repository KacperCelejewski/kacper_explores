-- Etap 2 nowego modelu: 2 darmowe plany na miesiąc. Krok 1 z 2: tylko nowe kolumny i funkcje.
-- Stary kod działa z nią dalej, więc wdrażaj ją PRZED kodem, który woła consume_plan_credit.
-- Krok 2 (20261112000100_new_accounts_start_at_zero.sql) po wdrożeniu kodu.
-- Istniejące kredyty (Pack, feedback, stare konta) zostają bez zmian.

-- Darmowe plany liczymy w kolumnach obok credits_remaining, żeby kredyty nigdy nie wygasały
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS free_plans_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_plans_period DATE;  -- pierwszy dzień miesiąca (Warszawa), którego dotyczy free_plans_used

-- Zajmuje jeden plan atomowo: najpierw darmowy z bieżącego miesiąca, potem kredyt.
-- Zwraca 'free', 'credit' albo NULL, gdy nie ma czego zużyć. UPDATE blokuje wiersz, więc równoległe
-- żądania nie zużyją tego samego planu dwa razy. Limit przekazuje kod (FREE_PLANS_PER_MONTH).
CREATE OR REPLACE FUNCTION public.consume_plan_credit(p_user_id UUID, p_free_limit INT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_month DATE := date_trunc('month', now() AT TIME ZONE 'Europe/Warsaw')::date;
  v_rows INT;
BEGIN
  UPDATE public.user_profiles
  SET free_plans_used = CASE WHEN free_plans_period = v_month THEN free_plans_used + 1 ELSE 1 END,
      free_plans_period = v_month,
      updated_at = now()
  WHERE id = p_user_id
    AND (free_plans_period IS DISTINCT FROM v_month OR free_plans_used < p_free_limit);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 1 THEN RETURN 'free'; END IF;

  UPDATE public.user_profiles
  SET credits_remaining = credits_remaining - 1, updated_at = now()
  WHERE id = p_user_id AND credits_remaining > 0;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 1 THEN RETURN 'credit'; END IF;

  RETURN NULL;
END;
$$;

-- Oddaje plan, gdy generowanie się nie udało. p_source to wartość zwrócona przez consume_plan_credit.
-- Zwrot darmowego planu z poprzedniego miesiąca nic nie robi (licznik już się odnowił).
CREATE OR REPLACE FUNCTION public.refund_plan_credit(p_user_id UUID, p_source TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_source = 'free' THEN
    UPDATE public.user_profiles
    SET free_plans_used = free_plans_used - 1, updated_at = now()
    WHERE id = p_user_id
      AND free_plans_period = date_trunc('month', now() AT TIME ZONE 'Europe/Warsaw')::date
      AND free_plans_used > 0;
  ELSIF p_source = 'credit' THEN
    UPDATE public.user_profiles
    SET credits_remaining = credits_remaining + 1, updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- SECURITY DEFINER omija RLS, więc tylko serwer (klucz serwisowy), jak add_credits
REVOKE EXECUTE ON FUNCTION public.consume_plan_credit(UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_plan_credit(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_plan_credit(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_plan_credit(UUID, TEXT) TO service_role;
