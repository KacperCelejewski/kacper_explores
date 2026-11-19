-- Dziennik zdarzeń Czwartkowego zrzutu (dowód dostarczenia i dalszego użycia).
-- NIE STOSOWAĆ na produkcji bez przeglądu: kod działa także bez tej tabeli
-- (zdarzenia trafiają wtedy tylko do logów Vercel jako linie "[drop-event] {...}").
--
-- Zasady: bez adresów e-mail i bez pełnych linków (tylko rodzaj linku), kasowane razem z subskrybentem.
-- Zapisuje tylko klucz serwisowy (RLS włączone, bez polityk).
CREATE TABLE IF NOT EXISTS public.drop_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- np. consent_given, delivered, bounced, complained, delayed, clicked, unsubscribed,
  --     send_rejected, send_failed, send_uncertain, send_unrecorded, run_summary
  event TEXT NOT NULL,
  week TEXT,
  subscriber_id UUID REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  resend_id TEXT,
  -- deduplikacja: id webhooka (svix-id) albo klucz deterministyczny z crona; NULL nie koliduje
  source_id TEXT UNIQUE,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS drop_events_week_event_idx ON public.drop_events (week, event);
CREATE INDEX IF NOT EXISTS drop_events_subscriber_idx ON public.drop_events (subscriber_id);
CREATE INDEX IF NOT EXISTS drop_sends_resend_id_idx ON public.drop_sends (resend_id) WHERE resend_id IS NOT NULL;

ALTER TABLE public.drop_events ENABLE ROW LEVEL SECURITY;
