# Przepustka, etap 1: pomiar i prowizje — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Linki do lotów, noclegów, biletów i przechowalni bagażu zarabiają prowizję, a GA4 widzi lejek: wygenerowany plan, rozpoczęcie płatności, zakup i kliknięcie w partnera.

**Architecture:** Czyste funkcje testowane vitestem:
- `buildAviasalesUrl` w `src/lib/flights/search-url.ts`. Link do lotu powstaje na serwerze z `TRAVELPAYOUTS_MARKER`.
- `src/lib/affiliate.ts`: linki do pozostałych partnerów z konfiguracją `NEXT_PUBLIC_AFFILIATE_*`, atrybuty linków i parametry zdarzenia.
- `planPrice` w `src/lib/prices.ts`.
- `purchaseAction` i `rememberPurchase` w `src/lib/analytics.ts`.

Komponenty w `src/app/components/PartnerLinks.tsx` rysują linki na planie. `affiliate_click` wysyła istniejący, delegowany nasłuch kliknięć w `src/app/components/Analytics.tsx` na podstawie atrybutów `data-*`.

**Tech Stack:** Next.js 16.2.6 App Router (przed kodem przeczytaj `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`), React 19.2, TypeScript, vitest 3 (środowisko `node`, bez DOM), GA4 przez `trackEvent`.

**Spec:** `docs/superpowers/specs/2026-11-11-przepustka-na-wyjazd-design.md`, sekcja „Etap 1 — pomiar i prowizje” (1.1 i 1.2).

## Global Constraints

- **Kod bazowy:** nowa gałąź od `origin/main` (`a1b1016` albo nowszy). Lokalne `main` i `homepage-critique-fixes` są za `origin/main`, bo nie mają Czwartkowego zrzutu. Numery linii w planie pochodzą ze stanu `origin/main`.
- **Zmienne dla przeglądarki:** mają prefiks `NEXT_PUBLIC_` i są czytane dosłownie (`process.env.NEXT_PUBLIC_AFFILIATE_BOOKING`), nigdy przez `process.env[klucz]`, bo takich odczytów Next nie wstawia do paczki. Wartości wchodzą przy buildzie, więc po zmianie w Vercel trzeba zrobić nowy deploy.
- **Konfiguracja partnera** (`NEXT_PUBLIC_AFFILIATE_*`):
  - pusta oznacza link bez prowizji;
  - wartość z `{url}` to szablon przekierowania, w który wstawiamy zakodowany adres docelowy;
  - każda inna wartość to parametr dopisywany do adresu docelowego (np. `aid=1234567`).
- **Marker lotów:** `TRAVELPAYOUTS_MARKER` czytamy tylko na serwerze (`src/lib/flights/travelpayouts.ts`), jak w zrzucie.
- **Link partnerski:**
  - zawsze `target="_blank"`;
  - `rel="sponsored noopener noreferrer"`, gdy link ma identyfikator partnera (`paid`), w przeciwnym razie `rel="noopener noreferrer"`;
  - dopisek „link partnerski” tylko przy linkach z `paid`.
- **Dane osobowe:** w adresach i parametrach GA4 nie ma e-maila ani id użytkownika. Wolno przekazywać tylko miasto, nazwę atrakcji, daty i kody lotnisk.
- **Teksty UI:** po polsku, w głosie z BRAND.md. Nigdy „bez kolejki”, „najlepsza cena” ani wykrzykniki.
- **Druk:** nowe elementy partnerskie na planie mają klasę `no-print`, jak dzisiejsza sekcja noclegów.
- **Pamięć przeglądarki:** `localStorage` i `sessionStorage` zawsze w try/catch.
- **Wartości `gate` w `begin_checkout`:** `pricing` (cennik), `plan_banner` (baner na planie, znika w etapie 2) i `pdf` (bramka PDF).
- **Konwencje:** komentarze w kodzie po polsku, jak w istniejących plikach; commity po angielsku.
- **Komendy:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Odstępstwa od spec (spec zaktualizowana razem z tym planem)

- **Nazwy zmiennych:** `NEXT_PUBLIC_AFFILIATE_*` w formacie „parametr albo szablon `{url}`” zamiast `BOOKING_AFFILIATE_ID` i podobnych, bo linki powstają w komponentach klienckich.
- **Builder lotów:** leży w `src/lib/flights/search-url.ts`, obok buildera Skyscannera, a nie w `affiliate.ts`.
- **Darmowy koszt:** sprawdza go `isFreeCost` zamiast wzorca `/free|bezpł|0 zł/i`, który uznaje „~10 zł” za darmowe.
- **Przechowalnie:** linki prowadzą na strony główne partnerów, bo adresy miast wymagałyby angielskich nazw, których w danych nie ma.

## Review Focus

1. **Płatna atrakcja uznana za darmową.** Wzorzec ze spec łapie „0 zł” w „~10 zł”, więc przycisk biletów znikałby przy płatnych atrakcjach. Test w Task 2: `isFreeCost("~10 zł")`, `isFreeCost("100 PLN")` i `isFreeCost("~20 €")` zwracają `false`.
2. **Strona sukcesu ładuje się przed skryptem GA.** `trackEvent` bez `window.gtag` po cichu nic nie robi, więc `purchase` by przepadł, a mimo to zostałby oznaczony jako wysłany. Test w Task 6: `purchaseAction(storage, id, false)` zwraca `"wait"` i niczego nie zapisuje w storage.
3. **Odświeżenie albo powrót na `/payment/success`** wysłałby `purchase` drugi raz i zawyżył przychód. Test w Task 6: po `rememberPurchase` kolejne `purchaseAction` dla tego samego id zwraca `"skip"`.
4. **Wylot tuż po północy czasu lokalnego** (`2026-12-05T00:30:00+01:00`) po przeliczeniu na UTC dałby 4 grudnia i link do złego dnia. Test w Task 1: `buildAviasalesUrl` bierze dzień i miesiąc z tekstu daty, wynik zawiera `WRO0512`.
5. **Wyjazd bez `bestOffer` albo z nieczytelnym `affiliateUrl`** (stare zapisane wyjazdy, mocki). Karta lotu się nie pokazuje, `/destinations` wraca do dzisiejszego linku do Skyscannera i nic się nie wysypuje. Test w Task 2: `flightLink(undefined)`, `flightLink({ affiliateUrl: "nie-url" })` i link z obcej domeny zwracają `null`.

---

### Task 1: Link do lotu przez Aviasales z markerem

**Files:**
- Modify: `src/lib/flights/search-url.ts`
- Modify: `src/lib/flights/travelpayouts.ts:73-75` (`buildBuyLink`)
- Test: `src/lib/flights/search-url.test.ts`

**Interfaces:**
- Produces: `buildAviasalesUrl(originCode: string, destCode: string, departIso: string, returnIso: string, marker: string): string` w `src/lib/flights/search-url.ts`.
- Od tego zadania `FlightOffer.affiliateUrl` z `/api/destinations` to link Aviasales, z markerem, gdy `TRAVELPAYOUTS_MARKER` jest ustawiony.

- [ ] **Step 1: Write the failing test**

Dopisz do `src/lib/flights/search-url.test.ts` (import `buildAviasalesUrl` obok `buildSkyscannerUrl`):

```ts
describe("buildAviasalesUrl", () => {
  it("builds ORIGIN+DDMM+DEST+DDMM+1 with the marker", () => {
    expect(
      buildAviasalesUrl("wro", "bcn", "2026-12-05T06:30:00+01:00", "2026-12-08T21:10:00+01:00", "abc123"),
    ).toBe("https://www.aviasales.com/search/WRO0512BCN08121?marker=abc123");
  });

  it("takes day and month from the date text, not from UTC", () => {
    expect(
      buildAviasalesUrl("WRO", "BCN", "2026-12-05T00:30:00+01:00", "2026-12-08T23:50:00+01:00", "m"),
    ).toContain("/search/WRO0512BCN08121");
  });

  it("omits the query without a marker", () => {
    expect(buildAviasalesUrl("WRO", "BCN", "2026-12-05", "2026-12-08", "")).toBe(
      "https://www.aviasales.com/search/WRO0512BCN08121",
    );
  });

  it("encodes the marker", () => {
    expect(buildAviasalesUrl("WRO", "BCN", "2026-12-05", "2026-12-08", "a b&c")).toContain("?marker=a%20b%26c");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/flights/search-url.test.ts`
Expected: FAIL, `buildAviasalesUrl` nie jest eksportowane.

- [ ] **Step 3: Implement `buildAviasalesUrl` in `src/lib/flights/search-url.ts`**

- Dzień i miesiąc bierzesz z tekstu: `iso.slice(8, 10)` i `iso.slice(5, 7)`, bez `new Date`.
- Kody lotnisk zamieniasz na wielkie litery.
- Końcowe `1` oznacza jednego dorosłego.
- `?marker=` z `encodeURIComponent` dodajesz tylko przy niepustym markerze.
- Komentarz nad funkcją: „Format wyszukiwania Aviasales: WRO0512BCN08121 = z WRO 5.12, powrót 8.12, 1 dorosły.”

- [ ] **Step 4: Switch `buildBuyLink` in `src/lib/flights/travelpayouts.ts:73-75`**

Z datą powrotu `buildBuyLink` zwraca `buildAviasalesUrl(origin, dest, depIso, retIso, process.env.TRAVELPAYOUTS_MARKER ?? "")`. Bez niej zostaje `buildSkyscannerUrl(origin, dest, depIso, null)`. Dopisz import.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/lib/flights/search-url.test.ts && npm run typecheck`
Expected: PASS, bez błędów typów.

- [ ] **Step 6: Sprawdź format w przeglądarce**

Otwórz `https://www.aviasales.com/search/WRO0512BCN08121` z datami w przyszłości (podmień dzień i miesiąc). Expected: wyniki wyszukiwania WRO → BCN w tych dniach. Jeśli Aviasales ich nie pokazuje, zatrzymaj się i zgłoś. Format trzeba wtedy poprawić przed dalszymi zadaniami.

- [ ] **Step 7: Commit**

```bash
git add src/lib/flights/search-url.ts src/lib/flights/search-url.test.ts src/lib/flights/travelpayouts.ts
git commit -m "Send flight offers to Aviasales with the Travelpayouts marker"
```

---

### Task 2: Moduł linków partnerskich

**Files:**
- Create: `src/lib/affiliate.ts`
- Test: `src/lib/affiliate.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces (`src/lib/affiliate.ts`):
  - `type Partner = "aviasales" | "skyscanner" | "booking" | "hostelworld" | "getyourguide" | "tiqets" | "radical_storage" | "bounce"`
  - `type Placement = "flight" | "hotel" | "tickets" | "luggage"`
  - `interface PartnerLink { href: string; partner: Partner; paid: boolean }`
  - `type PartnerConfig = Partial<Record<"booking" | "hostelworld" | "getyourguide" | "tiqets" | "radical_storage" | "bounce", string | undefined>>`
  - `applyPartner(url: string, config: string | undefined): string | null`
  - `bookingLink(input: { city: string; country: string; checkin?: string; checkout?: string }, config?: PartnerConfig): PartnerLink`
  - `hostelworldLink(city: string, config?: PartnerConfig): PartnerLink`
  - `ticketsLink(input: { title: string; city: string }, config?: PartnerConfig): PartnerLink`
  - `luggageLink(config?: PartnerConfig): PartnerLink`
  - `flightLink(offer: FlightOffer | null | undefined): PartnerLink | null`
  - `isFreeCost(cost: string | null | undefined): boolean`
  - `partnerLinkProps(link: PartnerLink, placement: Placement, city: string): { href: string; target: "_blank"; rel: string; "data-affiliate": Placement; "data-partner": Partner; "data-paid": "true" | "false"; "data-city": string }`
  - `affiliateClickParams(dataset: Record<string, string | undefined>): { placement: string; partner: string; paid: boolean; city?: string } | null`
  - Domyślny `config` we wszystkich builderach to stała modułu `PARTNER_CONFIG` z env.

- [ ] **Step 1: Write the failing test**

`src/lib/affiliate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  affiliateClickParams, applyPartner, bookingLink, flightLink, hostelworldLink,
  isFreeCost, luggageLink, partnerLinkProps, ticketsLink,
} from "./affiliate";
import type { FlightOffer } from "@/types";

describe("applyPartner", () => {
  it("returns null without config", () => {
    expect(applyPartner("https://x.com/s?q=a", undefined)).toBeNull();
    expect(applyPartner("https://x.com/s?q=a", "  ")).toBeNull();
  });

  it("appends a parameter with ? or &", () => {
    expect(applyPartner("https://x.com/s?q=a", "aid=123")).toBe("https://x.com/s?q=a&aid=123");
    expect(applyPartner("https://x.com/", "partner_id=AB")).toBe("https://x.com/?partner_id=AB");
    expect(applyPartner("https://x.com/", "?aid=1")).toBe("https://x.com/?aid=1");
  });

  it("puts the encoded target into a {url} template", () => {
    const target = "https://www.getyourguide.com/s/?q=Wieża Belém Lizbona&x=1";
    expect(applyPartner(target, "https://tp.media/r?marker=9&u={url}")).toBe(
      `https://tp.media/r?marker=9&u=${encodeURIComponent(target)}`,
    );
  });
});

describe("partner links", () => {
  it("keeps today's Booking search and adds the partner", () => {
    const link = bookingLink(
      { city: "Lizbona", country: "Portugalia", checkin: "2026-12-05", checkout: "2026-12-08" },
      { booking: "aid=1" },
    );
    expect(link).toEqual({
      href: "https://www.booking.com/search.html?ss=Lizbona%2C+Portugalia&group_adults=1&no_rooms=1&checkin=2026-12-05&checkout=2026-12-08&aid=1",
      partner: "booking",
      paid: true,
    });
  });

  it("works without config, just without commission", () => {
    expect(hostelworldLink("Lizbona", {})).toEqual({
      href: "https://www.hostelworld.com/search?search=Lizbona",
      partner: "hostelworld",
      paid: false,
    });
  });

  it("prefers GetYourGuide, then Tiqets, then unpaid GetYourGuide", () => {
    const input = { title: "Wieża Belém", city: "Lizbona" };
    expect(ticketsLink(input, { getyourguide: "partner_id=G", tiqets: "partner=T" }).partner).toBe("getyourguide");
    expect(ticketsLink(input, { tiqets: "partner=T" }).partner).toBe("tiqets");
    expect(ticketsLink(input, {})).toEqual({
      href: `https://www.getyourguide.com/s/?q=${encodeURIComponent("Wieża Belém Lizbona")}`,
      partner: "getyourguide",
      paid: false,
    });
  });

  it("prefers Radical Storage, then Bounce", () => {
    expect(luggageLink({ bounce: "ref=B" })).toEqual({ href: "https://usebounce.com/?ref=B", partner: "bounce", paid: true });
    expect(luggageLink({})).toEqual({ href: "https://radicalstorage.com/", partner: "radical_storage", paid: false });
  });
});

describe("flightLink", () => {
  const aviasales = "https://www.aviasales.com/search/WRO0512BCN08121";

  it("recognizes a paid Aviasales link", () => {
    expect(flightLink({ affiliateUrl: `${aviasales}?marker=abc` } as FlightOffer)).toEqual({
      href: `${aviasales}?marker=abc`,
      partner: "aviasales",
      paid: true,
    });
  });

  it("treats Aviasales without a marker and Skyscanner as unpaid", () => {
    expect(flightLink({ affiliateUrl: aviasales } as FlightOffer)).toMatchObject({ partner: "aviasales", paid: false });
    expect(flightLink({ affiliateUrl: "https://www.skyscanner.pl/transport/loty/wro/bcn/" } as FlightOffer))
      .toMatchObject({ partner: "skyscanner", paid: false });
  });

  it("returns null without a usable flight link", () => {
    expect(flightLink(undefined)).toBeNull();
    expect(flightLink({} as FlightOffer)).toBeNull();
    expect(flightLink({ affiliateUrl: "nie-url" } as FlightOffer)).toBeNull();
    expect(flightLink({ affiliateUrl: "https://example.com/loty" } as FlightOffer)).toBeNull();
  });
});

describe("isFreeCost", () => {
  it.each(["Free", "free", "Bezpłatnie", "bezpłatne", "Darmowe", "0 zł", "~0 EUR", "", undefined, null])(
    "%s is free",
    (cost) => expect(isFreeCost(cost)).toBe(true),
  );

  it.each(["~10 zł", "100 PLN", "~20 €", "15 EUR", "€€"])("%s is paid", (cost) => {
    expect(isFreeCost(cost)).toBe(false);
  });
});

describe("partnerLinkProps", () => {
  it("marks paid links as sponsored and carries tracking data", () => {
    expect(partnerLinkProps({ href: "https://a.com", partner: "booking", paid: true }, "hotel", "Lizbona")).toEqual({
      href: "https://a.com",
      target: "_blank",
      rel: "sponsored noopener noreferrer",
      "data-affiliate": "hotel",
      "data-partner": "booking",
      "data-paid": "true",
      "data-city": "Lizbona",
    });
  });

  it("does not mark unpaid links as sponsored", () => {
    expect(partnerLinkProps({ href: "https://a.com", partner: "booking", paid: false }, "hotel", "Lizbona").rel)
      .toBe("noopener noreferrer");
  });
});

describe("affiliateClickParams", () => {
  it("reads the attributes set by partnerLinkProps", () => {
    expect(affiliateClickParams({ affiliate: "tickets", partner: "getyourguide", paid: "true", city: "Lizbona" }))
      .toEqual({ placement: "tickets", partner: "getyourguide", paid: true, city: "Lizbona" });
  });

  it("ignores links that are not partner links", () => {
    expect(affiliateClickParams({})).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/affiliate.test.ts`
Expected: FAIL, brak modułu `./affiliate`.

- [ ] **Step 3: Implement `src/lib/affiliate.ts`**

Adresy docelowe (stałe w module):
- **Booking:** `https://www.booking.com/search.html` z `URLSearchParams` w kolejności `ss` (`{city}, {country}`), `group_adults=1`, `no_rooms=1`, potem opcjonalnie `checkin` i `checkout`, jak dzisiejszy `buildBookingUrl` w `src/app/plan/[tripId]/page.tsx:19-24`.
- **Hostelworld:** `https://www.hostelworld.com/search?search={city}`, z `encodeURIComponent`.
- **GetYourGuide:** `https://www.getyourguide.com/s/?q={tytuł miasto}`.
- **Tiqets:** `https://www.tiqets.com/en/search?q={tytuł miasto}`.
- **Radical Storage:** `https://radicalstorage.com/`.
- **Bounce:** `https://usebounce.com/`.

Konfiguracja z env, tylko dosłowne odczyty:

```ts
// Next wstawia NEXT_PUBLIC_* do paczki tylko przy dosłownym odczycie, nie przez process.env[klucz]
const PARTNER_CONFIG: PartnerConfig = {
  booking: process.env.NEXT_PUBLIC_AFFILIATE_BOOKING,
  hostelworld: process.env.NEXT_PUBLIC_AFFILIATE_HOSTELWORLD,
  getyourguide: process.env.NEXT_PUBLIC_AFFILIATE_GETYOURGUIDE,
  tiqets: process.env.NEXT_PUBLIC_AFFILIATE_TIQETS,
  radical_storage: process.env.NEXT_PUBLIC_AFFILIATE_RADICAL_STORAGE,
  bounce: process.env.NEXT_PUBLIC_AFFILIATE_BOUNCE,
};
```

- **`applyPartner`:**
  - po `trim()` pusta wartość daje `null`;
  - wartość z `{url}` zamieniasz, wstawiając `encodeURIComponent(url)`;
  - inną wartość dopisujesz po `?` albo `&`, z obciętym wiodącym `?`/`&`.
- **`isFreeCost`:** darmowy, gdy koszt jest pusty albo `null`, pasuje do `/free|bezpł|darmow/i` albo pierwsza liczba w tekście równa się 0. Brak liczby i słów oznacza koszt płatny.
- **`flightLink`:** `new URL` w try/catch.
  - Host z `aviasales.` daje partnera `aviasales` z `paid` przy niepustym parametrze `marker`.
  - Host z `skyscanner.` daje partnera `skyscanner` z `paid: false`.
  - Wszystko inne daje `null`.
- **`affiliateClickParams`:** czyta `dataset.affiliate`, `partner`, `paid` i `city`. Bez `affiliate` zwraca `null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/affiliate.test.ts`
Expected: PASS.

- [ ] **Step 5: Sprawdź adresy docelowe w przeglądarce**

Otwórz linki z `ticketsLink({ title: "Wieża Belém", city: "Lizbona" }, {})` i wersję z Tiqets oraz obie strony przechowalni. Expected: GetYourGuide i Tiqets pokazują wyniki, a strony przechowalni się otwierają. Gdy wyszukiwarka Tiqets nie pokazuje wyników, zmień stałą na `https://www.tiqets.com/en/` i popraw oczekiwanie w teście.

- [ ] **Step 6: Dopisz zmienne do `.env.example`, pod `TRAVELPAYOUTS_MARKER=`**

```
# Linki partnerskie: parametr dopisywany do adresu (np. aid=1234567)
# albo szablon przekierowania z {url} (np. https://tp.media/r?...&u={url}); puste = bez prowizji
NEXT_PUBLIC_AFFILIATE_BOOKING=
NEXT_PUBLIC_AFFILIATE_HOSTELWORLD=
NEXT_PUBLIC_AFFILIATE_GETYOURGUIDE=
NEXT_PUBLIC_AFFILIATE_TIQETS=
NEXT_PUBLIC_AFFILIATE_RADICAL_STORAGE=
NEXT_PUBLIC_AFFILIATE_BOUNCE=
```

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`
Expected: bez błędów.

```bash
git add src/lib/affiliate.ts src/lib/affiliate.test.ts .env.example
git commit -m "Add partner link builders with optional affiliate IDs"
```

---

### Task 3: Karta lotu, noclegi z partnerem i zdarzenie `affiliate_click`

**Files:**
- Create: `src/app/components/PartnerLinks.tsx`
- Modify: `src/app/plan/[tripId]/page.tsx:19-28` (usuń lokalne buildery) i `:507-549` (sekcja „Noclegi w {miasto}”)
- Modify: `src/app/destinations/page.tsx:422-430` (link „Szukaj lotów ↗”)
- Modify: `src/app/components/Analytics.tsx` (handler `onClick`)

**Interfaces:**
- Consumes (Task 2): `bookingLink`, `hostelworldLink`, `flightLink`, `partnerLinkProps`, `affiliateClickParams`, `PartnerLink`.
- Produces (`src/app/components/PartnerLinks.tsx`, `"use client"`):
  - `PartnerNote({ show }: { show: boolean })`: drobny tekst „link partnerski”, rysowany tylko przy `show`.
  - `HotelLinks({ city, country, checkin, checkout }: { city: string; country: string; checkin?: string; checkout?: string })`
  - `FlightCard({ offer, city }: { offer: FlightOffer | undefined; city: string })`: nic nie rysuje, gdy `flightLink(offer)` zwraca `null`.

- [ ] **Step 1: `PartnerNote` i `HotelLinks` w `src/app/components/PartnerLinks.tsx`**

Przenieś znaczniki sekcji z `page.tsx:507-549` bez zmian w wyglądzie: nagłówek, dwie karty z etykietą, opisem, kolorami i „Szukaj →”. Każde `<a>` dostaje `{...partnerLinkProps(link, "hotel", city)}` zamiast `href`, `target` i `rel`. Pod kartami `<PartnerNote show={booking.paid || hostelworld.paid} />`. Opakowanie zostaje: `className="px-5 mb-4 no-print"`.

- [ ] **Step 2: `FlightCard` w tym samym pliku**

Karta w stylu kart noclegów. Cała karta to `<a {...partnerLinkProps(link, "flight", city)}>` w opakowaniu `px-5 mb-4 no-print`. Teksty:
- nagłówek: „Lot do {city}”;
- linia: „{offer.origin.city} ({offer.origin.code}) · {offer.price} zł · {DD.MM}–{DD.MM}”. Daty bierzesz z `departureDate` i `returnDate` (`YYYY-MM-DD` → `DD.MM`). Gdy brakuje którejś z nich, część z datami znika.
- pod spodem: „cena z ostatnich wyszukiwań, może się zmienić”;
- przycisk: „Sprawdź lot →”;
- `<PartnerNote show={link.paid} />`.

- [ ] **Step 3: Podepnij komponenty w `src/app/plan/[tripId]/page.tsx`**

Usuń `buildBookingUrl` i `buildHostelworldUrl` (19-28). Sekcję 507-549 zastąp dwoma komponentami:
- `<FlightCard offer={dest?.bestOffer} city={plan.city} />`;
- `<HotelLinks city={plan.city} country={plan.country} checkin={dest?.bestOffer?.departureDate} checkout={dest?.bestOffer?.returnDate} />`.

- [ ] **Step 4: Link „Szukaj lotów ↗” w `src/app/destinations/page.tsx:422-430`**

`const flight = flightLink(dest.bestOffer) ?? { href: buildSkyscannerUrl(dest, airports), partner: "skyscanner" as const, paid: false };`, a na `<a>`: `{...partnerLinkProps(flight, "flight", dest.city)}` zamiast `href`, `target` i `rel`. `className` i `style` zostają. Lokalna `buildSkyscannerUrl` (36-39) zostaje jako zapas.

- [ ] **Step 5: `affiliate_click` w `src/app/components/Analytics.tsx`**

W `onClick`, po `trackEvent("ui_click", …)`: `const aff = link ? affiliateClickParams(link.dataset) : null;` i przy `aff` wyślij `trackEvent("affiliate_click", { ...aff, page_path: window.location.pathname })`.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: bez błędów.

- [ ] **Step 7: Sprawdź w przeglądarce**

Serwer z `.claude/launch.json`, plan z lotem:
- karta lotu pokazuje lotnisko, cenę i daty, a kliknięcie otwiera Aviasales w nowej karcie;
- Booking i Hostelworld otwierają się jak wcześniej;
- przy ustawionym `NEXT_PUBLIC_GA_ID` i zgodzie na ciasteczka `window.dataLayer` po kliknięciu zawiera wpis `event` → `affiliate_click` z `placement: "flight"` i `partner: "aviasales"`.

Na `/destinations` „Szukaj lotów ↗” przy kierunku z prawdziwą ceną prowadzi do Aviasales z datami. Bez `TRAVELPAYOUTS_TOKEN` kierunki pochodzą z mocków i link zostaje Skyscannerem, to też poprawny wynik.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/PartnerLinks.tsx "src/app/plan/[tripId]/page.tsx" src/app/destinations/page.tsx src/app/components/Analytics.tsx
git commit -m "Show partner links for flights and stays and track partner clicks"
```

---

### Task 4: Bilety w kafelkach, przechowalnia na ostatni dzień, regulamin §7

**Files:**
- Modify: `src/app/components/PartnerLinks.tsx` (dodaj `TicketsLink` i `LuggageTile`)
- Modify: `src/app/plan/[tripId]/page.tsx`:
  - `:676-694` (`DayPlanView` dostaje `isLastDay`);
  - `:994-1014` (typ propsów `DayPlanView`);
  - `:1072-1078` (`ActivityCard` dostaje `city`);
  - `:1379-1477` (`ActivityCard`).
- Modify: `src/app/regulamin/page.tsx:185-195` (§7)

**Interfaces:**
- Consumes (Task 2): `ticketsLink`, `luggageLink`, `isFreeCost`, `partnerLinkProps`. (Task 3): `PartnerNote`.
- Produces:
  - `TicketsLink({ activity, city }: { activity: DayActivity; city: string })`: rysuje się tylko przy `activity.type === "attraction" && !isFreeCost(activity.cost)`.
  - `LuggageTile({ city }: { city: string })`
  - `DayPlanView` z propem `isLastDay: boolean`, `ActivityCard` z propem `city: string`.

- [ ] **Step 1: `TicketsLink` w `src/app/components/PartnerLinks.tsx`**

Mały link w stylu „Nawiguj →” z `ActivityCard` (`text-xs font-semibold`):
- tekst „Sprawdź bilety ↗”;
- `{...partnerLinkProps(ticketsLink({ title: activity.title, city }), "tickets", city)}`;
- `onClick={(e) => e.stopPropagation()}`, jak przy linku do map;
- klasa `no-print`;
- obok `<PartnerNote show={link.paid} />`.

- [ ] **Step 2: `LuggageTile` w tym samym pliku**

Kafelek w stylu kafelków aktywności (`rounded-2xl`, ramka), z klasami `ml-11 mt-3 no-print`. Teksty:
- nagłówek „Wymeldowanie przed wylotem?”;
- opis „Zostaw bagaż na kilka godzin i zwiedzaj bez plecaka.”;
- link „Znajdź przechowalnię ↗” z `{...partnerLinkProps(luggageLink(), "luggage", city)}`;
- `<PartnerNote show={link.paid} />`.

- [ ] **Step 3: Podepnij w `src/app/plan/[tripId]/page.tsx`**

- `DayPlanView` (676-694) dostaje `isLastDay={i === plan.days.length - 1}`, a jego typ propsów (994-1014) pole `isLastDay: boolean`. Przed komentarzem `{/* Add activity button */}` dopisz `{isLastDay && <LuggageTile city={city} />}`.
- `ActivityCard` (1072-1078) dostaje `city={city}`, a jego typ propsów (1379-1389) pole `city: string`. Na końcu kafelka, za blokiem `activity.location`, dopisz `<TicketsLink activity={activity} city={city} />`.
- Dwa porównania `activity.cost === "Free" || activity.cost === "Bezpłatnie"` w plakietce kosztu zastąp `isFreeCost(activity.cost)`.

- [ ] **Step 4: Regulamin §7 w `src/app/regulamin/page.tsx:185-195`**

Oba `<P>` zastąp tym tekstem:

```tsx
<P>
  Serwis zawiera linki partnerskie (afiliacyjne) do zewnętrznych serwisów: wyszukiwarki lotów Aviasales
  (za pośrednictwem sieci Travelpayouts), serwisów z noclegami (Booking.com, Hostelworld), biletów na
  atrakcje (GetYourGuide, Tiqets) i przechowalni bagażu (Radical Storage, Bounce). Kliknięcie takiego
  linku i dokonanie zakupu może skutkować otrzymaniem przez Operatora prowizji od partnera. Linki
  afiliacyjne nie wpływają na cenę dla Użytkownika.
</P>
<P>
  Linki partnerskie są oznaczone w Serwisie dopiskiem „link partnerski”, a w kodzie strony atrybutem{" "}
  <code>{'rel="sponsored"'}</code>.
</P>
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: bez błędów.

- [ ] **Step 6: Sprawdź w przeglądarce**

- Atrakcja z kosztem „~15 EUR” ma „Sprawdź bilety ↗”.
- Atrakcja „Free”, jedzenie i transport go nie mają.
- Kafelek przechowalni jest tylko na ostatnim dniu.
- Podgląd wydruku (Cmd+P) nie pokazuje nowych elementów.
- `/regulamin` ma nowy §7.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/PartnerLinks.tsx "src/app/plan/[tripId]/page.tsx" src/app/regulamin/page.tsx
git commit -m "Link paid attractions to tickets and suggest luggage storage on the last day"
```

---

### Task 5: `begin_checkout` z bramką i kwotą, `plan_generated`

**Files:**
- Modify: `src/lib/prices.ts`
- Test: `src/lib/prices.test.ts` (nowy)
- Modify: `src/app/components/CheckoutButton.tsx`
- Modify: `src/app/pricing/page.tsx:212`, `src/app/plan/[tripId]/page.tsx:462-477` i `:902`
- Modify: `src/app/destinations/page.tsx` (`handleGenerate`, gałąź `msg.done`) i `src/app/quick/page.tsx` (gałąź `msg.done`)

**Interfaces:**
- Produces: `planPrice(planKey: string): number | undefined` w `src/lib/prices.ts` oraz opcjonalny prop `gate?: string` w `CheckoutButton`.

- [ ] **Step 1: Write the failing test**

`src/lib/prices.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { planPrice } from "./prices";

describe("planPrice", () => {
  it("returns the gross PLN amount for each plan key", () => {
    expect(planPrice("pack_5")).toBe(14.99);
    expect(planPrice("pro_monthly")).toBe(19.99);
    expect(planPrice("pro_yearly")).toBe(149.99);
  });

  it("returns undefined for an unknown key", () => {
    expect(planPrice("nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/prices.test.ts`
Expected: FAIL, `planPrice` nie jest eksportowane.

- [ ] **Step 3: Implement `planPrice` in `src/lib/prices.ts`**

`pack_5` → `PRICES.pack`, `pro_monthly` → `PRICES.proMonthly`, `pro_yearly` → `PRICES.proYearly`, wynik `Number(amount)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/prices.test.ts`
Expected: PASS.

- [ ] **Step 5: `CheckoutButton` i miejsca użycia**

- `CheckoutButton` przyjmuje `gate?: string` i wysyła `trackEvent("begin_checkout", { plan: planKey, gate, value: planPrice(planKey), currency: "PLN" })`.
- Cennik (`pricing/page.tsx:212`) przekazuje `gate="pricing"`.
- Oba przyciski banera na planie (462-477) przekazują `gate="plan_banner"`.
- Przycisk w bramce PDF (902) przekazuje `gate="pdf"`.

- [ ] **Step 6: `plan_generated`**

W gałęzi `msg.done` w `src/app/destinations/page.tsx` i `src/app/quick/page.tsx`, przed `router.push`, wyślij `trackEvent("plan_generated", { city: dest.city, days: (msg.plan as TripPlan).days?.length ?? 0 })`. Import `trackEvent` z `@/lib/analytics`.

- [ ] **Step 7: Run all checks**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS, bez błędów.

- [ ] **Step 8: Sprawdź w przeglądarce**

Przy ustawionym GA i zgodzie na ciasteczka:
- po wygenerowaniu planu `window.dataLayer` ma `plan_generated` z miastem i liczbą dni;
- „Zostań Pro →” przy Pro Rocznym na `/pricing` dodaje `begin_checkout` z `gate: "pricing"` i `value: 149.99`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/prices.ts src/lib/prices.test.ts src/app/components/CheckoutButton.tsx src/app/pricing/page.tsx "src/app/plan/[tripId]/page.tsx" src/app/destinations/page.tsx src/app/quick/page.tsx
git commit -m "Track generated plans and checkout value by entry point"
```

---

### Task 6: `purchase` na stronie sukcesu

**Files:**
- Modify: `src/lib/analytics.ts`
- Test: `src/lib/analytics.test.ts` (nowy)
- Create: `src/app/payment/success/PurchaseTracker.tsx`
- Modify: `src/app/payment/success/page.tsx`

**Interfaces:**
- Produces (`src/lib/analytics.ts`):
  - `type KeyValueStorage = Pick<Storage, "getItem" | "setItem">`
  - `purchaseAction(storage: KeyValueStorage | null, transactionId: string, gtagReady: boolean): "send" | "wait" | "skip"`
  - `rememberPurchase(storage: KeyValueStorage | null, transactionId: string): void`
  - typ parametrów `trackEvent` przyjmuje też `items?: Array<Record<string, string | number>>`.
- Produces: `PurchaseTracker({ transactionId, value, currency, plan }: { transactionId: string; value: number; currency: string; plan: string })` (`"use client"`, zwraca `null`).

- [ ] **Step 1: Write the failing test**

`src/lib/analytics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { purchaseAction, rememberPurchase } from "./analytics";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    size: () => map.size,
  };
}

const blocked = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
};

describe("purchaseAction", () => {
  it("sends a new purchase once GA is ready", () => {
    expect(purchaseAction(memoryStorage(), "cs_1", true)).toBe("send");
  });

  it("waits for GA without remembering anything", () => {
    const storage = memoryStorage();
    expect(purchaseAction(storage, "cs_1", false)).toBe("wait");
    expect(storage.size()).toBe(0);
  });

  it("skips a purchase that was already sent", () => {
    const storage = memoryStorage();
    rememberPurchase(storage, "cs_1");
    expect(purchaseAction(storage, "cs_1", true)).toBe("skip");
    expect(purchaseAction(storage, "cs_2", true)).toBe("send");
  });

  it("still sends when storage is blocked or missing", () => {
    expect(purchaseAction(blocked, "cs_1", true)).toBe("send");
    expect(purchaseAction(null, "cs_1", true)).toBe("send");
    expect(() => rememberPurchase(blocked, "cs_1")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/analytics.test.ts`
Expected: FAIL, funkcje nie są eksportowane.

- [ ] **Step 3: Implement in `src/lib/analytics.ts`**

Klucz w storage: `purchase_sent_{transactionId}`. `getItem` i `setItem` w try/catch: błąd odczytu znaczy „nie wysłano”, a błąd zapisu ignorujesz. Rozszerz typ `Params` o `items`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/analytics.test.ts`
Expected: PASS.

- [ ] **Step 5: `PurchaseTracker` w `src/app/payment/success/PurchaseTracker.tsx`**

- Bez `GA_ID` nic nie robi.
- W `useEffect`: `window.sessionStorage` w try/catch (przy błędzie `null`), potem co 250 ms, najdłużej 10 s, wywołuje `purchaseAction(storage, transactionId, !!window.gtag)`:
  - `"send"`: `trackEvent("purchase", { transaction_id: transactionId, value, currency, items: [{ item_id: plan, price: value, quantity: 1 }] })`, potem `rememberPurchase` i koniec;
  - `"skip"`: koniec;
  - `"wait"`: następna próba.
- Interwał sprzątany przy odmontowaniu.

- [ ] **Step 6: Podepnij na `src/app/payment/success/page.tsx`**

Zachowaj pobraną sesję w zmiennej. Gdy `valid && session.amount_total != null`, renderuj `<PurchaseTracker transactionId={session.id} value={session.amount_total / 100} currency={(session.currency ?? "pln").toUpperCase()} plan={session.metadata?.plan_key ?? "unknown"} />`.

- [ ] **Step 7: Run all checks**

Run: `npm test && npm run typecheck && npm run lint`
Expected: PASS, bez błędów.

- [ ] **Step 8: Sprawdź z kluczami testowymi Stripe**

Zakup Pro Miesięcznego kartą `4242 4242 4242 4242` (lokalnie albo na Vercel Preview):
- po powrocie `window.dataLayer` ma dokładnie jeden `purchase` z `value: 19.99` i `currency: "PLN"`;
- po odświeżeniu strony nie pojawia się drugi.

- [ ] **Step 9: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts src/app/payment/success/PurchaseTracker.tsx src/app/payment/success/page.tsx
git commit -m "Send one GA4 purchase per Stripe session after payment"
```

---

## Na koniec

- [ ] `npm test && npm run typecheck && npm run lint && npm run build`: wszystko przechodzi.
- [ ] **Poza kodem**, gdy programy partnerskie przyjmą konto:
  - w Vercel (Production i Preview) ustaw `NEXT_PUBLIC_AFFILIATE_*` i `TRAVELPAYOUTS_MARKER`, a potem zrób nowy deploy;
  - w GA4 zarejestruj wymiary niestandardowe `placement`, `partner`, `paid` i `gate`;
  - sprawdź, że `purchase` jest zdarzeniem kluczowym.
