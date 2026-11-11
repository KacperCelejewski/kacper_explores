# Czwartkowy zrzut — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cotygodniowy mail z maksymalnie 3 weekendowymi okazjami z lotniska subskrybenta, w jego budżecie, z zajawką od Gemini, dla każdego z potwierdzonym e-mailem.

**Architecture:** Czyste funkcje w `src/lib/drop/` (daty, grupowanie, wybór, linki, szablon) testowane vitestem. Trzy crony Vercel: `drop-prepare` (środa, ceny z Travelpayouts do `drop_deals`), `drop-teasers` (środa, Gemini do `city_teasers`), `drop-send` (czwartek, Resend batch z ochroną `drop_sends`). Subskrybenci w istniejącej tabeli `newsletter_subscribers`.

**Tech Stack:** Next.js 16 App Router (przeczytaj `node_modules/next/dist/docs/` przed pisaniem route handlerów), Supabase (`createServiceClient`), `@google/generative-ai` (`gemini-2.5-flash`), Resend SDK 6.12 (`batch.send`, `webhooks.verify`), vitest.

**Spec:** `docs/superpowers/specs/2026-11-11-czwartkowy-zrzut-design.md`

## Global Constraints

- Całe UI i maile po polsku, w głosie z BRAND.md: bez wykrzykników w tematach, bez „tylko teraz”, przekreślonych cen i liczników.
- Przy każdej cenie w mailu: „cena ze środy 22:00, może się zmienić”.
- Nadawca: `Włóczykij <zrzut@wloczykij.me>`. Domena musi być zweryfikowana w Resend (robi Kacper, poza kodem).
- Zrzut wyłącznie do `verified = true AND drop_enabled = true`.
- Budżety w formularzu: 200 / 300 / 500 zł (lot w obie strony, PLN).
- Mapowanie z quizu: `BudgetLevel` `"low"` → 300, `"medium"` → 500.
- Maksymalnie 3 okazje na mail, z różnych miast, od najtańszej. Brak dopasowania oznacza brak maila.
- Odrzucać: cel w Polsce (`country_code === "PL"`), `transfers > 1` lub `return_transfers > 1`, miasta bez polskiej nazwy.
- Klucz tygodnia: ISO `YYYY-Www` (np. `2026-W47`) liczony w `Europe/Warsaw`.
- Crony w UTC: `drop-prepare` `0 21 * * 3`, `drop-teasers` `0 22 * * 3`, `drop-send` `0 16 * * 4`.
- Wszystkie crony sprawdzają `Authorization: Bearer ${CRON_SECRET}` jak `src/app/api/cron/pre-trip-email/route.ts:70`.
- Każda funkcja route: `export const maxDuration = 60;`.
- Nowe zmienne env (dopisać do `.env.example`): `TRAVELPAYOUTS_MARKER`, `RESEND_WEBHOOK_SECRET`.
- UTM: `utm_source=drop&utm_medium=email&utm_campaign={week}&utm_content={city_code}`.
- Raport każdego crona przez `sendSlack` z `src/lib/slack.ts`.

## Review Focus

1. **Ta sama okazja z dwóch lotnisk subskrybenta** (np. WRO i KTW do Mediolanu). W mailu ma być raz, najtańsza wersja. Test w Task 6: `pickDealsFor` dedupuje po `city_code` między lotniskami.
2. **Travelpayouts zwraca oferty spoza żądanych dat** (cache bywa nieprecyzyjny). Oferta z inną datą wylotu lub powrotu niż wariant jest odrzucana. Test w Task 3: `groupDeals` odrzuca ofertę z `departure_at` innego dnia.
3. **Zmiana czasu** (ostatnia niedziela marca i października). `weekendDates` liczy dni w `Europe/Warsaw`, nie w UTC. Test w Task 2: środa 2026-10-21 23:30 w Warszawie daje weekend 22–26 października.
4. **Zapis tym samym e-mailem z inną wielkością liter albo spacjami** nie tworzy drugiego wiersza, tylko aktualizuje istniejący. Test w Task 8: `normalizeSignup` zwraca adres `trim().toLowerCase()`.
5. **Ponowny zapis po wypisie** włącza zrzut z powrotem (`drop_enabled = true`, `drop_disabled_reason = null`) bez nowego kodu rabatowego. Test w Task 8: `buildSubscriberUpsert` dla istniejącego wiersza z `drop_disabled_reason = "user"`.

---

### Task 1: Migracja i typy

**Files:**
- Create: `supabase/migrations/20261111000000_thursday_drop.sql`
- Create: `src/lib/drop/types.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces (`src/lib/drop/types.ts`):
  - `type WeekKey = string` (format `YYYY-Www`)
  - `interface WeekendVariant { label: "czw-nd" | "pt-nd" | "pt-pn"; depart: string; return: string }` (daty `YYYY-MM-DD`)
  - `interface TpOffer { origin: string; destination: string; price: number; airline: string; departure_at: string; return_at: string; transfers: number; return_transfers: number; link: string }`
  - `interface CityInfo { code: string; name: string; country_code: string }`
  - `interface DropDeal { week: WeekKey; origin: string; city_code: string; city_name: string; price: number; departure_at: string; return_at: string; airline: string; transfers: number; link: string; fetched_at: string }`
  - `interface CityTeaser { week: WeekKey; city_code: string; teaser: string; local_budget: string }`
  - `interface DropSubscriber { id: string; email: string; airports: string[]; max_price: number; unsubscribe_token: string }`

- [ ] **Step 1: Napisz migrację**

`newsletter_subscribers`: dodaj `airports text[] not null default '{}'`, `max_price int`, `drop_enabled boolean not null default false`, `unsubscribe_token text unique`, `drop_disabled_reason text`.

Nowe tabele z RLS włączonym i bez polityk (dostęp tylko przez service role):
- `drop_deals` (kolumny jak `DropDeal`, `id uuid pk`, `unique (week, origin, city_code)`),
- `city_teasers` (jak `CityTeaser`, `unique (week, city_code)`),
- `drop_sends (id uuid pk, week text not null, subscriber_id uuid not null references newsletter_subscribers(id) on delete cascade, sent_at timestamptz, resend_id text, unique (week, subscriber_id))`.

Wzoruj się na stylu `supabase/migrations/20260514140000_newsletter_subscribers.sql`.

- [ ] **Step 2: Dodaj typy i env**

`src/lib/drop/types.ts` z interfejsami powyżej. W `.env.example` dopisz `TRAVELPAYOUTS_MARKER=` i `RESEND_WEBHOOK_SECRET=`.

- [ ] **Step 3: Sprawdź**

Run: `npx tsc --noEmit`
Expected: brak błędów. Migrację zastosuj tak jak poprzednie (Supabase CLI `supabase db push` albo SQL editor) i sprawdź, że trzy tabele istnieją.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261111000000_thursday_drop.sql src/lib/drop/types.ts .env.example
git commit -m "Add database schema and types for the Thursday drop"
```

---

### Task 2: Daty weekendu i klucz tygodnia

**Files:**
- Create: `src/lib/drop/dates.ts`
- Test: `src/lib/drop/dates.test.ts`

**Interfaces:**
- Consumes: `WeekKey`, `WeekendVariant` z Task 1.
- Produces: `weekKey(now: Date): WeekKey`, `weekendDates(now: Date): WeekendVariant[]` (zawsze 3 warianty w kolejności czw-nd, pt-nd, pt-pn).

- [ ] **Step 1: Napisz testy**

```ts
// now = środa 2026-11-11 22:00 Europe/Warsaw (21:00Z)
expect(weekKey(new Date("2026-11-11T21:00:00Z"))).toBe("2026-W46");
expect(weekendDates(new Date("2026-11-11T21:00:00Z"))).toEqual([
  { label: "czw-nd", depart: "2026-11-12", return: "2026-11-15" },
  { label: "pt-nd",  depart: "2026-11-13", return: "2026-11-15" },
  { label: "pt-pn",  depart: "2026-11-13", return: "2026-11-16" },
]);
// przełom miesiąca i roku: środa 2026-12-30 → czw 31.12, pt 1.01.2027, pn 4.01.2027
expect(weekendDates(new Date("2026-12-30T21:00:00Z"))[2]).toEqual({ label: "pt-pn", depart: "2027-01-01", return: "2027-01-04" });
// Review Focus 3 — środa 21.10.2026 23:30 w Warszawie (21:30Z, przed zmianą czasu 25.10)
expect(weekendDates(new Date("2026-10-21T21:30:00Z"))[0]).toEqual({ label: "czw-nd", depart: "2026-10-22", return: "2026-10-25" });
expect(weekendDates(new Date("2026-10-21T21:30:00Z"))[2].return).toBe("2026-10-26");
// wywołanie w czwartek (ręczne ponowienie) daje ten sam weekend co w środę
expect(weekendDates(new Date("2026-11-12T10:00:00Z"))).toEqual(weekendDates(new Date("2026-11-11T21:00:00Z")));
```

- [ ] **Step 2: Uruchom, ma nie przejść**

Run: `npx vitest run src/lib/drop/dates.test.ts`
Expected: FAIL (brak modułu).

- [ ] **Step 3: Zaimplementuj**

Dzień tygodnia i datę licz w `Europe/Warsaw` przez `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" })`. „Najbliższy czwartek” to dzisiejszy czwartek, jeśli `now` wypada w czwartek; w przeciwnym razie następny. `weekKey` to ISO week daty środy przed tym czwartkiem.

- [ ] **Step 4: Uruchom, ma przejść**

Run: `npx vitest run src/lib/drop/dates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/drop/dates.ts src/lib/drop/dates.test.ts
git commit -m "Compute weekend date variants and ISO week key for the drop"
```

---

### Task 3: Pobieranie cen i grupowanie okazji

**Files:**
- Create: `src/lib/drop/deals.ts`
- Test: `src/lib/drop/deals.test.ts`

**Interfaces:**
- Consumes: `TpOffer`, `CityInfo`, `DropDeal`, `WeekendVariant`, `WeekKey`.
- Produces:
  - `fetchWeekendOffers(origin: string, v: WeekendVariant, token: string, fetchImpl?: typeof fetch): Promise<TpOffer[]>`. GET `https://api.travelpayouts.com/aviasales/v3/prices_for_dates` z `origin`, `departure_at=v.depart`, `return_at=v.return`, `currency=pln`, `sorting=price`, `limit=1000` (jeśli API odrzuca tę wartość, użyj maksimum z dokumentacji Travelpayouts), `token`. Dwie ponowne próby przy błędzie sieci lub statusie ≥ 500. Po trzech porażkach zwraca `[]`.
  - `fetchCities(fetchImpl?: typeof fetch): Promise<Map<string, CityInfo>>`. GET `https://api.travelpayouts.com/data/pl/cities.json`, klucz `code`, `name` (polska nazwa), `country_code`.
  - `groupDeals(offers: TpOffer[], variant: WeekendVariant, cities: Map<string, CityInfo>, week: WeekKey, fetchedAt: string): DropDeal[]`. Jedna, najtańsza okazja na `(origin, destination)`.
  - `mergeVariants(deals: DropDeal[]): DropDeal[]`. Najtańsza na `(origin, city_code)` spośród wszystkich wariantów.

- [ ] **Step 1: Napisz testy**

`groupDeals`:
- dwie oferty WRO→MIL za 260 i 201 zł daje jedną za 201,
- cel `GDN` (`country_code: "PL"`) jest odrzucony,
- `transfers: 2` jest odrzucone, `return_transfers: 2` też,
- kod spoza mapy miast jest odrzucony,
- **Review Focus 2:** oferta z `departure_at: "2026-11-14T08:00:00+01:00"` dla wariantu `pt-nd` (depart `2026-11-13`) jest odrzucona; tak samo inna data powrotu,
- wynik ma `city_name: "Mediolan"`, `week`, `fetched_at` z argumentów.

`mergeVariants`: ta sama para WRO/MIL z dwóch wariantów (201 i 189) daje jedną za 189.

`fetchWeekendOffers` z mockiem `fetchImpl`: odpowiedź 500, 500, 200 zwraca dane z trzeciej; trzy razy 500 zwraca `[]`; URL zawiera `origin=WRO&departure_at=2026-11-13&return_at=2026-11-15&currency=pln`.

- [ ] **Step 2: Uruchom, ma nie przejść**

Run: `npx vitest run src/lib/drop/deals.test.ts`
Expected: FAIL

- [ ] **Step 3: Zaimplementuj** funkcje z sygnatur powyżej. Porównanie dat: pierwsze 10 znaków `departure_at`/`return_at` (data lokalna lotniska) z `v.depart`/`v.return`.

- [ ] **Step 4: Uruchom, ma przejść**

Run: `npx vitest run src/lib/drop/deals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/drop/deals.ts src/lib/drop/deals.test.ts
git commit -m "Fetch weekend fares from Travelpayouts and group them into deals"
```

---

### Task 4: Zajawki od Gemini

**Files:**
- Create: `src/lib/drop/teasers.ts`
- Test: `src/lib/drop/teasers.test.ts`

**Interfaces:**
- Consumes: `CityTeaser`, `WeekKey`.
- Produces:
  - `buildTeaserPrompt(cityName: string, countryCode: string): string`
  - `parseTeaser(raw: string): { teaser: string; local_budget: string } | null`
  - `generateTeaser(cityName: string, countryCode: string, week: WeekKey, cityCode: string): Promise<CityTeaser | null>`. Model `gemini-2.5-flash`, `responseMimeType: "application/json"`, klucz `GEMINI_API_KEY`. Każde wywołanie logowane przez `logGeminiCall({ endpoint: "drop-teaser", model, success, ... })`. Błąd zwraca `null`.

- [ ] **Step 1: Napisz testy**

- `buildTeaserPrompt("Mediolan", "IT")` zawiera „Mediolan”, „2–3 zdania”, „weekend”, „JSON” i zakaz wykrzykników,
- `parseTeaser('{"teaser":"Sobota na Navigli…","local_budget":"ok. 120 EUR"}')` zwraca obiekt,
- `parseTeaser` zwraca `null` dla: niepoprawnego JSON, pustego `teaser`, `teaser` dłuższego niż 320 znaków, brakującego `local_budget`,
- `parseTeaser` przycina białe znaki i usuwa otaczające ```json bloki.

- [ ] **Step 2: Uruchom, ma nie przejść**

Run: `npx vitest run src/lib/drop/teasers.test.ts`
Expected: FAIL

- [ ] **Step 3: Zaimplementuj**

Prompt (dokładna treść do decyzji implementera, ale musi wymagać): 2–3 zdania po polsku w głosie „znajomego przy kawie” z BRAND.md, konkret (miejsce, dzielnica, jedzenie z ceną), bez wykrzykników i emoji; `local_budget` jako przybliżony koszt jedzenia, transportu i atrakcji na weekend w walucie lokalnej, np. „ok. 120 EUR”. Odpowiedź wyłącznie JSON `{ "teaser": string, "local_budget": string }`.

- [ ] **Step 4: Uruchom, ma przejść**

Run: `npx vitest run src/lib/drop/teasers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/drop/teasers.ts src/lib/drop/teasers.test.ts
git commit -m "Generate weekly city teasers for the drop with Gemini"
```

---

### Task 5: Crony przygotowania (`drop-prepare`, `drop-teasers`)

**Files:**
- Create: `src/app/api/cron/drop-prepare/route.ts`
- Create: `src/app/api/cron/drop-teasers/route.ts`
- Create: `src/lib/drop/cronAuth.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `weekKey`, `weekendDates` (Task 2), `fetchWeekendOffers`, `fetchCities`, `groupDeals`, `mergeVariants` (Task 3), `generateTeaser` (Task 4), `sendSlack`, `createServiceClient`.
- Produces: `isAuthorizedCron(req: NextRequest): boolean` w `cronAuth.ts` (ta sama logika co `pre-trip-email/route.ts:70-74`). Wiersze `drop_deals` i `city_teasers` bieżącego tygodnia.

- [ ] **Step 1: `drop-prepare` GET**

1. `isAuthorizedCron`, inaczej 401.
2. Lotniska: unikalne `airports` z `newsletter_subscribers` przy `verified and drop_enabled`. Brak lotnisk: raport na Slacku i koniec.
3. `fetchCities` raz, potem dla każdego lotniska i wariantu `fetchWeekendOffers` sekwencyjnie z przerwą 300 ms (limit 100/h).
4. `groupDeals` dla każdego wyniku, `mergeVariants`, a potem `upsert` do `drop_deals` z `onConflict: "week,origin,city_code"`. Najpierw usuń wiersze tygodnia dla lotnisk, które w tym przebiegu mają dane, żeby nie zostawały stare okazje.
5. Slack: `Zrzut {week}: {n} okazji z {lotniska}; puste: {lista}; {ms} ms`.

- [ ] **Step 2: `drop-teasers` GET**

1. Autoryzacja.
2. Unikalne `city_code` z `drop_deals` tygodnia bez wiersza w `city_teasers`.
3. `generateTeaser` w puli po 5 równolegle; sukcesy `upsert` z `onConflict: "week,city_code"`.
4. Przerwij przed 50. sekundą (zostaw zapas do limitu 60 s); pozostałe miasta zostają bez zajawki.
5. Slack: `Zajawki {week}: {ok}/{all}, błędy: {n}`.

- [ ] **Step 3: `vercel.json`**

Dodaj `{ "path": "/api/cron/drop-prepare", "schedule": "0 21 * * 3" }` i `{ "path": "/api/cron/drop-teasers", "schedule": "0 22 * * 3" }` obok istniejącego crona.

- [ ] **Step 4: Sprawdź lokalnie**

Run: `npx tsc --noEmit && npx eslint src/app/api/cron src/lib/drop`
Expected: bez błędów.

Run (dev server, z dodanym testowym subskrybentem `verified=true, drop_enabled=true, airports={WRO}`): `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/drop-prepare`, potem `.../drop-teasers`.
Expected: 200; w `drop_deals` są wiersze dla WRO z polskimi nazwami miast; w `city_teasers` zajawki dla tych miast.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/drop-prepare src/app/api/cron/drop-teasers src/lib/drop/cronAuth.ts vercel.json
git commit -m "Add Wednesday crons that collect weekend deals and teasers"
```

---

### Task 6: Wybór okazji, linki i szablon maila

**Files:**
- Create: `src/lib/drop/pick.ts`
- Create: `src/lib/drop/links.ts`
- Create: `src/lib/drop/email.ts`
- Test: `src/lib/drop/pick.test.ts`, `src/lib/drop/links.test.ts`, `src/lib/drop/email.test.ts`

**Interfaces:**
- Consumes: `DropDeal`, `CityTeaser`, `DropSubscriber`, `WeekKey`.
- Produces:
  - `pickDealsFor(sub: DropSubscriber, deals: DropDeal[]): DropDeal[]`
  - `buildAffiliateUrl(deal: DropDeal, marker: string, week: WeekKey): string`
  - `buildPlanUrl(deal: DropDeal, appUrl: string, week: WeekKey): string`
  - `buildUnsubscribeUrl(appUrl: string, token: string): string` → `${appUrl}/api/drop/unsubscribe?token=…`
  - `buildSettingsUrl(appUrl: string, token: string): string` → `${appUrl}/zrzut/ustawienia?token=…`
  - `ORIGIN_GENITIVE: Record<string, string>` w `email.ts`: `WRO: "Wrocławia"`, `KTW: "Katowic"`, `KRK: "Krakowa"`, `WAW: "Warszawy"`, `WMI: "Modlina"`, `POZ: "Poznania"` plus pozostałe kody z `POLISH_AIRPORTS`
  - `renderDropEmail(input: { deals: DropDeal[]; teasers: Map<string, CityTeaser>; originCity: string; week: WeekKey; appUrl: string; marker: string; unsubscribeToken: string }): { subject: string; html: string }`

- [ ] **Step 1: Napisz testy `pickDealsFor`**

- tylko okazje z `sub.airports` i `price <= sub.max_price`,
- maksymalnie 3, rosnąco po cenie,
- **Review Focus 1:** WRO→MIL 260 i KTW→MIL 230 przy `airports: ["WRO","KTW"]` dają jedną okazję (KTW, 230),
- nic nie pasuje: `[]`,
- okazja z ceną dokładnie równą `max_price` przechodzi.

- [ ] **Step 2: Napisz testy linków**

- `buildAffiliateUrl` dla `link: "/search/WRO1311BCN15111?t=abc"` zaczyna się od `https://www.aviasales.com/search/WRO1311BCN15111?t=abc&marker=12345`, zawiera `utm_source=drop`, `utm_campaign=2026-W46` i `utm_content=BCN`,
- `link` bez `?` łączy parametry przez `?`,
- `buildPlanUrl` zwraca `/quiz?city=Barcelona&from=WRO&depart=2026-11-13&return=2026-11-15&src=drop&utm_…` z zakodowaną nazwą miasta (np. `Mediolan`, `Saloniki`).

Uwaga dla implementera: `city` w linku to **polska nazwa miasta**, a nie kod, bo `/quiz` już dziś czyta `?city=` jako nazwę (`src/app/quiz/page.tsx:220`). Spec mówił o `city_code`; ta wersja jest celowa.

- [ ] **Step 3: Napisz testy `renderDropEmail`**

- jedna okazja: temat `Mediolan za 201 zł w ten weekend`,
- co najmniej 2 okazje: temat `{n} wyjazdy z {originCity} na ten weekend` (np. `3 wyjazdy z Krakowa na ten weekend`; `originCity` przekazuje wywołujący w dopełniaczu),
- temat nie zawiera `!`,
- html zawiera dla każdej okazji: nazwę miasta, `201 zł`, tekst „cena ze środy 22:00, może się zmienić”, oba linki, zajawkę, jeśli istnieje, i nie zawiera słowa `undefined`, jeśli zajawki brak,
- html zawiera link do wypisu i ustawień,
- wartości z danych są escapowane (`city_name: "<b>x</b>"` nie trafia do html jako tag).

- [ ] **Step 4: Uruchom, mają nie przejść**

Run: `npx vitest run src/lib/drop/pick.test.ts src/lib/drop/links.test.ts src/lib/drop/email.test.ts`
Expected: FAIL

- [ ] **Step 5: Zaimplementuj**

Szablon w stylu `sendNewsletterConfirmation` z `src/lib/email.ts` (tabela 480 px, nagłówek `#FF6B35`). Karta: miasto, cena, daty z godzinami (`departure_at`/`return_at`, format `pt 13.11, 19:05`), linia (nazwy z `AIRLINE_NAMES` w `src/lib/flights/travelpayouts.ts`; przenieś mapę do `src/lib/flights/airlines.ts` i importuj w obu miejscach), przesiadki, zajawka, `local_budget`, przyciski „Sprawdź cenę” i „Ułóż mi plan”. Stopka: „Chcesz alert na konkretne miasto? To będzie w Pro.” i linki „Zmień lotnisko lub budżet” oraz „Wypisz się ze zrzutu”.

- [ ] **Step 6: Uruchom, mają przejść**

Run: `npx vitest run src/lib/drop`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/drop/pick.ts src/lib/drop/links.ts src/lib/drop/email.ts src/lib/drop/*.test.ts src/lib/flights/airlines.ts src/lib/flights/travelpayouts.ts
git commit -m "Pick deals per subscriber and render the drop email"
```

---

### Task 7: Cron wysyłki (`drop-send`)

**Files:**
- Create: `src/lib/drop/send.ts`
- Test: `src/lib/drop/send.test.ts`
- Create: `src/app/api/cron/drop-send/route.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `pickDealsFor`, `renderDropEmail`, `buildUnsubscribeUrl`, `ORIGIN_GENITIVE` (Task 6), `weekKey` (Task 2), `isAuthorizedCron` (Task 5).
- Produces:
  - `selectRecipients(subs: DropSubscriber[], alreadySent: Set<string>, deals: DropDeal[]): { sub: DropSubscriber; deals: DropDeal[] }[]`. Pomija tych, którzy są w `alreadySent` albo nie mają dopasowania.
  - `chunk<T>(items: T[], size: number): T[][]`

- [ ] **Step 1: Napisz testy**

- subskrybent z `id` w `alreadySent` jest pominięty,
- subskrybent bez dopasowania jest pominięty,
- kolejność zachowana,
- `chunk(range(250), 100)` daje długości `[100, 100, 50]`.

- [ ] **Step 2: Uruchom, ma nie przejść**

Run: `npx vitest run src/lib/drop/send.test.ts`
Expected: FAIL

- [ ] **Step 3: Zaimplementuj `send.ts`**, potem route GET:

1. Autoryzacja; `week = weekKey(now)`.
2. Okazje tygodnia z `drop_deals`; brak: Slack „Zrzut {week}: brak okazji, nic nie wysłano” i koniec.
3. Subskrybenci `verified and drop_enabled` z niepustym `airports` i `max_price`; `alreadySent` z `drop_sends` dla tygodnia.
4. `selectRecipients`, partie po 100.
5. Dla każdej partii: `insert` do `drop_sends` (`week`, `subscriber_id`) z `onConflict` ignorującym duplikaty i odczytaj tylko faktycznie wstawione wiersze. Wysyłaj wyłącznie im (to chroni przed równoległym uruchomieniem). Potem `resend.batch.send([...])` z `from: "Włóczykij <zrzut@wloczykij.me>"` i nagłówkami `List-Unsubscribe: <{unsubscribeUrl}>` oraz `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Zapisz `resend_id` i `sent_at`.
6. Błąd limitu dziennego (429 lub błąd quota z Resend): przerwij, usuń wiersze `drop_sends` niewysłanej partii, raportuj liczbę pominiętych na Slacku. Bez ponawiania w piątek.
7. Zatrzymaj się przed 50. sekundą; Slack podaje, ilu zostało.
8. Slack: `Zrzut {week}: wysłane {n}, bez dopasowania {m}, błędy {k}`.

`originCity` do tematu: `ORIGIN_GENITIVE[deals[0].origin]` (Task 6), czyli lotnisko pierwszej, najtańszej okazji.

- [ ] **Step 4: `vercel.json`**: `{ "path": "/api/cron/drop-send", "schedule": "0 16 * * 4" }`.

- [ ] **Step 5: Sprawdź**

Run: `npx vitest run src/lib/drop && npx tsc --noEmit`
Expected: PASS i brak błędów.

Run (dev, testowy subskrybent z własnym adresem Kacpra): `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/drop-send` dwa razy.
Expected: jeden mail w skrzynce; drugie wywołanie raportuje `wysłane 0`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/drop/send.ts src/lib/drop/send.test.ts src/app/api/cron/drop-send vercel.json
git commit -m "Send the Thursday drop in Resend batches without duplicates"
```

---

### Task 8: Zapis na zrzut

**Files:**
- Create: `src/lib/drop/signup.ts`
- Test: `src/lib/drop/signup.test.ts`
- Create: `src/app/api/drop/subscribe/route.ts`
- Create: `src/app/components/DropSignup.tsx`
- Modify: `src/app/api/newsletter/verify/route.ts` (ustaw `drop_enabled = true` przy weryfikacji, jeśli `airports` niepuste)
- Modify: `src/app/components/HomeClient.tsx`, `src/app/components/SiteFooter.tsx`, `src/app/plan/[tripId]/page.tsx`, `src/app/profile/page.tsx`

**Interfaces:**
- Consumes: `POLISH_AIRPORTS` (`src/lib/airports.ts`), istniejące `generatePromoCode`, `sendNewsletterConfirmation`, logika `src/app/api/newsletter/route.ts`.
- Produces:
  - `normalizeSignup(input: unknown): { email: string; airports: string[]; max_price: 200 | 300 | 500 } | { error: string }`
  - `budgetToMaxPrice(b: BudgetLevel): 300 | 500`
  - `buildSubscriberUpsert(existing: { verified: boolean; drop_disabled_reason: string | null; unsubscribe_token: string | null } | null, s: { airports: string[]; max_price: number }): Record<string, unknown>`
  - POST `/api/drop/subscribe` body `{ email, airports, max_price }` albo `{ fromProfile: true }` dla zalogowanego.

- [ ] **Step 1: Napisz testy**

- **Review Focus 4:** `normalizeSignup({ email: "  Marek@Gmail.COM ", airports: ["WRO"], max_price: 300 })` daje `email: "marek@gmail.com"`,
- błędy: zły e-mail, puste `airports`, kod spoza `POLISH_AIRPORTS`, `max_price: 250`, więcej niż 3 lotniska; komunikaty po polsku w głosie marki (np. „Wybierz przynajmniej jedno lotnisko.”),
- `budgetToMaxPrice("low") === 300`, `budgetToMaxPrice("medium") === 500`,
- `buildSubscriberUpsert(null, …)` ustawia `airports`, `max_price`, nowy `unsubscribe_token` (64 znaki hex), `drop_enabled: false` (włącza się dopiero po weryfikacji),
- `buildSubscriberUpsert({ verified: true, … }, …)` ustawia `drop_enabled: true` i nie zmienia `unsubscribe_token`, jeśli istnieje,
- **Review Focus 5:** `buildSubscriberUpsert({ verified: true, drop_disabled_reason: "user", unsubscribe_token: "t" }, …)` daje `drop_enabled: true`, `drop_disabled_reason: null`, `unsubscribe_token: "t"`, bez pola `discount_code`.

- [ ] **Step 2: Uruchom, ma nie przejść**

Run: `npx vitest run src/lib/drop/signup.test.ts`
Expected: FAIL

- [ ] **Step 3: Zaimplementuj**

Route: rate limit jak w `/api/newsletter` (`checkRateLimit`). Nowy adres idzie tą samą ścieżką co newsletter (kod promo w Stripe, token, `sendNewsletterConfirmation`) plus pola z `buildSubscriberUpsert`; wydziel wspólną część z `src/app/api/newsletter/route.ts` do funkcji w `src/lib/newsletter.ts` zamiast kopiować. Dla potwierdzonego adresu: tylko aktualizacja pól. `fromProfile`: wymaga sesji Supabase, bierze e-mail z konta i `quiz_preferences.airports` / `budget`; adres zalogowanego uznajemy za potwierdzony (`verified = true`).

`DropSignup.tsx`: nagłówek „Co czwartek 3 wyjazdy z Twojego lotniska”, pola e-mail, lotniska (chipy, do 3) i budżet (200 / 300 / 500 zł), przycisk „Zapisz mnie”. Po sukcesie: „Sprawdź skrzynkę i potwierdź zapis. Pierwszy zrzut w czwartek.” Tap targety ≥ 44 px, jak reszta strony. `trackEvent("drop_signup", { airports: n, max_price })`.

Miejsca: strona główna (`HomeClient.tsx`, sekcja przed stopką), `SiteFooter.tsx` (link do sekcji), plan (pod banerem upsell, tylko gdy niezalogowany w zrzucie), profil (przycisk „Wysyłaj mi zrzut” z `fromProfile`).

- [ ] **Step 4: Uruchom testy i sprawdź w przeglądarce**

Run: `npx vitest run src/lib/drop && npx tsc --noEmit`
Expected: PASS

Preview (`preview_start` „kacper-explores”): zapis z formularza na stronie głównej daje wiersz w `newsletter_subscribers` z `airports` i `max_price`; link z maila potwierdzającego ustawia `drop_enabled = true`. Na szerokości 375 px formularz mieści się bez poziomego przewijania.

- [ ] **Step 5: Commit**

```bash
git add src/lib/drop/signup.ts src/lib/drop/signup.test.ts src/app/api/drop/subscribe src/app/components/DropSignup.tsx src/app/api/newsletter src/lib/newsletter.ts src/app/components/HomeClient.tsx src/app/components/SiteFooter.tsx "src/app/plan/[tripId]/page.tsx" src/app/profile/page.tsx
git commit -m "Let anyone sign up for the Thursday drop with airport and budget"
```

---

### Task 9: Wypis, ustawienia i webhook Resend

**Files:**
- Create: `src/app/api/drop/unsubscribe/route.ts`
- Create: `src/app/api/drop/settings/route.ts`
- Create: `src/app/zrzut/ustawienia/page.tsx`
- Create: `src/app/api/resend-webhook/route.ts`
- Test: `src/lib/drop/signup.test.ts` (rozszerzenie)

**Interfaces:**
- Consumes: `normalizeSignup` (Task 8), `createServiceClient`.
- Produces: `disableReasonFor(eventType: string): "bounce" | "complaint" | null` w `src/lib/drop/signup.ts`.

- [ ] **Step 1: Napisz test** `disableReasonFor("email.bounced") === "bounce"`, `("email.complained") === "complaint"`, `("email.delivered") === null`.

- [ ] **Step 2: Uruchom, ma nie przejść**

Run: `npx vitest run src/lib/drop/signup.test.ts`
Expected: FAIL

- [ ] **Step 3: Zaimplementuj**

- `/api/drop/unsubscribe`: GET (link w mailu) pokazuje prostą stronę „Wypisany. Zrzut już nie przyjdzie.” z linkiem „Jednak chcę” (do ustawień). POST (one-click z nagłówka) zwraca 200. Oba ustawiają `drop_enabled = false`, `drop_disabled_reason = "user"` po `unsubscribe_token`. Nieznany token: ta sama odpowiedź (bez ujawniania, czy adres istnieje).
- `/zrzut/ustawienia?token=…`: formularz lotnisk i budżetu jak w `DropSignup` (bez pola e-mail) plus przełącznik „Wysyłaj zrzut”. POST do `/api/drop/settings` z `token`. Strona `noindex`.
- `/api/resend-webhook`: weryfikacja przez `resend.webhooks.verify` z `RESEND_WEBHOOK_SECRET` (zła sygnatura daje 400). Dla `disableReasonFor(type) !== null` ustaw `drop_enabled = false` i powód po adresie `data.to[0]`.

- [ ] **Step 4: Sprawdź**

Run: `npx vitest run src/lib/drop && npx tsc --noEmit`
Expected: PASS

Preview: link wypisu z testowego maila daje `drop_enabled = false`; strona ustawień zmienia `max_price`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/drop src/app/zrzut src/app/api/resend-webhook src/lib/drop/signup.ts src/lib/drop/signup.test.ts
git commit -m "Add drop unsubscribe, settings page and Resend bounce handling"
```

---

### Task 10: Quiz wypełniony z linku zrzutu

**Files:**
- Create: `src/lib/drop/quizParams.ts`
- Test: `src/lib/drop/quizParams.test.ts`
- Modify: `src/app/quiz/page.tsx` (efekt przy `searchParams`, ok. linii 220)

**Interfaces:**
- Consumes: `QuizAnswers` (`src/types/index.ts`), `AIRPORT_BY_CODE`.
- Produces: `parseDropParams(p: URLSearchParams): { preferredCity: string; airports: string[]; month: number; duration: number } | null`

Quiz zna tylko `month` i `duration` (2–21 dni), nie dokładne daty. `duration` = liczba dni od `depart` do `return` włącznie (pt 13 – nd 15 = 3), `month` = miesiąc `depart`.

- [ ] **Step 1: Napisz testy**

- `?city=Mediolan&from=KRK&depart=2026-11-13&return=2026-11-15&src=drop` daje `{ preferredCity: "Mediolan", airports: ["KRK"], month: 11, duration: 3 }`,
- `null` gdy: brak `src=drop`, nieznane lotnisko, zła data, `return` przed `depart`, `duration` poza 2–21.

- [ ] **Step 2: Uruchom, ma nie przejść**

Run: `npx vitest run src/lib/drop/quizParams.test.ts`
Expected: FAIL

- [ ] **Step 3: Zaimplementuj** i w `quiz/page.tsx`: gdy `parseDropParams` zwraca wynik, ustaw `preferredCity`, `airports`, `month`, `duration` przez `setQuizAnswer` i pomiń kroki 4 (miesiąc i długość) i 5 (lotniska). Użytkownik odpowiada tylko na kroki 0–3. `trackEvent("drop_plan_started", { city })`. Bez parametrów quiz działa jak dziś.

- [ ] **Step 4: Sprawdź**

Run: `npx vitest run src/lib/drop/quizParams.test.ts`
Expected: PASS

Preview: `/quiz?city=Mediolan&from=KRK&depart=2026-11-13&return=2026-11-15&src=drop` pokazuje „Kierunek: Mediolan”. Po kroku 3 quiz przechodzi dalej bez pytania o miesiąc i lotnisko. `/quiz` bez parametrów ma nadal 6 kroków.

- [ ] **Step 5: Commit**

```bash
git add src/lib/drop/quizParams.ts src/lib/drop/quizParams.test.ts src/app/quiz/page.tsx
git commit -m "Prefill the quiz from Thursday drop links"
```

---

### Task 11: Licznik w panelu admina

**Files:**
- Modify: `src/app/admin/analytics/page.tsx`

**Interfaces:**
- Consumes: tabele `newsletter_subscribers`, `drop_sends`.

- [ ] **Step 1: Dodaj sekcję „Czwartkowy zrzut”**

Aktywni subskrybenci (`verified and drop_enabled`) z podziałem na lotniska i wysłane w ostatnich 4 tygodniach (`drop_sends` grupowane po `week`). Styl jak istniejące karty w tym pliku. Otwarcia i kliknięcia zostają w panelu Resend i GA4 (bez własnego śledzenia).

- [ ] **Step 2: Sprawdź**

Run: `npx tsc --noEmit`
Expected: brak błędów. Preview `/admin/analytics` (konto admina) pokazuje sekcję z liczbami z bazy testowej.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/analytics/page.tsx
git commit -m "Show Thursday drop subscribers and sends in admin analytics"
```
