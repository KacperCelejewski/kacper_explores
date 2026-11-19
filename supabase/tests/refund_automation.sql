-- REGRESJA do uruchomienia przez leada dopiero po zatwierdzeniu i zastosowaniu
-- migracji na odizolowanej bazie testowej. Ten plik nie stosuje migracji.
-- psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/refund_automation.sql
-- Wymaga roli właściciela testowej bazy. Wszystkie fixture'y są wycofywane.
BEGIN;

INSERT INTO auth.users (id) VALUES ('ee160000-0000-4000-8000-000000000001');
UPDATE public.user_profiles SET credits_remaining = 0, subscription_tier = 'pro',
  subscription_expires_at = '2030-01-01', free_plans_used = 1, free_plans_period = '2026-11-01'
  WHERE id = 'ee160000-0000-4000-8000-000000000001';

CREATE FUNCTION pg_temp.payment(
  p_session TEXT, p_pi TEXT, p_credits INT DEFAULT 5,
  p_grant TEXT DEFAULT 'pending', p_plan TEXT DEFAULT 'pack_5'
) RETURNS VOID LANGUAGE sql AS $$
  INSERT INTO public.payments (user_id, stripe_session_id, stripe_payment_intent_id,
    amount_cents, currency, credits_added, plan_type, grant_status)
  VALUES ('ee160000-0000-4000-8000-000000000001', p_session, p_pi,
    1499, 'pln', p_credits, p_plan, p_grant);
$$;

CREATE FUNCTION pg_temp.refund(
  p_event TEXT, p_pi TEXT, p_refunded INT DEFAULT 1499,
  p_session TEXT DEFAULT NULL, p_invoice BOOLEAN DEFAULT false, p_currency TEXT DEFAULT 'pln'
) RETURNS JSONB LANGUAGE sql AS $$
  SELECT public.process_credit_refund(p_event, 'ch_' || coalesce(p_pi, 'none'), p_pi,
    'cus_refund_test', false, 1794787200, p_currency, 1499, p_refunded, p_session, p_invoice);
$$;

CREATE FUNCTION pg_temp.balance(p_expected INT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_actual INT;
BEGIN
  SELECT credits_remaining INTO STRICT v_actual FROM public.user_profiles
    WHERE id = 'ee160000-0000-4000-8000-000000000001';
  IF v_actual <> p_expected THEN
    RAISE EXCEPTION 'Balance: expected %, got %', p_expected, v_actual;
  END IF;
END;
$$;

DO $$
DECLARE v_result JSONB;
BEGIN
  -- Pełny zwrot: historyczne 7 kredytów, zostały 3; nigdy poniżej zera.
  PERFORM pg_temp.payment('cs_rt_full', 'pi_rt_full', 7);
  PERFORM public.grant_credit_pack('cs_rt_full', 'pi_rt_full');
  PERFORM public.grant_credit_pack('cs_rt_full', 'pi_rt_full');
  PERFORM pg_temp.balance(7); -- grant sesji jest idempotentny
  UPDATE public.user_profiles SET credits_remaining = 3
    WHERE id = 'ee160000-0000-4000-8000-000000000001';
  v_result := pg_temp.refund('evt_rt_full', 'pi_rt_full');
  ASSERT v_result->>'outcome' = 'applied', v_result::text;
  ASSERT (v_result->>'credits_debited')::int = 3, v_result::text;
  PERFORM pg_temp.balance(0);
  ASSERT (SELECT refund_credits_processed = 7 AND refund_credits_debited = 3
    FROM public.payments WHERE stripe_session_id = 'cs_rt_full');

  -- Duplikat oraz inny event tego samego Charge nie zabierają nowego zakupu.
  UPDATE public.user_profiles SET credits_remaining = 5
    WHERE id = 'ee160000-0000-4000-8000-000000000001';
  v_result := pg_temp.refund('evt_rt_full', 'pi_rt_full');
  ASSERT v_result->>'outcome' = 'skipped', v_result::text;
  ASSERT (v_result->>'credits_debited')::int = 0, v_result::text;
  PERFORM pg_temp.refund('evt_rt_full_again', 'pi_rt_full');
  PERFORM pg_temp.balance(5);
  ASSERT (SELECT count(*) = 1 FROM public.payment_refund_events WHERE stripe_event_id = 'evt_rt_full');

  -- Saldo 0 w chwili refundu: pełna delta przetworzona, faktyczny debet 0.
  PERFORM pg_temp.payment('cs_rt_zero', 'pi_rt_zero');
  PERFORM public.grant_credit_pack('cs_rt_zero', 'pi_rt_zero');
  UPDATE public.user_profiles SET credits_remaining = 0
    WHERE id = 'ee160000-0000-4000-8000-000000000001';
  v_result := pg_temp.refund('evt_rt_zero', 'pi_rt_zero');
  ASSERT v_result->>'outcome' = 'applied', v_result::text;
  ASSERT (v_result->>'credits_debited')::int = 0, v_result::text;
  ASSERT (SELECT refund_credits_processed = 5 AND refund_credits_debited = 0
    FROM public.payments WHERE stripe_session_id = 'cs_rt_zero');
  UPDATE public.user_profiles SET credits_remaining = 5
    WHERE id = 'ee160000-0000-4000-8000-000000000001';
  PERFORM pg_temp.refund('evt_rt_zero_again', 'pi_rt_zero');
  PERFORM pg_temp.balance(5);

  -- Częściowe snapshoty: max, nie suma; późniejszy pełny odbiera tylko raz.
  PERFORM pg_temp.payment('cs_rt_partial', 'pi_rt_partial');
  PERFORM public.grant_credit_pack('cs_rt_partial', 'pi_rt_partial');
  v_result := pg_temp.refund('evt_rt_partial_later', 'pi_rt_partial', 900);
  ASSERT v_result->>'status' = 'manual_review', v_result::text;
  PERFORM pg_temp.refund('evt_rt_partial_earlier', 'pi_rt_partial', 500);
  PERFORM pg_temp.balance(10);
  ASSERT (SELECT refunded_amount_cents = 900 FROM public.payments WHERE stripe_session_id = 'cs_rt_partial');
  PERFORM pg_temp.refund('evt_rt_partial_full', 'pi_rt_partial');
  PERFORM pg_temp.refund('evt_rt_partial_stale', 'pi_rt_partial', 700);
  PERFORM pg_temp.balance(5);

  -- Unknown jest trwały, a ten sam pending event może zostać uzgodniony.
  v_result := pg_temp.refund('evt_rt_unknown', 'pi_rt_unknown');
  ASSERT v_result->>'outcome' = 'missing_payment', v_result::text;
  ASSERT (SELECT status = 'pending_payment' FROM public.payment_refund_events WHERE stripe_event_id = 'evt_rt_unknown');
  PERFORM pg_temp.balance(5);

  -- Refund przed płatnością: grant i rozliczenie pending w jednej transakcji.
  PERFORM pg_temp.payment('cs_rt_unknown', 'pi_rt_unknown');
  PERFORM public.grant_credit_pack('cs_rt_unknown', 'pi_rt_unknown');
  PERFORM pg_temp.balance(5);
  ASSERT (SELECT status = 'applied' FROM public.payment_refund_events WHERE stripe_event_id = 'evt_rt_unknown');

  -- Refund pomiędzy insertem a grantem: nie odejmuje starych kredytów.
  PERFORM pg_temp.payment('cs_rt_pending', 'pi_rt_pending');
  v_result := pg_temp.refund('evt_rt_pending', 'pi_rt_pending');
  ASSERT v_result->>'reason' = 'grant_pending', v_result::text;
  PERFORM pg_temp.balance(5);
  PERFORM public.grant_credit_pack('cs_rt_pending', 'pi_rt_pending');
  PERFORM pg_temp.balance(5);
  ASSERT (SELECT status = 'applied' FROM public.payment_refund_events WHERE stripe_event_id = 'evt_rt_pending');

  -- Stary grant NULL: żadnego ponownego grantu ani automatycznego potrącenia.
  PERFORM pg_temp.payment('cs_rt_legacy', 'pi_rt_legacy', 5, NULL);
  PERFORM public.grant_credit_pack('cs_rt_legacy', 'pi_rt_legacy');
  v_result := pg_temp.refund('evt_rt_legacy', 'pi_rt_legacy');
  ASSERT v_result->>'status' = 'manual_review', v_result::text;
  PERFORM pg_temp.balance(5);

  -- Pro: oba plany i odnowienie bez wpisu payments zawsze manual_review.
  PERFORM pg_temp.payment('cs_rt_monthly', 'pi_rt_monthly', 0, NULL, 'pro_monthly');
  PERFORM pg_temp.payment('cs_rt_yearly', 'pi_rt_yearly', 0, NULL, 'pro_yearly');
  v_result := pg_temp.refund('evt_rt_monthly', 'pi_rt_monthly');
  ASSERT v_result->>'status' = 'manual_review', v_result::text;
  v_result := pg_temp.refund('evt_rt_yearly', 'pi_rt_yearly');
  ASSERT v_result->>'status' = 'manual_review', v_result::text;
  v_result := pg_temp.refund('evt_rt_renewal', 'pi_rt_renewal', 1499, NULL, true);
  ASSERT v_result->>'status' = 'manual_review', v_result::text;

  -- Niezgodna waluta/PI/sesja nigdy nie uprawnia do potrącenia.
  v_result := pg_temp.refund('evt_rt_currency', 'pi_rt_full', 1499, NULL, false, 'eur');
  ASSERT v_result->>'status' = 'manual_review', v_result::text;
  v_result := pg_temp.refund('evt_rt_wrong_pi', 'pi_rt_other', 1499, 'cs_rt_full');
  ASSERT v_result->>'status' = 'manual_review', v_result::text;
  PERFORM pg_temp.balance(5);
  ASSERT (SELECT subscription_tier = 'pro' AND subscription_expires_at = '2030-01-01'::timestamptz
    AND free_plans_used = 1 AND free_plans_period = '2026-11-01'::date
    FROM public.user_profiles WHERE id = 'ee160000-0000-4000-8000-000000000001');

  -- Uprawnienia: tabela i obie funkcje tylko service_role.
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.payment_refund_events'::regclass);
  ASSERT NOT has_table_privilege('anon', 'public.payment_refund_events', 'SELECT');
  ASSERT NOT has_table_privilege('authenticated', 'public.payment_refund_events', 'INSERT');
  ASSERT NOT has_function_privilege('anon', 'public.grant_credit_pack(text,text)', 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated',
    'public.process_credit_refund(text,text,text,text,boolean,bigint,text,integer,integer,text,boolean)', 'EXECUTE');
  ASSERT has_function_privilege('service_role', 'public.grant_credit_pack(text,text)', 'EXECUTE');
END;
$$;

-- Awaria po aktualizacji salda: funkcja ma wycofać saldo, liczniki i rejestr.
CREATE FUNCTION pg_temp.fail_refund() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stripe_event_id IN ('evt_rt_fail', 'evt_rt_grant_fail') AND NEW.status = 'applied' THEN
    RAISE EXCEPTION 'test: forced ledger failure';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER refund_test_failure BEFORE UPDATE ON public.payment_refund_events
  FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_refund();

DO $$
BEGIN
  PERFORM pg_temp.payment('cs_rt_fail', 'pi_rt_fail');
  PERFORM public.grant_credit_pack('cs_rt_fail', 'pi_rt_fail');
  BEGIN
    PERFORM pg_temp.refund('evt_rt_fail', 'pi_rt_fail');
    RAISE EXCEPTION 'test: expected failure';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'test: forced ledger failure' THEN RAISE; END IF;
  END;
  PERFORM pg_temp.balance(10);
  ASSERT NOT EXISTS (SELECT 1 FROM public.payment_refund_events WHERE stripe_event_id = 'evt_rt_fail');
  ASSERT (SELECT refund_credits_processed = 0 AND refunded_amount_cents = 0
    FROM public.payments WHERE stripe_session_id = 'cs_rt_fail');

  -- Również grant + oczekujący refund są jedną transakcją.
  PERFORM pg_temp.refund('evt_rt_grant_fail', 'pi_rt_grant_fail');
  PERFORM pg_temp.payment('cs_rt_grant_fail', 'pi_rt_grant_fail');
  BEGIN
    PERFORM public.grant_credit_pack('cs_rt_grant_fail', 'pi_rt_grant_fail');
    RAISE EXCEPTION 'test: expected failure';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'test: forced ledger failure' THEN RAISE; END IF;
  END;
  PERFORM pg_temp.balance(10);
  ASSERT (SELECT grant_status = 'pending' FROM public.payments WHERE stripe_session_id = 'cs_rt_grant_fail');
  ASSERT (SELECT status = 'pending_payment' FROM public.payment_refund_events WHERE stripe_event_id = 'evt_rt_grant_fail');
END;
$$;

ROLLBACK;
