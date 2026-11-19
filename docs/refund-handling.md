# Obsługa zwrotów Stripe

Stan implementacji: 2026-11-16, brief `refund-automation`, gałąź `feat/refund-automation`.
Kod gotowy do przeglądu; **migracja nie została zastosowana na żadnej bazie**.
Publiczny endpoint pozostaje `/api/webhook`.

## Zachowanie webhooka i rejestru

Podpis Stripe jest sprawdzany na surowym body przed dostępem do Stripe API lub bazy.
Brak/błędny podpis daje 400. `charge.refunded` trafia do RPC `process_credit_refund`.

- **Pełny zwrot Packa z potwierdzonym grantem:** atomowe odjęcie historycznego
  `payments.credits_added`, nigdy poniżej zera. Nie używamy aktualnej wielkości pakietu.
- **Częściowy zwrot:** trwały `manual_review`, bez proporcji i bez zmiany salda.
  Kolejny pełny zwrot przetwarza pełną liczbę uprawnień tylko raz.
- **Pro miesięczne/roczne i odnowienia:** trwały `manual_review`, bez odebrania Pro
  ani zmiany daty jego wygaśnięcia. Inne płatności fakturowe też pozostają ręczne.
- **Nieznana płatność:** trwały `pending_payment`, wynik RPC `missing_payment`,
  bez zgadywania użytkownika na podstawie Customer. Dostawa Checkout później
  uruchamia uzgodnienie pending w transakcji grantu nowego Packa. Ponowna dostawa
  tego samego pending eventu również pozwala na uzgodnienie.
- **Historyczny/niepotwierdzony grant, niezgodna kwota/waluta/PI/sesja lub nieznany
  produkt:** `manual_review`, bez potrącenia. Brak backfillu historycznych grantów.
- **Powtórzony zamknięty event:** wynik `skipped` z dotychczasowym statusem i zerem
  nowych potrąceń. Inny event tego samego Charge jest ograniczony licznikami płatności.
- **Błąd RPC:** 500 do ponowienia przez Stripe. Transakcja cofa rejestr, saldo i
  liczniki; nie ma osobnego REST-owego UPDATE salda. Błąd odczytu Stripe również daje 500.

Powiązanie: PaymentIntent → Checkout Session → `payments.stripe_session_id` albo
bezpośrednio nowe `payments.stripe_payment_intent_id`. Stripe Checkout listujemy
z filtrem `payment_intent`, nie po Customer. Jeżeli nie ma sesji, sprawdzamy
`invoicePayments` po tym samym PaymentIntent (odnowienia nie mają własnego wpisu
w `payments`). Subskrypcyjny Checkout i płatności fakturowe trafiają do ręcznej obsługi.
Metadane Charge i aktualny tier profilu nie służą do rozpoznawania produktu.
Są to wyłącznie odczyty Stripe, bez tworzenia zwrotów i zmian ustawień.

`payment_refund_events` zapisuje ID eventu jako PK, typ, Charge/PaymentIntent/Checkout,
opcjonalne powiązanie płatności, Customer, live/test, czas Stripe i odbioru, walutę,
kwotę Charge i skumulowaną kwotę zwrotu, status/przyczynę, faktycznie odjęte kredyty
oraz pola `reviewed_at` i `review_reference` dla operatora. Nie przechowuje payloadu,
danych karty, e-maila ani metadanych użytkownika. RLS bez polityk użytkownika i jawne
REVOKE od anon/authenticated/PUBLIC; dostęp tabeli i EXECUTE obu RPC tylko service_role.
Funkcje SECURITY DEFINER mają pusty `search_path` i kwalifikowane nazwy tabel.

`amount_refunded` jest **snapshotem łącznej kwoty**, nie deltą. Przechowujemy maksimum,
a nie sumę. Opóźniony mniejszy snapshot nie cofa stanu. Pełny zwrot ustawia docelowe
`refund_credits_processed = credits_added`; `refund_credits_debited` zapisuje tylko
faktyczne potrącenie. Także przy saldzie 0 przetwarzamy całą deltę, aby następny zakup
nie spłacał starego zwrotu. Miesięczne darmowe plany i pola Pro pozostają nienaruszone.

RPC zwraca JSON: `outcome` (`applied`/`skipped`/`missing_payment`), `status`, `reason`,
`credits_debited` (potrącone przez to wywołanie). Duplikat nie nadpisuje poprzedniego
wyniku w rejestrze. Pending jest stanem przejściowym, a nie trwałym pominięciem.

## Potwierdzenie grantu i współbieżność

Nowa migracja: `supabase/migrations/20261116120000_refund_automation.sql`.
Zawiera rozszerzenie `payments`, rejestr, dwa RPC i uprawnienia, w jednej transakcji.
Nie zmienia starych migracji ani istniejących sald/grantów/powiązań Stripe.
Nowe liczniki mają domyślne zero; historyczny `grant_status` i PaymentIntent zostają NULL.

Zachowano kolejność Checkout **insert płatności → grant → rollback przy błędzie**.
Nowy insert zapisuje PI i `grant_status = pending` dla Packa. Krok `add_credits`
zastępuje `grant_credit_pack`: blokuje płatność i profil, dodaje historyczne kredyty,
oznacza grant jako `applied` i rozlicza oczekujące refundy w tej samej transakcji.
Grant i refund biorą tę samą transakcyjną blokadę doradczą po PI przed blokadami wierszy.
UPDATE profilu współpracuje z istniejącym atomowym `consume_plan_credit`/`add_credits`.

Duplikat insertu Packa wywołuje idempotentny grant, aby dokończyć przerwany proces
między insertem a grantem; `applied`/historyczny NULL nie przyznaje ponownie kredytów.
Rollback usuwa tylko nowo wstawiony Pack nadal w stanie `pending`, więc utrata odpowiedzi
po zatwierdzonym grancie nie usuwa jego klucza idempotencji. Nie kasuje rekordu
napotkanego jako duplikat. Pro, odnowienia i anulowanie zachowują dotychczasową kolejność.
Znana luka przerwania procesu między insertem Pro a jego aktualizacją nie jest tutaj
przebudowana. Brak PI (np. rabat 100%) nie przeszkadza w atomowym grancie Packa;
bez wiarygodnego powiązania PI zwrot nie uruchomi automatycznego potrącenia.

Stary kod działający między migracją a wdrożeniem nadal zapisuje NULL `grant_status`.
Nie wolno go zbiorczo oznaczyć jako `applied`: istnienie `payments` nie dowodzi grantu.
Nie dodano migracji danych historycznych ani automatycznego backfillu Stripe.

## Kolejność wdrożenia (lead)

1. Przejrzeć nową migrację i zasady: częściowe zwroty i Pro są ręczne. Właściciel
   udzielił zgody na **napisanie** migracji 2026-11-16; jej wykonanie jest osobnym krokiem leada.
2. Zastosować migrację najpierw na odizolowanej bazie testowej, dopiero po przeglądzie.
   Uruchomić `supabase/tests/refund_automation.sql` z `ON_ERROR_STOP=1` jako właściciel
   testowej bazy; fixture'y są objęte rollbackiem. Nie uruchamiać fixture'ów na produkcji.
   Sprawdzić też równoległy grant/refund/zużycie kredytu w dwóch sesjach PostgreSQL.
3. Zastosować zatwierdzoną migrację na bazie produkcyjnej **przed kodem** i odczekać
   odświeżenie cache schematu PostgREST (migracja wysyła `NOTIFY pgrst, 'reload schema'`).
   Zweryfikować widoczność obu RPC dla service role i brak dostępu anon/authenticated.
4. Wdrożyć kod. Zachować istniejące env; nie dodano zależności aplikacji ani nowych env.
   Jeżeli klucz Stripe jest ograniczony, musi pozwalać na odczyt Checkout Sessions
   i Invoice Payments. Nie zmieniano kluczy ani konfiguracji kont.
5. Sprawdzić dostarczanie snapshot eventu `charge.refunded` do istniejącego
   `/api/webhook` oraz zgodność wersji API z `src/lib/stripe.ts`. W Stripe test mode
   wykonać nowy zakup Packa, pełny/częściowy refund i ponowienie eventu, oba Pro i
   odnowienie. Porównać rejestr, saldo, pola Pro i darmowy miesięczny limit.
6. Wyznaczyć operatora do `manual_review`/`pending_payment`, zapewnić retencję i
   monitorowanie logów oraz rejestru. Właściciel ustala retencję i postępowanie po
   usunięciu konta: FK płatności ma `ON DELETE SET NULL`; identyfikatory Stripe
   w rejestrze pozostają. Nie dodano automatycznego czyszczenia.

### Gdy kod wyjdzie przed migracją

- Refund: brak **właśnie `process_credit_refund`** (`PGRST202`/`42883`) jest tolerowany:
  200 + dotychczasowy log `Webhook: refund requires manual review`, `status: manual_review`,
  `reason: refund_migration_missing`, bez zmiany uprawnień. **Brak trwałego rejestru
  tego eventu**, dopóki nie powstanie funkcja. Operator musi uzgodnić te logi i po
  migracji ponowić eventy ze Stripe; samo wdrożenie bazy ich nie odtwarza.
- Checkout: brak nowych kolumn (`PGRST204`/`42703` tylko dla PI/grant_status) przełącza
  insert na dawny schemat i grant przez dotychczasowe `add_credits`. Te zakupy zostają
  historyczne/niepotwierdzone i wymagają ręcznego rozliczenia zwrotu po migracji.
- Inne błędy (uprawnienia, timeout, brak tabeli, brak wewnętrznej funkcji SQL) nie
  udają sukcesu: 500. Brak `grant_credit_pack` przy istniejących nowych kolumnach
  także daje 500 i rollback pending, bez ryzykownego podwójnego grantu.
- Samo cofnięcie kodu nie wymaga cofania addytywnej migracji; stary kod może działać
  z nowym schematem, a nowe starego typu wpisy pozostają niepotwierdzone.

## Ręczna obsługa i granice automatu

Log zawiera wyłącznie identyfikatory i kwoty potrzebne do uzgodnienia Stripe.
`manual_review` i `pending_payment` nadal logują `Webhook: refund requires manual review`.
Operator sprawdza PI → Checkout/Invoice → produkt → faktyczny grant i zapisuje decyzję
przez `reviewed_at`/`review_reference`. To nie jest panel obsługi ani potwierdzenie
wykonania korekty finansowej. Nie dodano UI, kolejki, crona ani automatycznego
ponawiania historycznych/niepotwierdzonych grantów. Nowe pending Packi uzgadnia grant;
pozostałe pending wymagają obserwacji i ponowienia eventu po rozpoznaniu płatności.

Nie wolno odejmować przez `add_credits(-N)` ani wykonywać osobnego SELECT/UPDATE salda.
Ewentualna ręczna korekta częściowego zwrotu musi mieć własną zatwierdzoną transakcję
z blokadą płatności/profilu oraz spójną aktualizacją liczników: sam wpis o przeglądzie
nie zapobiega ponownemu potrąceniu przy późniejszym pełnym zwrocie. Takiego narzędzia
nie zaimplementowano. Automatyzacja nie zmienia subskrypcji Stripe ani nie wysyła wiadomości.

## Weryfikacja lokalna

```bash
npm ci
npm test
npm run lint
npm run typecheck
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon SUPABASE_SERVICE_ROLE_KEY=test-service STRIPE_SECRET_KEY=sk_test_placeholder STRIPE_WEBHOOK_SECRET=whsec_placeholder GEMINI_API_KEY=test-gemini npm run build
```

`src/app/api/webhook/route.test.ts` sprawdza pełny/częściowy/duplikat/nieznany refund,
Pro miesięczne/roczne i odnowienie, skumulowane kwoty w odwrotnej kolejności,
rozszerzone ID, ochronę danych w logach, brak/błędny podpis, błędy i brak RPC,
legacy Checkout oraz kolejność insert/grant/rollback i retry przerwanego grantu.
To testy granicy HTTP/RPC z mockami; nie dowodzą wykonania potrącenia przez PostgreSQL.

`supabase/tests/refund_automation.sql` sprawdza rzeczywiste salda, historyczną wielkość
Packa, minimum 0, idempotencję eventu i płatności, częściowe snapshoty, refund przed
Checkout/grantem, brak ponownego grantu historycznego, Pro, mismatch i uprawnienia,
rollback po wymuszonym błędzie zapisu rejestru oraz rollback grantu z pending refundem.
**Nie uruchomiono tych testów ani migracji na bazie**, zgodnie z briefem.
Parser PostgreSQL (pglast, wyłącznie tymczasowo poza repo) sprawdził składnię SQL
oraz PL/pgSQL obu plików, bez wykonywania SQL i bez zależności w package.json.
Nie wykonano prawdziwych zwrotów ani zmian na produkcji/Stripe.

Wyniki z 2026-11-16: `npm ci` OK (lockfile bez zmian), `npm test` **1066/1066**
w 96 plikach (38 testów webhooka), lint **0 błędów / 27 istniejących ostrzeżeń**,
typecheck OK, build z atrapami env OK (119 stron). Build loguje oczekiwane błędy
odczytu `drop_deals` z fikcyjnego Supabase i ostrzeżenie o istniejącym Edge Runtime.
`npm ci` zgłasza 8 moderate vulnerabilities; zależności nie były częścią tego briefu.

## Przekazanie zmian leadowi

Commit/push nie zostały wykonane: sandbox odmówił utworzenia
`/Users/kacpercelejewski/Documents/Code/travel apka/wloczykij-app/.git/worktrees/wloczykij-app-refunds/index.lock`
(`Operation not permitted`). Zgodnie z briefem pozostawiono niezacommitowane zmiany
na `feat/refund-automation`. Bez PR, merge, force push i operacji na bazie.
Planowany commit: `feat(stripe): automate full pack refunds with an atomic ledger`.
Do commitu należą wyłącznie `docs/refund-handling.md`, `src/app/api/webhook/route.ts`,
`src/app/api/webhook/route.test.ts`, `src/lib/stripe-refunds.ts`,
`supabase/migrations/20261116120000_refund_automation.sql` oraz
`supabase/tests/refund_automation.sql`. Po commicie lead może wykonać
`git push -u origin feat/refund-automation` bez force; migrację wdraża osobno,
w kolejności opisanej powyżej.

## Baner cookies — poprzedni brief (bez zmian w tym zadaniu)


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
