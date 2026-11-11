# Przepustka na wyjazd — design

Data: 2026-11-11 · Nowy model płatności Włóczykija, etapy 0–3 tej spec · Pisane pod `origin/main` (`a1b1016`, po Czwartkowym zrzucie)

## Po co

Dziś Włóczykij sprzedaje liczbę planów, a to najsłabszy towar, jaki ma: 5 darmowych planów wystarcza na rok weekendowych wyjazdów, a ChatGPT ułoży plan za darmo. Za to wszystko, co przydaje się w trasie (zmiana dnia, podmiana punktu, czat, PDF za ocenę), jest darmowe. Przed planem stoi logowanie. Linki do lotów i noclegów w aplikacji nie mają identyfikatora partnera, więc nic nie zarabiają, a GA4 nie widzi zakupów.

Cel: płaci ten, kto naprawdę jedzie, w chwili, gdy plan zaczyna być potrzebny w trasie. Do tego prowizje z tego, co plan i tak poleca: lotu, noclegu, biletów, przechowalni bagażu.

Miary sukcesu:
- odsetek wygenerowanych planów, do których ktoś kupił Przepustkę (z bazy);
- przychód na wygenerowany plan: Przepustki z bazy plus prowizje z paneli partnerów;
- konwersja według bramki: pokazania oferty z GA4, zakupy z bazy.

## Związek z modelem „D”

Ta spec zastępuje etap 2 z `2026-11-11-czwartkowy-zrzut-design.md`. 2 darmowe plany miesięcznie zostają, ale Pack znika, a jego miejsce zajmuje Przepustka. Czwartkowy zrzut (etap 1 modelu „D”) i alerty Pro (etap 3 modelu „D”) zostają bez zmian. Alerty dostaną osobną spec.

## Decyzje

Ustalone 2026-11-11:
- Przepustka kosztuje **4,99 zł** za jeden wyjazd.
- Bez Przepustki zostają **2 zmiany i 5 wiadomości na czacie na wyjazd**.
- Plan bez konta i zakup bez logowania to **osobny etap 3**.
- **Bez gwarancji zwrotu** ponad zasady §5 regulaminu.

Odrzucone:
- **„Odblokuj plan”** (pierwszy dzień za darmo, reszta płatna): blokuje prowizje i udostępnianie, a do tego wygląda jak przynęta.
- **Zostawienie kredytów i poprawienie samej bramki:** dalej sprzedaje to, co czat daje za darmo.
- **Eksport „jednym kliknięciem” do list w Google Maps i Apple Maps:** żadna z nich nie ma API do tworzenia list użytkownika, a KML trzeba ręcznie wgrać do My Maps na komputerze. Trasy dni w Google Maps już istnieją i zostają za darmo.
- **Weryfikacja planu przez człowieka w 12 h:** nie pasuje do decyzji w czwartek wieczorem i wylotu w piątek rano.
- **Kalkulator „oszczędzasz 4,5 h i 35 €” i obietnica „tylko miejsca 4.5+”:** liczby są zmyślone, a ocen nikt nie sprawdza. To sprzeczne z PRODUCT.md (Honest by default).
- **Kuratorowane przewodniki i transfery z lotniska:** później albo wcale.

## Model

### Co daje Przepustka

| | Bez Przepustki | Z Przepustką albo Pro |
|---|---|---|
| Plan, mapa, trasy dni w Google Maps, restauracje, lista pakowania, `.ics`, udostępnianie² | tak | tak |
| Ręczne dodanie punktu (bez AI) | tak | tak |
| Zmiany z AI: inny dzień, zamiana punktu, tryby z sekcji 2.3 | 2 na wyjazd | bez limitu¹ |
| Czat o wyjeździe | 5 wiadomości na wyjazd | bez limitu¹ |
| PDF | nie | tak |

¹ Limit uczciwego użycia: 30 zmian i 100 wiadomości na wyjazd na dobę.
² Od etapu 3 udostępnianie wymaga konta.

Zasady:
- Przepustka to jednorazowe 4,99 zł brutto za jeden wyjazd (`trip_id`), bez terminu ważności.
- Darmowe liczniki są na wyjazd i się nie odnawiają.
- Przepustka działa dla właściciela wyjazdu. Osoby z linkiem `/share/{id}` widzą plan jak dziś i niczego w nim nie zmieniają.
- Pro daje Przepustkę do każdego wyjazdu, dopóki subskrypcja jest aktywna (`isPro`). Ceny Pro się nie zmieniają.
- Pack znika ze sprzedaży: z cennika, z planu i z checkoutu. Webhook dalej obsługuje `pack_5`, bo mogą jeszcze dojść stare sesje. Kupione kredyty zostają.
- Ocena planu w `FeedbackWidget` przestaje odblokowywać PDF. Pełna opinia dalej daje +1 plan.

### Ile planów

- **Darmowe konto:** 2 plany w miesiącu kalendarzowym (strefa `Europe/Warsaw`), liczone z `trips` po `user_id` i `created_at`. Po nich schodzą kredyty z `credits_remaining` (stare z rejestracji, z Packa i za opinię). Gdy i tych zabraknie, odpowiedź to `402` z kodem `NO_CREDITS`.
- **Nowe konta** dostają `credits_remaining = 0`. Istniejące konta zachowują swoje kredyty.
- **Pro:** bez limitu.
- **Bez konta (etap 3):** 1 plan na urządzenie na dobę plus istniejący limit IP z `LIMITS.generate`.

## Etapy

Każdy etap ma własny plan wdrożenia i własny PR. Kolejność:

0. **Luki w bazie.** Warunek wstępny dla wszystkiego, co płatne. W toku w osobnej sesji (`rls-fix`).
1. **Pomiar i prowizje.** Bez zmian w cenniku i regulaminie poza §7.
2. **Przepustka dla zalogowanych.** Najpierw 2a, czyli zapowiedź zmian, potem 2b, czyli przełączenie.
3. **Plan bez konta i zakup bez logowania.**

## Etap 0 — luki w bazie

Według migracji użytkownik może sam przyznać sobie uprawnienia, a każdy z kluczem anon czyta wszystkie wyjazdy:
- polityka `update_own_profile` na `user_profiles` pozwala zmieniać `credits_remaining`, `subscription_tier`, `subscription_expires_at` i `stripe_customer_id`;
- `add_credits` (`SECURITY DEFINER`) jest wołana z sesji użytkownika w `src/app/api/feedback/route.ts`, więc da się ją wywołać z przeglądarki z dowolną liczbą;
- polityka `public_read_trips` ma `USING (true)`;
- w migracjach nie ma polityki UPDATE dla `trips`, a trasy zmian aktualizują wyjazdy sesją użytkownika.

Wymóg dla całej spec: **uprawnienia (Pro, kredyty, Przepustki, liczniki) zapisuje tylko serwer, kluczem serwisowym.** Nowe tabele mają włączone RLS i żadnych polityk dla `anon` ani `authenticated`. Migracja i przeniesienie zapisów powstają w sesji `rls-fix`.

## Etap 1 — pomiar i prowizje

### 1.1 Pomiar

Zdarzenia GA4 przez `trackEvent` z `src/lib/analytics.ts`:

| Zdarzenie | Kiedy | Parametry |
|---|---|---|
| `plan_generated` | po `done` ze streamu `/api/generate` | `city`, `days`, `anonymous` (od etapu 3) |
| `begin_checkout` | już jest, dochodzą parametry | `plan`, `gate`, `value`, `currency` |
| `purchase` | po potwierdzonej płatności, raz na transakcję | `transaction_id` (id sesji Stripe), `value`, `currency`, `items` |
| `affiliate_click` | kliknięcie w link partnera | `partner`, `placement` (`flight`, `hotel`, `tickets`, `luggage`), `city` |
| `paywall_view` | od etapu 2: pokazanie panelu z ofertą | `gate`, `city` |
| `edit_used` | od etapu 2: udana zmiana z AI | `kind` (`day`, `swap`, `rain`, `later`, `cheaper`, `custom`), `free_left` |

Wartości `gate`: `flight`, `edit`, `chat`, `pdf`, `email`, a dla zakupów Pro z cennika `pricing`.

W etapie 1 `purchase` dotyczy Pro i ostatnich Packów. Mały komponent kliencki na `/payment/success` wysyła zdarzenie raz na `session_id` (pamięć w `sessionStorage`, w try/catch).

Pieniądze liczymy z bazy (`payments`, od etapu 2 także `trip_passes`), bo GA4 nie przypisze zakupów osób, które odrzuciły ciasteczka. W parametrach zdarzeń nie ma danych osobowych.

Od etapu 2 `/admin/analytics` pokazuje liczbę Przepustek, przychód z nich, odsetek wyjazdów z ostatnich 30 dni z Przepustką i zakupy według `gate`.

### 1.2 Prowizje

Wszystkie linki partnerskie powstają w jednym miejscu: `src/lib/affiliate.ts`, czyste funkcje z testami. Każdy link ma:
- `target="_blank"` i `rel="sponsored noopener noreferrer"`;
- zdarzenie `affiliate_click`;
- drobny dopisek „link partnerski” w swojej sekcji.

W adresach są tylko miasto, nazwa atrakcji i daty, nigdy e-mail ani id użytkownika. Bez identyfikatora partnera w env link dalej działa, tylko bez prowizji.

- **Loty.** Linki w aplikacji prowadzą dziś do Skyscannera bez partnera (`src/lib/flights/search-url.ts` i lokalna `buildSkyscannerUrl` w `src/app/destinations/page.tsx`). `FlightOffer.affiliateUrl` jest liczone, ale nigdzie się nie wyświetla. Linki przechodzą na Aviasales z `TRAVELPAYOUTS_MARKER`, tak jak w zrzucie (`src/lib/drop/links.ts`). Gdyby Travelpayouts miał program Skyscannera, wystarczy podmienić jeden builder.
- **Karta lotu w planie.** Jeśli wyjazd ma `bestOffer`, plan dostaje kartę „Lot do {miasto}” z lotniskiem, ceną i datami. W etapie 2 kliknięcie w nią uruchamia bramkę `flight`.
- **Noclegi.** `buildBookingUrl` i `buildHostelworldUrl` przenoszą się do `affiliate.ts` i dostają identyfikator z `BOOKING_AFFILIATE_ID` i `HOSTELWORLD_AFFILIATE_ID`.
- **Bilety.** Kafelek aktywności typu `attraction`, której koszt nie jest darmowy (`cost` nie pasuje do `/free|bezpł|0 zł/i`), dostaje przycisk „Sprawdź bilety”. Przycisk prowadzi do wyszukiwarki GetYourGuide albo Tiqets z zapytaniem „{tytuł} {miasto}”. Builder wybiera partnera, który ma ustawione ID (`GETYOURGUIDE_PARTNER_ID` albo `TIQETS_PARTNER_ID`). Nigdy nie piszemy „bez kolejki” ani „najlepsza cena”, bo nie wiemy, co dany bilet daje.
- **Przechowalnia bagażu.** Ostatni dzień planu dostaje kafelek „Wymeldowanie przed wylotem? Zostaw bagaż na kilka godzin” z linkiem do Radical Storage albo Bounce dla miasta (`RADICAL_STORAGE_PARTNER_ID` albo `BOUNCE_PARTNER_ID`).
- **Regulamin §7** obejmuje loty, noclegi, bilety i przechowalnie. Dziś twierdzi, że linki do lotów idą przez Travelpayouts i mają `rel="sponsored"`, a w aplikacji ani jedno, ani drugie nie jest prawdą.

## Etap 2 — Przepustka dla zalogowanych

### 2.1 Dane

Migracja nazwana jak istniejące (`YYYYMMDDHHMMSS_trip_pass.sql`):

```sql
create table if not exists public.trip_passes (
  trip_id text primary key references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  source text not null check (source in ('purchase', 'grant')),
  stripe_session_id text unique,
  stripe_payment_intent text unique,
  amount_cents int,
  gate text,
  first_used_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_usage (
  trip_id text primary key references public.trips(id) on delete cascade,
  free_edits_used int not null default 0,
  free_chat_used int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.trip_passes enable row level security;
alter table public.trip_usage enable row level security;
-- bez polityk: dostęp tylko kluczem serwisowym
```

W tej samej migracji `handle_new_user` zaczyna wstawiać `credits_remaining = 0`.

- `source = 'grant'` to ręczne nadanie, np. gdy webhook zawiódł. Robi się je wpisem SQL w panelu Supabase.
- Ponowny zakup po zwrocie nadpisuje wiersz i czyści `refunded_at`.
- `first_used_at` ustawia się przy pierwszym użyciu płatnej funkcji po zakupie: zmiany z AI, wiadomości na czacie albo PDF. Od tego zależy prawo do odstąpienia (§5).

### 2.2 Dostęp

`src/lib/entitlements.ts`:

```ts
export interface TripAccess {
  isOwner: boolean;
  hasPass: boolean;                                   // Pro albo Przepustka bez zwrotu
  passSource: "pro" | "purchase" | "grant" | null;
  freeEditsLeft: number;                              // 0–2
  freeChatLeft: number;                               // 0–5
}

// Czysta funkcja, testowana bez sieci
export function computeTripAccess(input: {
  isOwner: boolean;
  profile: UserProfile | null;
  pass: TripPassRow | null;
  usage: TripUsageRow | null;
  now: Date;
}): TripAccess;

export async function getTripAccess(tripId: string, viewer: Viewer): Promise<TripAccess>;
```

W etapie 2 `Viewer` to `{ userId }`. W etapie 3 dochodzi `{ ownerTokenHash }`.

Kolejność w każdej trasie z AI (`regenerate-day`, `swap-activity`, `modify-day`, `chat`):
1. Czy pyta właściciel? Jeśli nie, `404`.
2. Czy jest `hasPass` albo zostały darmowe? Jeśli nie, `402` z `{ code: "PASS_REQUIRED", gate: "edit" | "chat" }`.
3. Limit uczciwego użycia przez istniejący `checkRateLimit`: `edit:{tripId}` 30 na dobę, `chat:{tripId}` 100 na dobę. Pamięć instancji wystarczy na start. Dziś `regenerate-day` i `swap-activity` nie mają żadnego limitu.
4. Wywołanie modelu.
5. Tylko po sukcesie: bez Przepustki licznik w `trip_usage` rośnie o 1 (upsert), a z Przepustką pierwsze użycie ustawia `first_used_at`. Dwa kliknięcia naraz mogą dać 3 darmowe zmiany zamiast 2. Akceptujemy to.

`GET /api/trips/[tripId]` zwraca dodatkowo `access` (bez `isOwner`). Na tej podstawie plan pokazuje liczniki i kłódki.

PDF powstaje w przeglądarce (`jsPDF`), więc jego blokada istnieje tylko w interfejsie. To świadoma decyzja: plan i tak jest za darmo na stronie, a serwer twardo pilnuje zmian i czatu. Przed wygenerowaniem PDF plan woła `POST /api/trips/[tripId]/pdf`, który sprawdza `hasPass` i ustawia `first_used_at`.

### 2.3 Silnik zmian `/api/modify-day`

Żądanie: `{ tripId, dayIndex, mode: "rain" | "later" | "cheaper" | "custom", hours?: 1 | 2 | 3, text?: string }`. `hours` jest wymagane przy `later`, `text` przy `custom` (do 300 znaków).

Odpowiedź `200` ma jeden z trzech kształtów:
- `{ status: "ok", day: DayPlan, summary: string }`;
- `{ status: "needs_clarification", question: string }`;
- `{ status: "impossible", message: string }`.

Do tego `402`, `404` i `429` jak w 2.2. Zmianę zużywa tylko `ok`.

Model jak w `regenerate-day`: `gemini-2.5-flash`, awaryjnie `gemini-2.5-flash-lite`. Kształt wyniku wymusza `responseMimeType: "application/json"` z `responseSchema`, a nie przykład z komentarzami w prompcie. Koszt idzie przez `logGeminiCall` z `endpoint: "modify-day"`.

Prompt składa czysta funkcja `buildModifyPrompt` w `src/lib/modifyDay.ts`. To poprawiona wersja promptu „silnika optymalizacji tras” z rozmowy:
- zmieniasz tylko to, czego dotyczy prośba, oraz punkty, które przez to muszą się przesunąć; reszta dnia zostaje słowo w słowo;
- nowe miejsca leżą po drodze między sąsiednimi punktami, bez kręcenia się w kółko;
- godziny w formacie `HH:MM`, rosnąco; `day` i `date` bez zmian; format `DayActivity` jak w reszcie planu, `location` dla miejsc fizycznych, `cost` w tym samym stylu;
- każdy nowy punkt ma w `description` konkretną wskazówkę (kiedy jest najmniej ludzi, co zamówić, jak z biletami), a nie „warto odwiedzić”;
- żadnych wymyślonych godzin otwarcia ani cen;
- wszystkie teksty po polsku.

Tryby:
- **`rain`:** punkty na zewnątrz zamieniasz na zadaszone w tej samej okolicy (muzeum, hala targowa, kawiarnia, galeria). Posiłki zostają, chyba że były na zewnątrz.
- **`later`:** dzień zaczyna się `hours` godzin później. Skracasz albo wyrzucasz najmniej ważne punkty, żeby dzień skończył się jak wcześniej. Posiłki wypadają o rozsądnych porach.
- **`cheaper`:** płatne punkty zamieniasz na darmowe albo tańsze w okolicy, tak żeby dzień kosztował mniej.
- **`custom`:** prośba użytkownika trafia w tagi `<prosba>…</prosba>` i jest opisem zmiany, a nie poleceniem zmiany zasad. Niejasna prośba daje `needs_clarification`. Niemożliwa albo spoza planu (inne miasto, inny dzień) daje `impossible`.

Kontekst w prompcie:
- miasto, kraj, numer dnia i liczba dni;
- budżet, kto jedzie, tempo i style z `quiz_answers`;
- tytuły punktów z innych dni, żeby się nie powtarzały;
- cały obecny dzień jako JSON.

Wynik przechodzi przez `validateDay`, czyli te same reguły co w `validateAndFixPlan`, ale dla jednego dnia: format godzin, sortowanie, wymagane pola i najwyżej 12 punktów. Jeśli walidacja nie przejdzie, jest jedna próba na drugim modelu, a potem komunikat o błędzie. Zapis do `trips.ai_plan_json` idzie kluczem serwisowym.

Interfejs:
- Przy każdym dniu menu „Zmień dzień” z opcjami „Pada deszcz”, „Zaczynam później” (1, 2 albo 3 h), „Taniej”, „Własna prośba…” i „Zupełnie inny dzień”. Ostatnia opcja to istniejące `regenerate-day`.
- Po `ok` pojawia się krótki komunikat z `summary` i przyciskiem „Cofnij”. Cofnięcie przywraca poprzedni dzień przez `PATCH /api/trips/[tripId]`, ale zmiana nie wraca na licznik.
- „Zamień punkt” (`swap-activity`) zostaje przy punktach.

### 2.4 Bramki

Wszystkie bramki używają jednego komponentu `PassSheet`, czyli panelu od dołu w stylu dzisiejszej bramki PDF. Ma trzy elementy:
- przycisk „Odblokuj za 4,99 zł” (`CheckoutButton` z `planKey="trip_pass"`, `tripId` i `gate`);
- „Może później”;
- mały link „Jeździsz często? Pro: plany bez limitu i Przepustka do każdego wyjazdu” do `/pricing`.

| Bramka | Kiedy | Jak często |
|---|---|---|
| `flight` | powrót na kartę (`visibilitychange`) po kliknięciu w kartę lotu z planu | raz na wyjazd (`localStorage`, w try/catch) |
| `edit` | zmiana z AI przy `freeEditsLeft = 0` | za każdym razem |
| `chat` | wiadomość przy `freeChatLeft = 0` | za każdym razem |
| `pdf` | kliknięcie w PDF bez Przepustki | za każdym razem |
| `email` | wejście z maila przed wyjazdem (`?oferta=1`) | przy otwarciu |

Wstępne teksty, do dopracowania przy wdrożeniu w głosie z BRAND.md:
- **`flight` i `email`:** „Lecisz do {miasto}? Weź plan ze sobą.” / „Za 4,99 zł zmieniasz ten plan bez limitu, także na miejscu: pada deszcz, wstajesz później, chcesz taniej. Do tego PDF na drogę.”
- **`edit`:** „Darmowe zmiany do tego wyjazdu się skończyły.” plus ten sam opis.
- **`chat`:** „Darmowe pytania do tego wyjazdu się skończyły.”
- **`pdf`:** „PDF jest w Przepustce.” / „Plan w telefonie bez internetu i zmiany bez limitu. 4,99 zł za ten wyjazd.”

Liczniki są widoczne: „Zostały 2 darmowe zmiany” przy menu zmian i „Zostały 3 darmowe pytania” pod polem czatu. W interfejsie wiadomości na czacie nazywamy pytaniami.

Z planu znikają baner z Packiem i Pro Rocznym oraz bramka PDF z „Oceń plan, 0 zł”. `FeedbackWidget` zostaje jako zwykła ocena.

Oferty nie pokazujemy przy pierwszym otwarciu planu ani w trakcie streamu. Bez odliczania czasu i bez sztucznej presji.

### 2.5 Płatność

**Plany i ceny:**
- `src/lib/stripe.ts`: nowy plan `trip_pass` (`STRIPE_PRICE_TRIP_PASS`, `type: "payment"`, `credits: 0`).
- `pack_5` dostaje `sellable: false`. `/api/checkout` go odrzuca, ale webhook dalej go obsługuje.
- `src/lib/prices.ts`: `tripPass: { amount: "4.99", label: "4,99 zł" }`.

**`/api/checkout`** przyjmuje `{ planKey: "trip_pass", tripId, gate }` i sprawdza, że wyjazd istnieje i należy do użytkownika. Jeśli wyjazd ma już aktywną Przepustkę, zwraca `{ already: true }` bez tworzenia sesji. Sesja Stripe:
- `mode: "payment"`, `customer` jak dziś, `locale: "pl"`;
- `success_url: /plan/{tripId}?session_id={CHECKOUT_SESSION_ID}`, `cancel_url: /plan/{tripId}`;
- `metadata` i `payment_intent_data.metadata`: `plan_key`, `trip_id`, `gate`, `supabase_user_id`;
- `consent_collection.terms_of_service: "required"` z tekstem w `custom_text.terms_of_service_acceptance.message`: „Chcę dostać Przepustkę od razu. Wiem, że po pierwszym użyciu płatnej funkcji tracę prawo do odstąpienia od umowy (§5 regulaminu).”

**Nadanie Przepustki.** Funkcja `grantTripPass(session)` w `src/lib/passes.ts` jest idempotentna. Sprawdza `payment_status === "paid"`, `plan_key` i to, czy wyjazd istnieje. Robi upsert w `trip_passes` i wpis w `payments` (unikalne `stripe_session_id`). Powiadomienie na Slacku idzie tylko przy pierwszym wpisie.

`grantTripPass` ma dwa wywołania:
- webhook: `checkout.session.completed` i `checkout.session.async_payment_succeeded`;
- `POST /api/passes/confirm` z `{ sessionId }`, które plan woła po powrocie z płatności. Trasa pobiera sesję ze Stripe i sprawdza, że `metadata.trip_id` i właściciel się zgadzają. Dzięki temu nie trzeba czekać na webhook.

**Powrót na plan.** Plan woła `confirm`, a potem:
- pokazuje komunikat „Przepustka działa. Zmieniaj, ile chcesz.”;
- wysyła `purchase` raz na sesję;
- usuwa `session_id` z adresu.

Jeśli płatność jeszcze się przetwarza, plan pokazuje „Płatność jeszcze się przetwarza” i sprawdza dostęp co 3 s przez minutę.

**Zwroty i spory.** Zwrot robisz ręcznie w panelu Stripe. Webhook `charge.refunded` szuka Przepustki po `stripe_payment_intent` i ustawia `refunded_at`. `charge.dispute.created` wysyła tylko powiadomienie na Slacku.

**Metody płatności** (BLIK, Przelewy24, karta, Apple Pay, Google Pay) włącza się w panelu Stripe. Kod żadnej z nich nie wyklucza.

### 2.6 Dwa plany miesięcznie

- Czysta funkcja `getPlanAllowance(profile, plansThisMonth)` w `src/lib/userProfile.ts` zwraca `{ canGenerate, consumes: "pro" | "monthly" | "credit" | null }` i zastępuje `canGenerate`.
- `/api/generate` liczy wyjazdy użytkownika od początku miesiąca w `Europe/Warsaw`. Kredyt odejmuje tylko wtedy, gdy `consumes === "credit"`.
- `/api/profile` zwraca `monthly_free_left`. Liczniki w `SiteNav`, na `/destinations` i w profilu pokazują „{n} plany w tym miesiącu” i ewentualne kredyty.
- Komunikat przy `402`: „Darmowe plany na ten miesiąc się skończyły. Kolejne od pierwszego dnia miesiąca albo bez limitu w Pro.”

### 2.7 Mail przed wyjazdem

`/api/cron/pre-trip-email` (codziennie o 07:00, 3 dni przed wylotem):
- temat bez emoji i wykrzyknika: „Za 3 dni lecisz do {miasto}. Plan czeka”;
- wyjazd bez Przepustki dostaje blok „Zmieniaj plan na miejscu” z linkiem `/plan/{id}?oferta=1`;
- wyjazd z Przepustką albo Pro dostaje ten sam mail bez oferty.

### 2.8 Cennik, teksty, regulamin

- **`/pricing`** ma trzy rodzaje kart:
  - darmową: 2 plany miesięcznie, 2 zmiany i 5 pytań na wyjazd;
  - Przepustkę: 4,99 zł za wyjazd, z przyciskiem „Ułóż plan” do `/quiz`, bo Przepustkę kupuje się z planu;
  - Pro: z nowym punktem „Przepustka do każdego wyjazdu”.

  Pack znika z kart, JSON-LD i metadanych, a ramka o zwrotach opisuje §5.
- **Teksty z „5 planami”** (stan na `origin/main`):
  - `src/app/components/HomeClient.tsx` (2 miejsca) i `src/app/components/HomeFAQ.tsx`;
  - `src/app/layout.tsx`, `src/app/login/layout.tsx` i `src/app/page.tsx` (2 miejsca);
  - `src/app/payment/success/page.tsx`, `src/app/pricing/page.tsx`, `src/app/quiz/page.tsx` i `src/app/start/page.tsx`;
  - `src/lib/stripe.ts`;
  - `PRODUCT.md` (monetyzacja i dozwolone twierdzenia) i `README.md`.
- **Regulamin:**
  - §2: Przepustka zamiast Packa, darmowe limity, Pro z Przepustkami;
  - §4: płatność jednorazowa za Przepustkę;
  - §5: na odstąpienie od Przepustki jest 14 dni, dopóki nie użyje się płatnej funkcji, a zgodę zbieramy przy zakupie; zakupy Packa bez zmian.

  Nowy tekst warto pokazać prawnikowi.

### 2.9 Zapowiedź i przełączenie

§11 regulaminu wymaga, żeby o istotnej zmianie powiadomić mailem wszystkie konta co najmniej 14 dni wcześniej. Ta zmiana jest istotna: darmowe zmiany i PDF przestają być darmowe, a 5 planów przy rejestracji zamienia się na 2 miesięcznie.

- **2a — zapowiedź.** Nowa wersja regulaminu trafia pod `/regulamin/od-{data}` z datą wejścia w życie. Mail do wszystkich kont mówi:
  - co się zmienia;
  - że kupione kredyty zostają;
  - że Pro dostaje Przepustki.

  W mailu jest też link do nowego regulaminu. Darmowy Resend wysyła 100 maili dziennie. Jeśli kont jest więcej, mail idzie partiami przez kolejne dni, a 14 dni liczy się od ostatniej partii.
- **2b — przełączenie.** Etap 2 idzie na produkcję w dniu wejścia w życie, a nowy tekst zastępuje `/regulamin`. Wcześniej wszystko jest testowane na Vercel Preview z kluczami testowymi Stripe.

## Etap 3 — plan bez konta i zakup bez logowania

### 3.1 Dane

Migracja:
- `trips.user_id` może być `null`;
- nowa kolumna `trips.owner_token_hash text` z indeksem;
- cron raz dziennie usuwa wyjazdy, które nie mają `user_id`, są starsze niż 30 dni i nie mają wiersza w `trip_passes`.

Ciasteczko `wl_owner` przechowuje losowy token (32 bajty): `httpOnly`, `Secure`, `SameSite=Lax`, na 90 dni, jedno na urządzenie. W bazie jest tylko skrót SHA-256 tokenu. To ciasteczko niezbędne do działania usługi, więc nie wymaga zgody. Trafia jednak do `/cookies` i polityki prywatności, razem z informacją, że wyjazdy bez konta są przechowywane 30 dni.

### 3.2 Generowanie bez konta

- `/api/generate` bez sesji pozwala na 1 plan na urządzenie na dobę (wyjazdy z tym `owner_token_hash` z ostatnich 24 h) plus limit IP. Wyjazd zapisuje się z `owner_token_hash`, bez `user_id`.
- `/quiz`, `/quick` i `/destinations` przestają wysyłać do logowania przed generowaniem. Z quizu znika tekst „Zaraz poprosimy o założenie konta”.
- Druga próba na tym samym urządzeniu kończy się `402` z kodem `ACCOUNT_REQUIRED` i tekstem „Załóż konto, żeby ułożyć kolejny. 2 plany miesięcznie za darmo.”
- Trasy z Gemini dostępne bez konta (`packing-list`, `restaurants`, zmiany, czat) dostają limit IP jak `generate`.

### 3.3 Dostęp bez konta

`getTripAccess` przyjmuje `{ ownerTokenHash }`. Właściciela z ciasteczkiem wpuszczają:
- `GET /api/trips/[tripId]`;
- trasy zmian i czat;
- lista pakowania i restauracje.

Udostępnianie i galeria `/odkryj` wymagają konta („Załóż konto, żeby udostępnić”).

### 3.4 Zakup bez logowania

- `/api/checkout` dla właściciela z ciasteczkiem tworzy sesję bez `customer`, z `customer_creation: "always"`. Token nigdy nie trafia do Stripe. Wystarcza `trip_id`, bo właściciela sprawdzamy przy tworzeniu sesji.
- `grantTripPass` nadaje Przepustkę z `user_id = null`, a potem `attachGuestPurchase(session)`:
  1. bierze e-mail z `session.customer_details.email`;
  2. przez Supabase Admin API znajduje konto o tym adresie albo zakłada nowe (dokładne wywołania w planie wdrożenia); adres potwierdza się przy pierwszym logowaniu z linku;
  3. ustawia `trips.user_id` i `trip_passes.user_id` dla tego wyjazdu, tylko jeśli `user_id` był pusty;
  4. wysyła przez Resend mail „Twój plan do {miasto} czeka” z linkiem logowania prowadzącym do `/plan/{id}`.
- Na urządzeniu, na którym był zakup, dostęp działa od razu dzięki `wl_owner`.
- Po każdym logowaniu `src/app/auth/callback/route.ts` przypina do konta wyjazdy bez `user_id`, które mają `owner_token_hash` tego urządzenia.
- Literówka w e-mailu podanym w Stripe: wyjazd zostaje na urządzeniu, a sprawa idzie na Slacka do ręcznej obsługi. Konto założone na cudzy adres dostaje tylko ten jeden wyjazd i niczego nie odsłania kupującemu.

## Błędy

- **Webhook później niż powrót z płatności:** nic się nie dzieje, bo `confirm` sam nadaje Przepustkę. **Webhook wcześniej:** `confirm` zastaje gotowy wiersz.
- **Ten sam `stripe_session_id` dwa razy:** jeden wiersz w `trip_passes`, jeden w `payments`, jedno powiadomienie.
- **Sesja Stripe z innym `trip_id` niż w adresie albo cudzy wyjazd:** `confirm` odmawia. Webhook nadaje Przepustkę wyjazdowi z metadanych.
- **Wyjazd usunięty przed płatnością:** wiersz w `payments`, powiadomienie na Slacku, zwrot ręcznie.
- **Błąd albo limit Gemini:** komunikat jak dziś („zwykle działa za drugim”), licznik bez zmian.
- **`needs_clarification` i `impossible`:** dzień bez zmian, licznik bez zmian.
- **Cudzy wyjazd w trasach zmian:** `404`.

## Testy (vitest)

Czyste funkcje, testowane bez sieci:
- **`computeTripAccess`:** właściciel albo nie; Pro, Przepustka, Przepustka po zwrocie, brak Przepustki; liczniki na granicach 0, 1, 2 i 5.
- **`getPlanAllowance`:** kolejność „miesięczne, potem kredyty, potem `402`”, Pro, przełom miesiąca w `Europe/Warsaw`.
- **`grantTripPass`:** idempotencja dla tej samej sesji, odrzucenie `payment_status !== "paid"` i złego `plan_key`.
- **Webhook:** `trip_pass`, stary `pack_5`, `async_payment_succeeded`, `charge.refunded`.
- **`buildModifyPrompt`:** instrukcje trybów, prośba w tagach, ucięcie do 300 znaków.
- **`validateDay`:** format, sortowanie i limity; zmianę zużywa tylko `ok`.
- **`affiliate.ts`:** linki z ID i bez, brak danych osobowych w adresach, rozpoznawanie darmowego kosztu.
- **Bramki i zdarzenia:** bramka `flight` raz na wyjazd, `purchase` raz na sesję.
- **Etap 3:** skrót i weryfikacja tokenu, przypinanie wyjazdów po logowaniu, wybór wyjazdów do usunięcia.

Stripe, Gemini, Supabase i Resend są mockowane.

Ręcznie:
- tryb testowy Stripe: karta, kod testowy BLIK, Apple Pay na iPhonie, płatność odroczona, zwrot;
- w etapie 3 cały przepływ w przeglądarce wbudowanej w Instagram, na iPhonie i na Androidzie.

## Warunki wstępne (poza kodem)

- **Stripe:**
  - produkt „Przepustka na wyjazd” z jednorazową ceną 4,99 zł w PLN;
  - włączone BLIK, Przelewy24, Apple Pay i Google Pay;
  - adres regulaminu w ustawieniach, bo wymaga go `consent_collection`;
  - w webhooku zdarzenia `checkout.session.async_payment_succeeded`, `charge.refunded` i `charge.dispute.created`.
- **Programy partnerskie:** Booking, Hostelworld, GetYourGuide albo Tiqets, Radical Storage albo Bounce. `TRAVELPAYOUTS_MARKER` jest już potrzebny dla zrzutu.
- **Env:** `STRIPE_PRICE_TRIP_PASS`, `BOOKING_AFFILIATE_ID`, `HOSTELWORLD_AFFILIATE_ID`, `GETYOURGUIDE_PARTNER_ID` albo `TIQETS_PARTNER_ID`, `RADICAL_STORAGE_PARTNER_ID` albo `BOUNCE_PARTNER_ID`.
- **Prawnik:** zmiany w §2, §4, §5 i §7 regulaminu oraz w polityce prywatności (etap 3).

## Ryzyka

- **Cena a opłaty.** Przy 4,99 zł stała część opłaty Stripe (w Polsce około 1 zł od transakcji, do sprawdzenia w cenniku Stripe) to mniej więcej piąta część przychodu. Cenę przeglądamy po pierwszych 100 zakupach, bramki po 100 pokazaniach oferty.
- **Reakcja darmowych użytkowników** na utratę darmowych zmian i PDF za ocenę. Mail z etapu 2a mówi wprost, co zostaje za darmo.
- **Limit uczciwego użycia w pamięci instancji** da się obejść, gdy Vercel uruchomi kilka instancji. Na start to wystarczy. Przy nadużyciach licznik dzienny przeniesiemy do bazy.
- **Koszt planów bez konta.** Pilnujemy `gemini_usage_log` w `/admin`. Przy nadużyciach zaostrzamy limit na urządzenie.

## Poza zakresem

- Tryb offline w aplikacji (wystarcza PDF).
- Przypomnienia w kalendarzu z godzinami.
- Przewodniki i weryfikacja planu przez człowieka.
- Transfery z lotniska.
- Kalkulator oszczędności i obietnice ocen.
- Listy w Google Maps i Apple Maps.
- Pogoda z API.
- Gwarancja zwrotu ponad §5.
- Zmiana cen Pro i alerty Pro (osobna spec).
- Aplikacja natywna.
