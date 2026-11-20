import { describe, expect, it } from "vitest";
import { FLIGHT_CACHE_TTL_MS } from "@/lib/constants";
import { FORBIDDEN_COPY } from "@/lib/homeCopy";
import { flightSearchLink } from "@/lib/affiliate";
import { CARD_FLIGHT_SCOPE, cardFlightPriceCopy, formatFlightPLN, selectCardFlightPrice, type CachedFlightPair } from "./card-price";
import type { RealFlight } from "./rapidapi";

const now = Date.parse("2026-11-15T23:30:00Z");
const solo = { adults: 1, children: 0, infants: 0 };
const group = { adults: 2, children: 1, infants: 0 };
const flight = { price: 421, totalPrice: 421, passengers: solo,
  departureDate: "2026-11-20", returnDate: "2026-11-22" } as RealFlight;
const pair: CachedFlightPair = {
  origin: "WRO", destination: "BCN", departDate: "2026-11-20", returnDate: "2026-11-22",
  expiresAt: now + FLIGHT_CACHE_TTL_MS, flights: [flight],
};

describe("destination card price", () => {
  it("selects a fresh matching quote with the original checked time", () => {
    expect(selectCardFlightPrice([pair], solo, now)).toEqual({
      origin: "WRO", destination: "BCN", departDate: "2026-11-20", returnDate: "2026-11-22",
      price: 421, checkedAt: now, expiresAt: pair.expiresAt,
    });
  });

  it.each([now - 1, now, NaN, now + FLIGHT_CACHE_TTL_MS + 1])("rejects stale or invalid expiry %s", (expiresAt) => {
    expect(selectCardFlightPrice([{ ...pair, expiresAt }], solo, now)).toBeNull();
  });

  it("uses no amount for missing/empty cache, without inventing an estimate", () => {
    for (const entries of [[], [{ ...pair, flights: [] }], [{ ...pair, expiresAt: now - 1 }]]) {
      expect(cardFlightPriceCopy(selectCardFlightPrice(entries, solo, now))).toEqual({
        amount: "Sprawdź w wyszukiwarce", note: "Bez aktualnej ceny", scope: CARD_FLIGHT_SCOPE,
      });
    }
  });

  it("chooses the lowest available cached amount across origins and dates, ignoring stale lower amounts", () => {
    const quote = selectCardFlightPrice([
      { ...pair, expiresAt: now - 1, flights: [{ ...flight, price: 100 }] }, pair,
      { ...pair, origin: "KTW", flights: [{ ...flight, price: 300 }] },
    ], solo, now);
    expect(quote?.price).toBe(300);
    expect(quote?.origin).toBe("KTW");
  });

  it("does not reuse solo prices for a group or a different passenger composition", () => {
    expect(selectCardFlightPrice([pair], group, now)).toBeNull();
    const groupPair = { ...pair, flights: [{ ...flight, price: 500, totalPrice: 1500, passengers: group }] };
    expect(selectCardFlightPrice([groupPair], group, now)?.price).toBe(500);
    expect(selectCardFlightPrice([groupPair], { ...group, infants: 1 }, now)).toBeNull();
  });

  it("rejects a flight whose dates do not match its cache key, and past departures", () => {
    expect(selectCardFlightPrice([{ ...pair, flights: [{ ...flight, returnDate: "2026-11-23" }] }], solo, now)).toBeNull();
    expect(selectCardFlightPrice([{ ...pair, departDate: "2026-11-14" }], solo, now)).toBeNull();
  });

  it.each([0, -3, NaN, Infinity])("rejects invalid amount %s", (price) => {
    expect(selectCardFlightPrice([{ ...pair, flights: [{ ...flight, price }] }], solo, now)).toBeNull();
  });

  it("formats Polish PLN and labels the API quote with the Warsaw checked date", () => {
    expect(formatFlightPLN(12345.6).replace(/\s/g, " ")).toBe("12 346 zł");
    const copy = cardFlightPriceCopy(selectCardFlightPrice([pair], solo, now));
    expect(copy).toEqual({ amount: "od 421 zł", note: "sprawdzone 16.11", scope: CARD_FLIGHT_SCOPE });
    // karta mówi wprost, że kwota to sam lot (nie suma wyjazdu)
    expect(copy.scope).toBe("Sam lot, bez noclegu i wydatków na miejscu");
    for (const pattern of FORBIDDEN_COPY) expect(copy.amount + " " + copy.note + " " + copy.scope).not.toMatch(pattern);
    expect(copy.amount).not.toMatch(/najtań|najtaniej|prawdziw|szacunek/i);
  });

  it("keeps the selected route and dates in Aviasales, and retains the no-date fallback", () => {
    const quote = selectCardFlightPrice([{ ...pair, origin: "KTW" }], solo, now)!;
    expect(flightSearchLink({ ...quote, depart: quote.departDate, passengers: solo }).href)
      .toBe("https://www.aviasales.com/search/KTW2011BCN22111");
    expect(flightSearchLink({ origin: "WRO", destination: "BCN", passengers: solo }).href)
      .toBe("https://www.aviasales.com/?params=WROBCN1");
  });
});
