# Destination flight prices

## Diagnosis (2026-11-15)

- `POST /api/destinations` asks Gemini for six places, not fares. It no longer
  generates or returns `estimatedFlightCost`; the type has only a dangling
  comment for that old field. Cards show “Sprawdź na żywo” and link to Aviasales.
  Static catalog prices and legacy `bestOffer` are not evidence of a fresh fare.
- `/api/real-flights` uses Sky Scrapper via `flights/rapidapi.ts`. There is no
  separate cache module. L1 is process memory, L2 is `flight_cache`, TTL is
  12 hours (`constants.ts`). Keys contain origin, destination, exact outbound
  and return dates and, except for solo, passenger composition. The month search
  tries the nearest three candidate pairs (days 10/15/20/25, at least 3 days away).
- Paid searches have a 5/hour/IP limiter and a 10,600/day **process-local** cap.
  Each date can require a second upstream request. Existing usage logging counts
  successful date searches, not every upstream attempt; `/admin` counts those
  miss rows as calls and reads at most 500 usage rows. It is not a billing ledger.
  Admin, limits, paid search behavior and monitoring are outside this change.
- Existing L2-to-L1 promotion restarts the 12-hour TTL. Preserve the actual L2
  expiry when promoting, so a card cannot label an old result as freshly checked.

## Implementation contract

Read cache only: one bounded `POST /api/destination-flight-prices` for the cards,
including revisits served from the browser's destination cache. Match known
catalog city/country, selected origins, month search's exact candidate date pairs
and passengers. Read L1 then batch-read L2; never call a paid search on a miss.
Batch-log cache hits to `api_usage_log` with `hit: true`; a cache-only miss
does not consume quota and must not be logged as a paid miss.

Show a fresh API quote as “od X zł”, “sprawdzone DD.MM”, per person, round trip,
origin and full dates. Link Aviasales to that route/date/passenger composition.
Without fresh evidence, keep an undated search link and no amount. Do not create
new AI estimates. Derive checked time from `expires_at - FLIGHT_CACHE_TTL_MS`,
because `created_at` is not updated on existing-row upserts. Expiry also travels
to the browser; do not persist quotes in the destination store.

No new migrations, feature flags, paid requests, or background cache warm-up.
Without Supabase configuration/tables or on a database failure, fall back to no
amount. Production needs the existing `flight_cache` and `api_usage_log` tables,
`NEXT_PUBLIC_SUPABASE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY` for shared
quotes. `RAPIDAPI_KEY` is not required for this read path. An empty cache stays
empty until an existing authorized flight-search flow populates it.

## Verification and handoff

- Unit/integration coverage: fresh/expired/missing/empty/broken cache, original
  TTL through both readers, PLN formatting, Warsaw checked date, route/date/year
  and passenger isolation, bounded batch queries, logging and rate limiting.
  The tests stub upstream fetch to fail and verify it is never called, including
  when `RAPIDAPI_KEY` is configured.
- Run `npm test`, `npm run lint` (zero errors; existing warnings remain), and
  `npm run typecheck`.
- Final results on 2026-11-15: 802 tests across 84 files passed (37 new tests),
  lint passed with 0 errors / 27 existing warnings, typecheck passed, and
  `git diff --check` passed.
- UI smoke remains unverified in this execution environment: Chrome aborted on
  launch; Next dev hit FSEvent/EMFILE watcher failures. No production API was used.
- Git staging was denied by the execution sandbox when creating the linked
  worktree's `index.lock`. No commits or push were possible in this session.
  Suggested separate commits: diagnosis/docs; cache-only API/cards; tests.

### Manual review

1. Complete the quiz with a known catalog city (e.g. Barcelona), WRO, one adult,
   a chosen month and three days. In DevTools, verify one
   `/api/destination-flight-prices` request and **no** `/api/real-flights` calls.
2. With no matching cache row, all cards retain Aviasales search links without a
   fare. Unknown catalog cities also stay in this state. Older AI estimates and
   static catalog fares must not appear.
3. In a **local/staging database**, add a fixture for a key in the request's
   candidate window (inspect the unit test for an example). Supply matching
   outbound/return dates in the flight JSON, a positive PLN price, and a fresh
   `expires_at`; `created_at` may be old. For a group, include matching passenger
   data and the passenger suffix in the key.
4. Reopen the destination view: check “od … zł”, “sprawdzone DD.MM”, origin,
   dates with year, per-person round-trip wording, and the same route/dates in
   Aviasales. Check mobile width 390 px and a desktop viewport. A fixture from a
   second selected origin should link to that origin.
5. Use a short fixture expiry and keep the view open: the amount disappears
   without another paid request. Revisit using client-side navigation: places
   may come from browser memory, but quotes must be read again. Change month,
   duration, origins or passenger composition: unrelated fares must not appear.
6. Verify only `hit: true` rows from these reads in `api_usage_log`; missing
   cache/table/configuration must not prevent use of the cards. Keep real
   production quotes out of fixtures, and do not warm the cache with bulk calls.

## Fallback: weekly deals (2026-11-19)

**Why.** The cache is fed only by `/api/real-flights`, which no screen calls any more; production
`flight_cache` had 41 rows and none fresh (newest expired 2026-05-19). Under the cache-only rule above
the cards therefore never showed an amount.

**Rule.** The cache keeps priority. Only for a card with no cache quote does
`POST /api/destination-flight-prices` read `drop_deals` (Travelpayouts, weekly cron; no new paid
request, cron, migration or flag) through `getDealsForCards` and `selectCardDeal`
(`src/lib/flights/card-deals.ts`):

- city from `CATALOG` (city + country); a deal row matches by `city_code` (catalog IATA, BER code for
  BER) **or** by the Travelpayouts name (`dealCityName`, as on `/weekend`);
- airport from `quiz.airports`;
- per airport only the **newest `week`** the cron wrote; an older week is never promoted when the newest
  has no row for that city;
- row must be fresh (`priceTrust.isFreshDeal`, 8 days from `fetched_at`) and not yet departed
  (departure compared as an exact instant); cheapest wins, tie goes to the earlier flight;
- the quote expires at the earlier of `fetched_at + 8 days` and the departure, and the client timer
  removes it then (same mechanism as cache quotes).

**Card copy.** “od X zł”, “sprawdzone DD.MM” (= `fetched_at`, Warsaw), round trip, `ORIGIN → city`,
exact dates of that flight, “Za 1 dorosłego”. If the deal's departure month is not the quiz month the
card says so (“najbliższy weekend z tygodniowych okazji, nie wybrany w quizie miesiąc”). For a group
(more than one traveller) the amount is **not multiplied** and the card says to check the group price in
the search. The cache-quote group total (`flightTotalNote`) stays cache-only, because there the price was
fetched for that exact passenger composition.

**Link.** `buildFlightLink` on the very deal row (same flight and dates as the amount), partner marker and
`link partnerski` label only with consent and configured marker/project, otherwise a plain link, exactly as
on `/okazje`; `utm_medium=cards`. The deal link carries one adult, not the group.

**Limits.** Only the nearest weekend and only destinations that the cron found a deal for (the cron
stores the cheapest offers per airport, not every catalog city); other cards still say
“Sprawdź w wyszukiwarce” with no amount. The quiz duration is not matched; the card states the flight's trip length when it differs from the quiz by 2 days or more. Needs `drop_deals` and
`SUPABASE_SERVICE_ROLE_KEY` in production (already used by `/okazje`); without them the cards behave as before.

**Tests.** `card-deals.test.ts` (matching, freshness, 8-day boundary, departed, stale/older week, BER,
Praga without BER code, month mismatch, expiry, group, link) and `card-deals-route.test.ts` (fallback,
cache priority, no match, older week, BER, DB error, card order).
