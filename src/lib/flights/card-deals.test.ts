import { describe, expect, it } from "vitest";
import { buildFlightLink } from "@/lib/drop/links";
import type { DropDeal } from "@/lib/drop/types";
import { catalogCityFor, dealPriceNotes, isDealPrice, selectCardDeal } from "./card-deals";
import { cardFlightPriceCopy } from "./card-price";

const now = Date.parse("2026-11-19T12:00:00Z"); // czwartek
const bcn = { city: "Barcelona", country: "Hiszpania" };
const deal = (over: Partial<DropDeal> = {}): DropDeal => ({
  week: "2026-W47", origin: "WRO", city_code: "BCN", city_name: "Barcelona", price: 389,
  departure_at: "2026-11-20T06:15:00+01:00", return_at: "2026-11-22T21:40:00+01:00",
  airline: "FR", transfers: 0, link: "/search/WRO2011BCN22111?currency=pln", fetched_at: "2026-11-18T18:00:00Z", ...over,
});
const quiz = { airports: ["WRO"], month: 11 };

describe("selectCardDeal", () => {
  it("prices a catalog city from a fresh, upcoming deal of the selected airport", () => {
    const q = selectCardDeal(bcn, quiz, [deal()], now)!;
    expect(isDealPrice(q)).toBe(true);
    expect(q).toMatchObject({ source: "deal", origin: "WRO", destination: "BCN", price: 389,
      departDate: "2026-11-20", returnDate: "2026-11-22", outsideMonth: false, checkedAt: Date.parse("2026-11-18T18:00:00Z") });
    expect(cardFlightPriceCopy(q)).toMatchObject({ amount: "od 389 zł", note: "sprawdzone 18.11" });
  });

  it("returns null for no deals, another airport, another city and unknown (non-catalog) cities", () => {
    expect(selectCardDeal(bcn, quiz, [], now)).toBeNull();
    expect(selectCardDeal(bcn, quiz, [deal({ origin: "KTW" })], now)).toBeNull();
    expect(selectCardDeal(bcn, quiz, [deal({ city_code: "ATH", city_name: "Ateny" })], now)).toBeNull();
    expect(selectCardDeal({ city: "Gdzieśtam", country: "Nigdzie" }, quiz, [deal()], now)).toBeNull();
    expect(catalogCityFor({ city: "Gdzieśtam", country: "Nigdzie" })).toBeNull();
  });

  it("matches by the Travelpayouts name when the code differs from the catalog IATA (Rzym: ROM vs FCO)", () => {
    const rome = selectCardDeal({ city: "Rzym", country: "Włochy" }, quiz, [deal({ city_code: "ROM", city_name: "Rzym" })], now);
    expect(rome?.destination).toBe("ROM");
  });

  it("rejects stale deals (older than 8 days), missing/future fetch dates and invalid prices", () => {
    expect(selectCardDeal(bcn, quiz, [deal({ fetched_at: "2026-11-10T18:00:00Z" })], now)).toBeNull();
    expect(selectCardDeal(bcn, quiz, [deal({ fetched_at: "" })], now)).toBeNull();
    expect(selectCardDeal(bcn, quiz, [deal({ fetched_at: "2026-11-25T00:00:00Z" })], now)).toBeNull();
    expect(selectCardDeal(bcn, quiz, [deal({ price: 0 })], now)).toBeNull();
    // granica 8 dni: jeszcze świeże
    expect(selectCardDeal(bcn, quiz, [deal({ fetched_at: "2026-11-11T12:00:00Z" })], now)).not.toBeNull();
  });

  it("rejects flights that already departed and broken dates", () => {
    expect(selectCardDeal(bcn, quiz, [deal({ departure_at: "2026-11-19T06:15:00+01:00" })], now)).toBeNull();
    expect(selectCardDeal(bcn, quiz, [deal({ departure_at: "nie-data" })], now)).toBeNull();
    expect(selectCardDeal(bcn, quiz, [deal({ return_at: "" })], now)).toBeNull();
  });

  it("never promotes an older week when the newest week has no usable row for the city", () => {
    const older = deal({ week: "2026-W46", price: 99, departure_at: "2026-11-21T06:15:00+01:00", fetched_at: "2026-11-12T18:00:00Z" });
    const newest = deal({ week: "2026-W47", price: 500, departure_at: "2026-11-19T06:15:00+01:00" }); // już odleciał
    expect(selectCardDeal(bcn, quiz, [older, newest], now)).toBeNull();
    // starszy tydzień wygrywa tylko gdy jest jedynym dostępnym
    expect(selectCardDeal(bcn, quiz, [older], now)?.price).toBe(99);
    // najnowszy tydzień wygrywa mimo wyższej ceny
    expect(selectCardDeal(bcn, quiz, [older, deal({ price: 500 })], now)?.price).toBe(500);
  });

  it("picks the cheapest across selected airports, ties go to the earlier flight", () => {
    const q = selectCardDeal(bcn, { airports: ["WRO", "KTW"], month: 11 }, [
      deal({ price: 400 }), deal({ origin: "KTW", price: 350, departure_at: "2026-11-21T06:00:00+01:00", return_at: "2026-11-23T20:00:00+01:00" }),
      deal({ origin: "KTW", city_code: "BCN", price: 350, departure_at: "2026-11-20T08:00:00+01:00" }),
    ], now)!;
    expect(q.origin).toBe("KTW");
    expect(q.departDate).toBe("2026-11-20");
  });

  it("BER uses the catalog BER code, and a city without one (Praga) is still matched by name", () => {
    const ber = selectCardDeal(bcn, { airports: ["BER"], month: 11 }, [deal({ origin: "BER" })], now);
    expect(ber?.origin).toBe("BER");
    const prg = selectCardDeal({ city: "Praga", country: "Czechy" }, { airports: ["BER"], month: 11 },
      [deal({ origin: "BER", city_code: "PRG", city_name: "Praga" })], now);
    expect(prg?.destination).toBe("PRG");
    expect(selectCardDeal(bcn, { airports: ["WRO"], month: 11 }, [deal({ origin: "BER" })], now)).toBeNull();
  });

  it("flags a weekend outside the month chosen in the quiz and says so", () => {
    const q = selectCardDeal(bcn, { airports: ["WRO"], month: 12 }, [deal()], now)!;
    expect(q.outsideMonth).toBe(true);
    expect(dealPriceNotes(q, 1).join(" ")).toContain("nie wybrany w quizie miesiąc");
    expect(dealPriceNotes(selectCardDeal(bcn, quiz, [deal()], now)!, 1).join(" ")).not.toContain("nie wybrany");
  });

  it("says when the flight's trip length is far from the quiz duration, and stays quiet when it is close", () => {
    const long = selectCardDeal(bcn, { ...quiz, duration: 7 }, [deal()], now)!;
    expect(long.tripDays).toBe(3);
    expect(dealPriceNotes(long, 1).join(" ")).toContain("wyjazd na 3 dni, w quizie wybrano 7");
    const close = selectCardDeal(bcn, { ...quiz, duration: 4 }, [deal()], now)!;
    expect(dealPriceNotes(close, 1).join(" ")).not.toContain("w quizie wybrano");
    expect(dealPriceNotes(selectCardDeal(bcn, quiz, [deal()], now)!, 1).join(" ")).not.toContain("w quizie wybrano");
  });

  it("expires at departure at the latest and never beyond 8 days from the fetch", () => {
    const q = selectCardDeal(bcn, quiz, [deal({ fetched_at: "2026-11-19T10:00:00Z" })], now)!;
    expect(q.expiresAt).toBe(Date.parse("2026-11-20T06:15:00+01:00"));
    const far = selectCardDeal(bcn, quiz, [deal({ departure_at: "2026-12-20T06:15:00+01:00", return_at: "2026-12-22T21:40:00+01:00" })], now)!;
    expect(far.expiresAt).toBe(far.checkedAt + 8 * 24 * 60 * 60 * 1000);
  });

  it("states per-adult, route and never multiplies for a group", () => {
    const q = selectCardDeal(bcn, quiz, [deal()], now)!;
    expect(dealPriceNotes(q, 1)[0]).toBe("Za 1 dorosłego, w obie strony · WRO → Barcelona");
    const group = dealPriceNotes(q, 4).join(" ");
    expect(group).toContain("Dla całej grupy sprawdź ją w wyszukiwarce");
    expect(group).not.toMatch(/\d+ zł/);
  });

  it("links to the same flight as the amount, partner-marked only with a marker and project", () => {
    const q = selectCardDeal(bcn, quiz, [deal()], now)!;
    const unpaid = buildFlightLink(q.deal, undefined, q.deal.week, "cards", undefined);
    expect(unpaid.paid).toBe(false);
    expect(unpaid.href).toContain("WRO2011BCN22111");
    const paid = buildFlightLink(q.deal, "m123", q.deal.week, "cards", "p456");
    expect(paid.paid).toBe(true);
    expect(decodeURIComponent(paid.href)).toContain("WRO2011BCN22111");
    expect(decodeURIComponent(paid.href)).toContain("utm_medium=cards");
  });
});
