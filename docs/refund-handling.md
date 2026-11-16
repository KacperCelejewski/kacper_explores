# Obsługa zwrotów Stripe

Stan: 2026-11-16, brief `fix-compliance`. Implementacja w `src/app/api/webhook/route.ts`
(publiczny adres `/api/webhook`), nie w ścieżce `/api/webhooks/stripe` podanej w briefie.

## Zakres wdrożonego kodu bez migracji

Po weryfikacji podpisu na surowym body webhook rozpoznaje `charge.refunded` i zapisuje
ustrukturyzowany log `Webhook: refund requires manual review`, ze statusem
`manual_review_required`. Zawiera ID zdarzenia, datę zdarzenia (Unix), tryb live/test,
ID Charge, PaymentIntent i Customer, walutę, kwotę płatności, **łączną** kwotę zwrotów
oraz oznaczenie pełnego/częściowego zwrotu. Nie logujemy całego payloadu, danych karty,
e-maila ani metadanych użytkownika. Rozwinięte obiekty Stripe redukujemy do ID.

**Pack: automatyczne odbieranie kredytów jest odłożone do zatwierdzenia migracji.**
**Pro: wyłącznie oznaczenie w logu do ręcznej decyzji; nie odbieramy Pro.**
Każdy zwrot, także odnowienie Pro, częściowy i nierozpoznana płatność, trafia do tej
samej ręcznej obsługi. Nie próbujemy wywnioskować planu z aktualnego tieru klienta
ani z metadanych Charge (Checkout nie kopiuje tam naszych metadanych sesji).

Odpowiedź `200 { ok: true }` potwierdza odbiór do ręcznej obsługi, **nie rozliczenie
kredytów**. Handler nie dotyka bazy ani Stripe API i nie wysyła dodatkowych wiadomości.
Powtórzony event może dać kolejny identyczny log; saldo i Pro pozostają bez zmian.
Nie ma trwałej deduplikacji po `event.id`, kolejki zadań ani potwierdzenia obsługi przez
operatora. Logi nie zastępują takiego rejestru. Nie należy ponawiać ręcznych potrąceń
na podstawie samej liczby logów. Nie zmieniono dotychczasowej kolejności insert/grant/
rollback dla Checkout, odnowień i anulowania subskrypcji.

## Dlaczego nie wolno bezpiecznie odjąć kredytów w obecnym schemacie

Źródła: `supabase/migrations/20260513195842_initial_schema.sql`,
`20261111180000_close_rls_gaps.sql`, `20261112000000_monthly_free_plans.sql`
i `src/app/api/webhook/route.ts`.

- `payments` zapisuje `stripe_session_id UNIQUE`, `credits_added`, `plan_type`, kwotę
  i użytkownika, ale nie ID zdarzenia zwrotu, Charge/PaymentIntent ani stanu zwrotów.
- `add_credits` dodaje dowolną liczbę do salda bez ograniczenia do zera i bez rejestru
  zdarzeń. Wywołanie go z `-5` nie zapewnia wymagań briefu.
- `SELECT salda` → `UPDATE max(0, saldo - 5)` ściga się z generowaniem i zakupami.
  Oddzielny zapis „obsłużone” przed/po potrąceniu pozostawia okno utraty lub powtórzenia
  potrącenia. Stan w pamięci procesu nie chroni przed restartem ani wieloma instancjami.
- Płatności odnowień Pro nie mają osobnych rekordów w `payments`; nie należy dopasowywać
  starego zakupu po samym Customer. Nieznana płatność może też oznaczać opóźniony Checkout.
- Istniejący Checkout najpierw wstawia `payments`, potem przyznaje dostęp. Awaria procesu
  między tymi operacjami może pozostawić wpis bez grantu; samo istnienie wpisu nie jest
  dowodem przyznania kredytów. Refundu nie wolno potrącić przed późniejszym grantem.

## Proponowany schemat — wymaga zgody właściciela, nie dodano plików migracji

Minimalny bezpieczny wariant to trwały rejestr zdarzeń i jedna transakcja PostgreSQL,
nie sekwencja zapytań REST. Nazwy poniżej są projektem, a nie istniejącymi tabelami/RPC.

1. Rozszerzenie `payments`: `stripe_payment_intent_id TEXT UNIQUE` (nullable dla starych
   danych i sesji bez płatności), `grant_status` (`pending`/`applied`),
   `refunded_amount_cents INT NOT NULL DEFAULT 0`,
   `refund_credits_processed INT NOT NULL DEFAULT 0`,
   `refund_credits_debited INT NOT NULL DEFAULT 0`. Ograniczenia nieujemności i
   `refund_credits_debited <= refund_credits_processed <= credits_added`.
   Historycznych wpisów nie oznaczać jako `applied` bez uzgodnienia.
2. Tabela `payment_refund_events`: `stripe_event_id TEXT PRIMARY KEY`, `stripe_charge_id`,
   `stripe_payment_intent_id`, opcjonalny `payment_id`, `stripe_customer_id`, `livemode`,
   `event_created`, `received_at`, `currency`, kwota Charge i łączna kwota zwrotów,
   `status` (`pending_payment`/`manual_review`/`applied`/`ignored`), przyczyna, liczba
   faktycznie odjętych kredytów, `reviewed_at` i identyfikator operatora/decyzji.
   RLS; brak dostępu anon/authenticated; zapis/RPC tylko service_role. Brak payloadu
   z danymi karty. Politykę retencji i zachowanie po usunięciu konta zatwierdza właściciel.
3. RPC obsługi zwrotu: w **jednej transakcji** wstawienie event ID z deduplikacją,
   blokada właściwej płatności i profilu `FOR UPDATE`, weryfikacja powiązania, waluty,
   kwot i `grant_status`, aktualizacja salda i znaczników, zapis wyniku. Błąd cofa całość;
   webhook odpowiada 5xx. Duplikat event ID zwraca zapisany wynik bez potrącenia.
4. Samo event ID nie wystarcza: kilka eventów może dotyczyć jednego Charge, a dostawa
   może być w odwrotnej kolejności. Przechowujemy największą potwierdzoną łączną kwotę
   zwrotów; nigdy nie sumujemy snapshotów `amount_refunded`. Pełny zwrot Packa ustawia
   docelową liczbę odebranych uprawnień na **historyczne `credits_added`**, nie bieżące
   `PLANS.pack_5.credits`. Delta = cel minus `refund_credits_processed`.
   Saldo = `greatest(0, saldo - delta)`; faktycznie odjęte = `least(saldo, delta)`.
   Przetworzoną deltę zapisujemy również przy saldzie 0, żeby później nie zabrać
   kredytów z nowego zakupu. Darmowy miesięczny limit i Pro pozostają nienaruszone.
5. **Propozycja dla częściowych zwrotów: ręczna decyzja, bez automatycznej proporcji.**
   Kredyt jest niepodzielny, a brief nie ustala zaokrągleń ani zasad po zużyciu planów.
   Właściciel zatwierdza tę zasadę albo dokładny wzór kumulatywny przed automatyzacją.
   Pełny zwrot po częściowym nie może odebrać więcej niż pierwotnie przyznano.
6. Nieznany PaymentIntent zapisujemy jako `pending_payment`, bez modyfikacji profilu.
   Powiązanie: PaymentIntent → sesja Checkout w Stripe → `payments.stripe_session_id`,
   nie sam klient. Odnowienia Pro pozostają `manual_review`. Potrzebne ponowne
   uzgadnianie pending po przyjściu płatności; duplikat eventu nie może utrwalić stanu
   „nieznana” na zawsze. Nie zwracamy 200 przed trwałym zapisem.
7. Przed włączeniem potrąceń trzeba atomowo przyznawać Pack i oznaczać grant jako
   `applied`, z idempotencją sesji i obsługą oczekujących refundów pod tymi samymi
   blokadami. Migracja wymaga uzgodnienia historycznych grantów oraz powiązań Stripe.
   W tym zadaniu nie przebudowano krytycznej ścieżki Checkout.

Nie wykorzystujemy `payments.stripe_session_id` do przechowywania `evt_*` ani sztucznych
ujemnych płatności: zniekształciłoby to historię i statystyki przychodu.

## Weryfikacja i wymagania produkcji

Testy `src/app/api/webhook/route.test.ts` obejmują dotychczasowy Checkout oraz pełny,
częściowy, powtórzony, nieznany zwrot, odwróconą kolejność snapshotów, oba Pro,
rozszerzone ID, brak wycieku e-maila i odrzucenie brakującego/błędnego podpisu.
Potwierdzają **wariant ręczny**, nie nieistniejące automatyczne potrącenia.

```bash
npm ci
npm test
npm run lint
npm run typecheck
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon SUPABASE_SERVICE_ROLE_KEY=test-service STRIPE_SECRET_KEY=sk_test_placeholder STRIPE_WEBHOOK_SECRET=whsec_placeholder GEMINI_API_KEY=test-gemini npm run build
```

Właściciel/lead przed wdrożeniem:

- Sprawdzić/dodać dostarczanie `charge.refunded` do **istniejącego** endpointu
  `/api/webhook` w Stripe (snapshot, z kompatybilną wersją API). Nie zmieniano panelu.
- Potwierdzić dostępność i retencję logów środowiska wdrożenia oraz wyznaczyć osobę,
  która sprawdza `refund requires manual review`. Jeżeli logi nie są monitorowane,
  sama ta zmiana nie zapewnia procesu obsługi zwrotów.
- W Stripe test mode wykonać zwrot pełny i częściowy Packa oraz Pro i ponowić ten sam
  event; porównać ID w logach. Oczekiwane: 200 i brak automatycznej zmiany salda/Pro.
- Dla każdego logu uzgodnić w Stripe Charge → PaymentIntent → Checkout/Invoice → produkt
  i użytkownika. Zarejestrować własną decyzję i event ID; przy kilku częściowych zwrotach
  porównywać skumulowaną kwotę, nie sumować logów. Dla Packa dopiero po potwierdzeniu
  faktycznego grantu ustalić korektę; dla Pro zdecydować osobno o dostępie/subskrypcji.
  Nie odejmować kredytów przez obecne `add_credits(-N)`; korekta musi respektować saldo
  0 i równoległe operacje. Bez zgody na bezpieczną transakcję/migrację nie ma automatu.
- Zatwierdzić powyższy schemat, zasady częściowych zwrotów i osobne wdrożenie atomowego
  grantu/refundu, jeśli wymagane jest automatyczne odbieranie kredytów.

Bez nowych env, migracji Supabase i zmian `features.ts`. Nie przeprowadzono rzeczywistych
zwrotów, operacji na produkcji ani zmian ustawień kont.

## Baner cookies — drugi krok briefu

Obie opcje mają ten sam obiekt stylu (szerokość, grubość i kolor obramowania, tło,
kolor tekstu, wagę i rozmiar pisma, min. 44 px wysokości), kolejność DOM jest zgodna
z kolejnością wizualną. Brak autofocus i domyślnego wyboru; zachowany globalny
`:focus-visible`. GA4 jest ładowane dopiero po akceptacji; wysyłanie zdarzeń sprawdza
aktualną zgodę. Cofnięcie zgody, również w drugiej karcie, wyłącza już załadowane GA.
Politykę cookies dostosowano do tej zmiany. Linki partnerskie zachowują dotychczasową
bramkę zgody; anonimowy licznik `/api/track` pozostaje niezależny od GA4.

Ręcznie na podglądzie, na telefonie i desktopie, w jasnym/ciemnym motywie: po wyczyszczeniu
`cookie_consent` sprawdzić równe przyciski, fokus Tab i aktywację Enter/Space; przed zgodą
oraz po „Tylko niezbędne” w Network brak GA i brak markerów w linkach partnerskich.
Po akceptacji GA i markery są aktywne; „Zmień zgodę na cookies” wycofuje akceptację.
Powtórzyć z dwiema kartami. W testach sieci używać istniejącego `NEXT_PUBLIC_GA_ID`.
Cookies zapisanych przed cofnięciem zgody ta zmiana nie usuwa.

## Dokumentacja dostawcy

Sprawdzone 2026-11-16: [typy zdarzeń Stripe](https://docs.stripe.com/api/events/types)
(`charge.refunded` obejmuje też częściowe zwroty),
[obiekt Charge](https://docs.stripe.com/api/charges/object) (`amount_refunded`),
[webhooki Stripe](https://docs.stripe.com/webhooks) (podpis, ponowienia, deduplikacja,
brak gwarancji kolejności).

## Wynik lokalnej weryfikacji (2026-11-16)

- `npm ci`: zakończone powodzeniem, bez zmiany lockfile.
- Pełne `npm test`: 998 testów w 96 plikach; `npm run typecheck`: powodzenie;
  `npm run lint`: 0 błędów, 27 ostrzeżeń; build z atrapami env: powodzenie.
- Na lokalnym serwerze produkcyjnym sprawdzono HTTP `/api/webhook` z podpisami HMAC
  akceptowanymi przez prawdziwe `stripe.webhooks.constructEvent`: zwrot pełny,
  częściowy, powtórzony i nieznany → 200 + log do obsługi ręcznej; błędny i brakujący
  podpis → 400. Bez połączeń do Stripe/Supabase i bez rzeczywistych zwrotów.
- Testu wizualnego/klawiaturowego nie wykonano: host przeglądarki był niedostępny,
  a narzędzie Computer Use nie miało zgody na dostęp do Chrome. Pozostaje checklista
  podglądu powyżej. Równość stylów i zachowanie zgód sprawdzono testami komponentów.
- Commit/push zablokowane przez sandbox: `git add` nie może utworzyć
  `.git/worktrees/wloczykij-app-compliance/index.lock` (`Operation not permitted`).
  Zgodnie z briefem pozostawiono niezacommitowane zmiany na
  `fix/compliance-refunds-cookies`; bez PR i merge. Planowane dwa commity:
  `fix(cookies): give consent choices equal prominence and gate GA4` oraz
  `fix(stripe): flag refunds for manual review pending an atomic ledger`.
