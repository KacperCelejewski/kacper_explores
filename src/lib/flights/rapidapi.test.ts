import { describe, it, expect } from "vitest";
import { buildFlightCacheKey, buildSearchParams, parsePassengers, splitPrice } from "./rapidapi";

const solo = { adults: 1, children: 0, infants: 0 };

describe("buildFlightCacheKey", () => {
  it("jedna osoba dorosła zachowuje dotychczasowy klucz", () => {
    expect(buildFlightCacheKey("WRO", "BCN", "2026-02-20", "2026-02-22", solo)).toBe("sky-WRO-BCN-2026-02-20-2026-02-22");
  });
  it("grupa dostaje sufiks ze składem", () => {
    expect(buildFlightCacheKey("WRO", "BCN", "2026-02-20", "2026-02-22", { adults: 4, children: 0, infants: 0 })).toBe(
      "sky-WRO-BCN-2026-02-20-2026-02-22-a4c0i0"
    );
  });
});

describe("buildSearchParams", () => {
  it("ustawia liczby pasażerów", () => {
    const p = buildSearchParams({ adults: 2, children: 1, infants: 1 });
    expect(p.adults).toBe("2");
    expect(p.childrens).toBe("1");
    expect(p.infants).toBe("1");
  });
  it("dla jednego dorosłego nie dodaje dzieci ani niemowląt", () => {
    expect(buildSearchParams(solo)).toEqual({ adults: "1" });
  });
});

describe("parsePassengers", () => {
  const sp = (q: string) => new URLSearchParams(q);
  it("domyślnie 1/0/0", () => expect(parsePassengers(sp(""))).toEqual(solo));
  it("czyta skład", () =>
    expect(parsePassengers(sp("adults=2&children=1&infants=1"))).toEqual({ adults: 2, children: 1, infants: 1 }));
  it("odrzuca wartości spoza zakresu", () => {
    expect(parsePassengers(sp("adults=0"))).toBeNull();
    expect(parsePassengers(sp("adults=-1"))).toBeNull();
    expect(parsePassengers(sp("adults=abc"))).toBeNull();
    expect(parsePassengers(sp("adults=1.5"))).toBeNull();
    expect(parsePassengers(sp("children=-1"))).toBeNull();
  });
  it("odrzuca zbyt dużą grupę (niemowlęta nie zajmują miejsc)", () => {
    expect(parsePassengers(sp("adults=9&children=1"))).toBeNull();
    expect(parsePassengers(sp("adults=9&infants=2"))).toEqual({ adults: 9, children: 0, infants: 2 });
  });
});

describe("splitPrice", () => {
  it("jedna osoba: cena bez zmian", () => expect(splitPrice(499.6, solo)).toEqual({ price: 500, totalPrice: 500 }));
  it("grupa: cena za osobę to całość podzielona przez wszystkich", () =>
    expect(splitPrice(2000, { adults: 2, children: 1, infants: 1 })).toEqual({ price: 500, totalPrice: 2000 }));
});
