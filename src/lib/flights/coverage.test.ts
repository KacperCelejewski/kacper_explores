import { describe, expect, it } from "vitest";
import { FLIGHT_CACHE_TTL_MS } from "@/lib/constants";
import type { DropDeal } from "@/lib/drop/types";
import { cardSearchPairs } from "./card-pairs";
import type { CachedFlightPair } from "./card-price";
import { cardPriceCoverage, dealsCoverage, formatRatio } from "./coverage";
import type { RealFlight } from "./rapidapi";

const now = Date.parse("2026-11-15T12:00:00Z");
const solo = { adults: 1, children: 0, infants: 0 };
const quiz = { month: 11, duration: 3, airports: ["WRO"] };
const cards = [
  { city: "Barcelona", country: "Hiszpania" },
  { city: "Rzym", country: "Włochy" },
  { city: "Budapeszt", country: "Węgry" },
  { city: "Miasto, którego nie ma w katalogu", country: "Nigdzie" },
];

function entryFor(i: number, expiresAt: number, price = 400): CachedFlightPair {
  const pair = cardSearchPairs([cards[i]], quiz, new Date(now))[0][0];
  const flight = { price, totalPrice: price, passengers: solo, departureDate: pair.departDate, returnDate: pair.returnDate } as RealFlight;
  return { ...pair, flights: [flight], expiresAt };
}
const fresh = now + FLIGHT_CACHE_TTL_MS / 2;

describe("cardPriceCoverage (fixtures, no network)", () => {
  it("counts fresh quotes over qualifying cards; uncatalogued cities do not qualify", () => {
    const c = cardPriceCoverage({ destinations: cards, quiz, passengers: solo, now, cache: [entryFor(0, fresh), entryFor(1, fresh)] });
    expect(c).toMatchObject({ eligible: 3, priced: 2, notEligible: ["Miasto, którego nie ma w katalogu"], withoutPrice: ["Budapeszt"] });
    expect(c.ratio).toBeCloseTo(2 / 3);
    expect(formatRatio(c)).toBe("2/3 (67%)");
  });
  it("expired entries do not count, and an empty cache is 0%, not a guess", () => {
    const stale = cardPriceCoverage({ destinations: cards, quiz, passengers: solo, now, cache: [entryFor(0, now - 1)] });
    expect(stale.priced).toBe(0);
    const empty = cardPriceCoverage({ destinations: cards, quiz, passengers: solo, now, cache: [] });
    expect(empty).toMatchObject({ eligible: 3, priced: 0, ratio: 0 });
  });
  it("other passenger composition is not coverage", () => {
    const c = cardPriceCoverage({ destinations: cards, quiz, passengers: { adults: 2, children: 0, infants: 0 }, now, cache: [entryFor(0, fresh)] });
    expect(c.priced).toBe(0);
  });
  it("no qualifying cards gives null ratio instead of 0% or 100%", () => {
    const c = cardPriceCoverage({ destinations: [cards[3]], quiz, passengers: solo, now, cache: [] });
    expect(c.ratio).toBeNull();
    expect(formatRatio(c)).toBe("brak kwalifikujących się");
  });
});

const dealNow = Date.parse("2026-11-19T12:00:00Z");
const deal = (o: Partial<DropDeal>): DropDeal => ({
  week: "2026-W47", origin: "WRO", city_code: "BCN", city_name: "Barcelona", price: 300,
  departure_at: "2026-11-27T20:00:00+01:00", return_at: "2026-11-29T20:00:00+01:00", airline: "FR", transfers: 0, link: "",
  fetched_at: "2026-11-18T20:00:00Z", ...o,
});

describe("dealsCoverage (fixtures, no network)", () => {
  it("measures airports, weekend-list cities and fresh rows", () => {
    const c = dealsCoverage([
      deal({}),
      deal({ origin: "KRK", city_name: "Rzym", city_code: "ROM" }),
      deal({ origin: "GDN", city_name: "Budapeszt", city_code: "BUD", fetched_at: "2026-11-01T20:00:00Z" }),
      deal({ origin: "POZ", departure_at: "2026-11-10T20:00:00+01:00" }),
    ], dealNow);
    expect(c.rows).toMatchObject({ eligible: 3, priced: 2 });
    expect(c.origins.priced).toBe(2);
    expect(c.originsWithoutDeals).toContain("GDN");
    expect(c.originsWithoutDeals).toContain("POZ");
    expect(c.cities.priced).toBe(2);
    expect(c.cities.ratio).toBeGreaterThan(0);
    expect(c.cities.ratio!).toBeLessThan(0.2);
  });
  it("counts only the latest week, as the pages do (older weeks do not inflate the counts)", () => {
    const c = dealsCoverage([
      deal({ week: "2026-W47" }),
      deal({ week: "2026-W46", origin: "KRK", city_name: "Rzym", city_code: "ROM" }),
    ], dealNow);
    expect(c.rows).toMatchObject({ eligible: 1, priced: 1 });
    expect(c.originsWithoutDeals).toContain("KRK");
  });
  it("no rows means 0 fresh and null row ratio", () => {
    const c = dealsCoverage([], dealNow);
    expect(c.rows.ratio).toBeNull();
    expect(c.origins.priced).toBe(0);
  });
});
