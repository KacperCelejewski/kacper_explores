-- Najpierw przegląd i migracja, potem kod. NIE stosować automatycznie.
-- Bez backfillu: NULL grant_status oznacza nieuzgodniony historyczny grant.
-- Stary kod nadal wstawia płatności bez znacznika; nie uznajemy ich za bezpieczne
-- do automatycznego potrącenia ani ponownego przyznania kredytów.
BEGIN;

ALTER TABLE public.payments
  ADD COLUMN stripe_payment_intent_id TEXT UNIQUE,
  ADD COLUMN grant_status TEXT CHECK (grant_status IN ('pending', 'applied')),
  ADD COLUMN refunded_amount_cents INT NOT NULL DEFAULT 0 CHECK (refunded_amount_cents >= 0),
  ADD COLUMN refund_credits_processed INT NOT NULL DEFAULT 0 CHECK (refund_credits_processed >= 0),
  ADD COLUMN refund_credits_debited INT NOT NULL DEFAULT 0 CHECK (refund_credits_debited >= 0),
  ADD CONSTRAINT payments_refund_credits_bounds CHECK (
    refund_credits_debited <= refund_credits_processed
    AND refund_credits_processed <= greatest(coalesce(credits_added, 0), 0)
  );

CREATE TABLE public.payment_refund_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type = 'charge.refunded'),
  stripe_charge_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  livemode BOOLEAN NOT NULL,
  event_created TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  currency TEXT NOT NULL,
  amount_cents INT NOT NULL CHECK (amount_cents >= 0),
  amount_refunded_cents INT NOT NULL CHECK (
    amount_refunded_cents >= 0 AND amount_refunded_cents <= amount_cents
  ),
  is_invoice_payment BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'manual_review', 'applied', 'ignored')),
  reason TEXT NOT NULL DEFAULT 'payment_not_found',
  credits_debited INT NOT NULL DEFAULT 0 CHECK (credits_debited >= 0),
  reviewed_at TIMESTAMPTZ,
  review_reference TEXT
);

CREATE INDEX payment_refund_events_pending_intent_idx
  ON public.payment_refund_events (stripe_payment_intent_id, event_created, stripe_event_id)
  WHERE status = 'pending_payment';

ALTER TABLE public.payment_refund_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_refund_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_refund_events TO service_role;
-- Brak polityk RLS dla użytkowników; service_role ma BYPASSRLS.

CREATE FUNCTION public.process_credit_refund(
  p_event_id TEXT,
  p_charge_id TEXT,
  p_payment_intent_id TEXT,
  p_customer_id TEXT,
  p_livemode BOOLEAN,
  p_event_created BIGINT,
  p_currency TEXT,
  p_amount_cents INT,
  p_amount_refunded_cents INT,
  p_session_id TEXT DEFAULT NULL,
  p_is_invoice_payment BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event public.payment_refund_events%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_balance INT;
  v_delta INT;
  v_debited INT := 0;
  v_status TEXT;
  v_reason TEXT;
BEGIN
  -- Grant i refund blokują ten sam PI, również gdy nie ma jeszcze płatności.
  -- Blokada przed eventem/płatnością zapobiega odwrotnej kolejności blokad
  -- podczas ponownego rozliczania pending w RPC grantu.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    coalesce(p_payment_intent_id, p_session_id, p_charge_id), 0));

  INSERT INTO public.payment_refund_events (
    stripe_event_id, event_type, stripe_charge_id, stripe_payment_intent_id,
    stripe_session_id, stripe_customer_id, livemode, event_created, currency,
    amount_cents, amount_refunded_cents, is_invoice_payment
  ) VALUES (
    p_event_id, 'charge.refunded', p_charge_id, p_payment_intent_id,
    p_session_id, p_customer_id, p_livemode, to_timestamp(p_event_created), p_currency,
    p_amount_cents, p_amount_refunded_cents, p_is_invoice_payment
  ) ON CONFLICT (stripe_event_id) DO NOTHING;

  SELECT * INTO STRICT v_event FROM public.payment_refund_events
    WHERE stripe_event_id = p_event_id FOR UPDATE;

  -- Zamknięte zdarzenie nie może ponownie zmienić salda. Pending można uzgodnić.
  IF v_event.status <> 'pending_payment' THEN
    RETURN jsonb_build_object('outcome', 'skipped', 'status', v_event.status,
      'reason', v_event.reason, 'credits_debited', 0);
  END IF;

  SELECT * INTO v_payment FROM public.payments
    WHERE stripe_payment_intent_id = v_event.stripe_payment_intent_id
       OR stripe_session_id = v_event.stripe_session_id
    ORDER BY id LIMIT 1 FOR UPDATE;

  IF v_event.is_invoice_payment THEN
    v_status := 'manual_review'; v_reason := 'subscription_or_invoice';
  ELSIF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('outcome', 'missing_payment', 'status', 'pending_payment',
      'reason', 'payment_not_found', 'credits_debited', 0);
  ELSIF v_payment.plan_type IS DISTINCT FROM 'pack_5' THEN
    v_status := 'manual_review'; v_reason := 'pro_or_unknown_plan';
  ELSIF v_payment.stripe_payment_intent_id IS DISTINCT FROM v_event.stripe_payment_intent_id
     OR v_event.stripe_payment_intent_id IS NULL
     OR (v_event.stripe_session_id IS NOT NULL
       AND v_event.stripe_session_id <> v_payment.stripe_session_id)
     OR v_payment.currency IS DISTINCT FROM v_event.currency
     OR v_payment.amount_cents IS DISTINCT FROM v_event.amount_cents
     OR v_event.amount_cents = 0
     OR v_payment.credits_added IS NULL OR v_payment.credits_added < 0 THEN
    v_status := 'manual_review'; v_reason := 'payment_mismatch_or_legacy';
  ELSIF v_payment.grant_status IS NULL THEN
    v_status := 'manual_review'; v_reason := 'unverified_legacy_grant';
  ELSIF v_payment.grant_status <> 'applied' THEN
    UPDATE public.payment_refund_events SET payment_id = v_payment.id, reason = 'grant_pending'
      WHERE stripe_event_id = p_event_id;
    RETURN jsonb_build_object('outcome', 'skipped', 'status', 'pending_payment',
      'reason', 'grant_pending', 'credits_debited', 0);
  ELSE
    UPDATE public.payments
      SET refunded_amount_cents = greatest(refunded_amount_cents, v_event.amount_refunded_cents)
      WHERE id = v_payment.id;

    IF v_event.amount_refunded_cents < v_payment.refunded_amount_cents
       OR v_payment.refund_credits_processed = v_payment.credits_added THEN
      v_status := 'ignored'; v_reason := 'already_processed';
    ELSIF v_event.amount_refunded_cents <> v_event.amount_cents THEN
      v_status := 'manual_review'; v_reason := 'partial_refund';
    ELSE
      SELECT credits_remaining INTO STRICT v_balance FROM public.user_profiles
        WHERE id = v_payment.user_id FOR UPDATE;
      v_delta := v_payment.credits_added - v_payment.refund_credits_processed;
      v_debited := least(greatest(v_balance, 0), v_delta);
      UPDATE public.user_profiles
        SET credits_remaining = greatest(0, credits_remaining - v_delta), updated_at = now()
        WHERE id = v_payment.user_id;
      -- Zapisujemy całą przetworzoną deltę także przy saldzie 0: późniejszy
      -- zakup nie może zostać obciążony resztą starego zwrotu.
      UPDATE public.payments
        SET refund_credits_processed = credits_added,
            refund_credits_debited = refund_credits_debited + v_debited
        WHERE id = v_payment.id;
      v_status := 'applied'; v_reason := 'full_pack_refund';
    END IF;
  END IF;

  UPDATE public.payment_refund_events
    SET payment_id = v_payment.id, status = v_status, reason = v_reason, credits_debited = v_debited
    WHERE stripe_event_id = p_event_id;
  RETURN jsonb_build_object('outcome', CASE WHEN v_status = 'applied' THEN 'applied' ELSE 'skipped' END,
    'status', v_status, 'reason', v_reason, 'credits_debited', v_debited);
END;
$$;

-- Zastępuje tylko krok add_credits w dotychczasowym insert → grant → rollback.
-- NULL grant_status (stary kod/dane) nigdy nie pozwala na drugi grant.
CREATE FUNCTION public.grant_credit_pack(p_session_id TEXT, p_payment_intent_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_event public.payment_refund_events%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    coalesce(p_payment_intent_id, p_session_id), 0));
  SELECT * INTO STRICT v_payment FROM public.payments
    WHERE stripe_session_id = p_session_id FOR UPDATE;
  IF v_payment.plan_type IS DISTINCT FROM 'pack_5'
     OR v_payment.grant_status IS NULL THEN RETURN 'ignored'; END IF;
  IF v_payment.stripe_payment_intent_id IS DISTINCT FROM p_payment_intent_id THEN
    RAISE EXCEPTION 'PaymentIntent mismatch';
  END IF;
  IF v_payment.grant_status = 'applied' THEN RETURN 'ignored'; END IF;
  IF v_payment.credits_added IS NULL OR v_payment.credits_added < 0 THEN
    RAISE EXCEPTION 'Invalid pack credits';
  END IF;

  PERFORM 1 FROM public.user_profiles WHERE id = v_payment.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment profile not found'; END IF;
  UPDATE public.user_profiles
    SET credits_remaining = credits_remaining + v_payment.credits_added, updated_at = now()
    WHERE id = v_payment.user_id;
  UPDATE public.payments SET grant_status = 'applied' WHERE id = v_payment.id;

  -- Refund dostarczony przed Checkout zostaje rozliczony w tej samej transakcji.
  FOR v_event IN SELECT * FROM public.payment_refund_events
    WHERE stripe_payment_intent_id = p_payment_intent_id AND status = 'pending_payment'
    ORDER BY event_created, stripe_event_id
  LOOP
    PERFORM public.process_credit_refund(
      v_event.stripe_event_id, v_event.stripe_charge_id, v_event.stripe_payment_intent_id,
      v_event.stripe_customer_id, v_event.livemode, extract(epoch FROM v_event.event_created)::bigint,
      v_event.currency, v_event.amount_cents, v_event.amount_refunded_cents,
      v_event.stripe_session_id, v_event.is_invoice_payment);
  END LOOP;
  RETURN 'applied';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_credit_refund(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BIGINT, TEXT, INT, INT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_credit_refund(TEXT, TEXT, TEXT, TEXT, BOOLEAN, BIGINT, TEXT, INT, INT, TEXT, BOOLEAN) TO service_role;
REVOKE EXECUTE ON FUNCTION public.grant_credit_pack(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_credit_pack(TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
