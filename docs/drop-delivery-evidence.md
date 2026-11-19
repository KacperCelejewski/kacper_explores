# Dowód dostarczenia zrzutu (R5)

Audyt kodu i uzupełnienie logowania (2026-11-19). Nic nie wysłano, cron nie był wywoływany; testy używają mocków Resend i bazy. Tabela poniżej opisuje stan PRZED zmianami; co dodano, jest niżej.

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

## Co dodano (commit 5311fa9)

| Zdarzenie | Gdzie powstaje | Zapis |
|---|---|---|
| `consent_given` (źródło: verify_link / profile / settings), tylko przy zmianie stanu | `newsletter/verify`, `drop/subscribe` (profil), `drop/settings` | `drop_events` + log |
| `settings_disabled`, `unsubscribed` | `drop/settings`, `drop/unsubscribe` (tylko gdy zrzut był włączony; powtórny POST i skarga/odbicie nie liczą się) | j.w. |
| `delivered`, `bounced`, `complained`, `delayed`, `failed`, `clicked` (rodzaj linku: plan/price/settings/unsubscribe) | `/api/resend-webhook`, dedupe po `svix-id`; dopasowanie do tygodnia i subskrybenta po `drop_sends.resend_id`, a gdy wiersza jeszcze nie ma (webhook wyprzedził zapis) lub mail jest spoza zrzutu, zdarzenie zapisuje się z `detail.unmatched=true` i samym `resend_id`; otwarcia pomijane | j.w. |
| `send_rejected`, `send_failed`, `send_uncertain`, `send_unrecorded`, `run_summary` | `cron/drop-send` | j.w. |
| `drop_start:<medium>:<tydzień>`, `drop_plan:<medium>:<tydzień>` | quiz (wejście z `src=drop`) i `/destinations` (plan na miasto z maila, raz) | `quiz_events` przez `/api/track`, bez migracji |

Dodatkowo: Slack i odpowiedź crona zawierają `pendingReservations` (rezerwacje bez `sent_at`), czyli odbiorców, których nikt nie ponowi. Wszystkie zapisy są odporne na brak tabeli `drop_events`: wtedy zostają linie `[drop-event] {json}` w logach Vercel (krótka retencja, nie dowód długoterminowy). Bez adresów e-mail i pełnych linków; teksty błędów są maskowane (`[email]`) i skracane do 300 znaków także w logach. `subscriber_id` jest w logach Vercel niezależnie od migracji.

## Odpowiedź: czy z logów da się policzyć zapis -> dostarczony -> klik -> plan?

Po wdrożeniu migracji i konfiguracji Resend: **tak, ale jako osobne agregaty tygodniowe (bez ścieżki per odbiorca, świadomie)**; bez nich: tylko zapis, wysłane i atrybucja planu (`quiz_events`). Zapytania (tydzień `2026-W47` jako przykład):

```sql
-- zapis (ostatnie 7 dni), zgoda
select count(distinct subscriber_id) from drop_events where event='consent_given' and created_at > now() - interval '7 days';
-- wysłane
select count(*) from drop_sends where week='2026-W47' and sent_at is not null;
-- dostarczone / odbicia / skargi / kliknięcia wg rodzaju linku
select e.event, e.detail->>'link_kind' as link, count(*), count(distinct s.subscriber_id) as osoby
  from drop_events e join drop_sends s on s.resend_id = e.resend_id
 where s.week='2026-W47' and e.event in ('delivered','bounced','complained','delayed','failed','clicked') group by 1,2;
-- wypisania w dniach po wysyłce
select count(distinct subscriber_id) from drop_events where event='unsubscribed' and created_at between '2026-11-19' and '2026-11-26';
-- wejścia w quiz z maila i plany
select event, count(*) from quiz_events where event in ('drop_start:email:2026-W47','drop_plan:email:2026-W47') group by 1;
```

Koszt wysyłki i wypisania liczy się osobno (koszt = liczba wysłanych x cena Resend z faktury; wypisy z zapytania wyżej). Otwarcia nie są dowodem i nie są zapisywane.

## Ograniczenia (nie do zweryfikowania bez produkcji)

- Webhook Resend musi subskrybować `email.delivered`, `email.clicked`, `email.delivery_delayed`, `email.failed` (dotąd zalecane tylko bounced i complained) i śledzenie kliknięć musi być włączone w Resend: NIEZWERYFIKOWANE.
- Klik "Sprawdź cenę" jest widoczny tylko z webhooka Resend; sprzedaż po stronie Travelpayouts to zakres R6.
- `drop_start`/`drop_plan` to agregat: `/api/track` przyjmuje zdarzenia od każdego (podatne na zawyżenie), brak powiązania z konkretnym odbiorcą (świadomie, prywatność). Plan liczy się tylko dla miasta z maila, raz na wejście; zmiana przeglądarki lub karty gubi atrybucję (sessionStorage).
- Luka z `sent_at = NULL` nie jest naprawiana automatycznie (Resend mógł przyjąć partię); jest teraz widoczna. Procedura: sprawdzić w panelu Resend po `resend_id`/czasie i dopiero wtedy decydować.
- Wysyłka wcześniejszych tygodni nie ma wstecznego dziennika zdarzeń.

## Wymagania produkcji

1. Zgoda Kacpra i przegląd SQL migracji `supabase/migrations/20261119000000_drop_events.sql` (najpierw migracja, potem kod; kod działa też bez niej).
2. Konfiguracja Resend jak wyżej.
3. Polityka prywatności: dopisać, że zapisujemy zdarzenia dostarczenia/kliknięcia maila zrzutu (obecnie wspomina tylko wysyłkę przez Resend) - do decyzji Kacpra.

## Recenzent obalający: runda 1 (sonnet, tylko odczyt)

Ustalenia i decyzje:
1. Zgoda i wypis liczone wielokrotnie: NAPRAWIONE (logowanie tylko przy zmianie stanu, `count(distinct)` w zapytaniach, testy: powtórny wypis nie loguje).
2. Webhook gubił zdarzenia, gdy wyprzedzały zapis `resend_id`: NAPRAWIONE (zapis jako `unmatched`, test).
3. Teksty błędów mogły zawierać adres: NAPRAWIONE (`scrubDetail`, testy). `subscriber_id` w logach Vercel zostaje (to identyfikator techniczny, nie e-mail).
4. Klucze deduplikacji z `Date.now()` bez sensu: NAPRAWIONE (bez `source_id` dla `send_failed`/`send_rejected`; `send_uncertain` i `send_unrecorded` mają klucz stały, bo rezerwacja zostaje).
5. Migracja: indeks bez `CONCURRENTLY` (krótka blokada zapisów) - nie stosować w czwartek podczas crona; brak polityki retencji `drop_events` - do decyzji. Upsert z NULL w `source_id` to rozumowanie, nie test na Postgresie (brak lokalnego Postgresa).
6. Atrybucja do planu porównuje nazwę miasta z linku (`city_name` z `drop_deals`) z `dest.city`; przy różnej pisowni atrybucja zginie: NIEZWERYFIKOWANE w praktyce. Stary wpis w `sessionStorage` może przypisać późniejszy plan na to samo miasto.
7. Sformułowania w raporcie doprecyzowane (patrz wyżej).

Runda 2 recenzji nie została wykonana (limit czasu); poprawki mają testy, ale nie były ponownie recenzowane niezależnie.
