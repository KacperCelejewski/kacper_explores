# Dowód dostarczenia zrzutu (R5): stan na 2026-11-19, praca NIEDOKOŃCZONA

Zakres wykonany: audyt kodu (bez wywołań crona, bez wysyłek). Kod aplikacji NIE został zmieniony. Brak recenzenta obalającego. Testy bazowe: `vitest run src/lib/drop src/app/api` = 192 zielone (przed zmianami).

## Ustalenia z audytu

| Obszar | Stan | Dowód |
|---|---|---|
| Zapis zgody | Double opt-in: `verified` + `verified_at` po linku z maila. Z profilu (zalogowany) adres uznany za potwierdzony od razu. Brak zapisu źródła zgody, wersji tekstu i zdarzenia (jest tylko znacznik czasu). | `api/drop/subscribe`, `api/newsletter/verify` |
| Idempotencja | Dobra: rezerwacja w `drop_sends` (UNIQUE week+subscriber, upsert ignoreDuplicates) przed wysyłką, klucz idempotencji Resend na partię. | `cron/drop-send/route.ts:131-171` |
| Luka idempotencji | Rezerwacja z `sent_at = NULL` (błąd "unknown", ubicie funkcji po rezerwacji, nieudany update `resend_id`) jest traktowana jak wysłana: odbiorca nie dostanie maila przy ponownym uruchomieniu i nic tego nie sygnalizuje poza Slackiem z tego uruchomienia. `/admin` liczy tylko `sent_at IS NOT NULL`, więc zaniża. | `drop-send/route.ts:97-100, 199-203, 224-234` |
| Błędy Resend | Obsłużone: quota (stop, zwolnienie rezerwacji), rate limit (1 ponowienie), odrzucone adresy (permissive, zwolnienie), nieznany błąd (rezerwacja zostaje). Wynik tylko w Slacku i `console.error`; brak trwałego zapisu per odbiorca. | `lib/drop/send.ts`, `drop-send/route.ts` |
| Link wypisania | Jest: nagłówki `List-Unsubscribe` + `One-Click` oraz link w stopce. GET pokazuje potwierdzenie, POST wypisuje. Wypisanie NIE jest zapisywane jako zdarzenie (tylko `drop_enabled=false`, `reason=user`, bez czasu). | `api/drop/unsubscribe/route.ts` |
| Dostarczenie / klik | Webhook `/api/resend-webhook` obsługuje wyłącznie `email.bounced` (Permanent) i `email.complained`; `delivered`, `clicked`, `delivery_delayed`, `failed` są ignorowane. Dokumentacja prosi o subskrypcję tylko dwóch zdarzeń. Czy w Resend włączone jest śledzenie kliknięć: NIEZWERYFIKOWANE. | `api/resend-webhook/route.ts`, `docs/email-deliverability-audit.md:43` |
| Klik -> plan | "Sprawdź cenę" idzie prosto do Aviasales (brak własnego zapisu kliku). "Ułóż mi plan" otwiera `/quiz?src=drop&utm_*`; jedyny ślad to GA4 `drop_plan_started` (tylko po zgodzie na cookies). `plan_generated` to wyłącznie GA4 bez atrybucji źródła; `quiz_events` nie ma tygodnia ani źródła. | `quiz/page.tsx:216`, `destinations/page.tsx:801` |

## Odpowiedź: czy z logów da się policzyć zapis -> dostarczony -> klik -> plan?

Dziś: **nie w całości.** Zapis (`newsletter_subscribers.created_at/verified_at`) i wysłane (`drop_sends.sent_at`, `resend_id`) tak. Dostarczone, kliknięcia i plany z zrzutu: nie (brak zapisu lub tylko GA4 za zgodą). Wypisania: bez czasu, nie do policzenia per tydzień.

## Gotowe i zaproponowane (niezastosowane)

- `supabase/migrations/20261119000000_drop_events.sql`: tabela `drop_events` (event, week, subscriber_id, resend_id, source_id UNIQUE do deduplikacji, detail JSONB, bez e-maili i pełnych linków). **Nie stosować na produkcji bez zgody i przeglądu SQL.**

## Do zrobienia (nie wykonano)

1. `src/lib/drop/events.ts`: `logDropEvents(db, rows)` (linia `[drop-event] {json}` do logów + insert, odporny na brak tabeli przez `isMissingTableError`) i mapowanie zdarzeń Resend (`delivered/bounced/complained/delivery_delayed/failed/clicked`) wraz z rodzajem linku (plan / cena / ustawienia).
2. Webhook: zapis zdarzeń po mapowaniu `email_id` -> `drop_sends.resend_id`, dedupe po `svix-id`; dotychczasowe wyłączanie po bounce/complaint bez zmian.
3. `drop-send`: zdarzenia `send_rejected/send_failed/send_uncertain/send_unrecorded` i `run_summary`; w Slacku liczba rezerwacji bez `sent_at`.
4. Wypis i ustawienia: zdarzenie `unsubscribed`; weryfikacja/profil: `consent_given` ze źródłem.
5. Atrybucja planu: w quizie dla `src=drop` zdarzenie `drop_start:<medium>:<tydzień>` do `/api/track`, tydzień+miasto w `sessionStorage`, na `/destinations` po wygenerowaniu planu `drop_plan:<tydzień>`.
6. Testy z mockiem Resend (route `drop-send`, webhook, wypis), `npm test`, `lint`, `typecheck`, `build` z dummy env, recenzent obalający (do 3 rund).

## Wymagania produkcji (po wdrożeniu punktów 1-5)

- Zgoda Kacpra na migrację `drop_events` (najpierw migracja, potem kod).
- W Resend: webhook ze zdarzeniami `email.delivered`, `email.clicked`, `email.delivery_delayed`, `email.failed` (obok bounced/complained) i włączone śledzenie kliknięć dla domeny wysyłkowej.
- Licznik ludzi z tej statystyki to agregaty; `/api/track` przyjmuje zdarzenia od każdego, więc to wskaźnik, nie dowód.
