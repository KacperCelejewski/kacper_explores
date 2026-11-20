import { describe, expect, it } from "vitest";
import { candidateDates } from "./rapidapi";

// Daty zapisane z wersji sprzed wyodrębnienia reguły roku do src/lib/tripMonth.ts:
// ceny lotów nie mogą się zmienić dla tych samych dat "dzisiaj".
describe("candidateDates: daty wyszukiwania lotów (zgodność wstecz)", () => {
  it("20 listopada: najbliższy termin w tym roku, reszta w przyszłym (jak dotąd)", () => {
    expect(candidateDates(11, 2, new Date("2026-11-20T10:00:00Z"))).toEqual([
      { departDate: "2026-11-25", returnDate: "2026-11-26" },
      { departDate: "2027-11-10", returnDate: "2027-11-11" },
      { departDate: "2027-11-15", returnDate: "2027-11-16" },
      { departDate: "2027-11-20", returnDate: "2027-11-21" },
    ]);
  });

  it("31 grudnia: grudzień to już cały 2027", () => {
    expect(candidateDates(12, 2, new Date("2026-12-31T12:00:00Z"))).toEqual([
      { departDate: "2027-12-10", returnDate: "2027-12-11" },
      { departDate: "2027-12-15", returnDate: "2027-12-16" },
      { departDate: "2027-12-20", returnDate: "2027-12-21" },
      { departDate: "2027-12-25", returnDate: "2027-12-26" },
    ]);
  });

  it("styczeń liczony 31 grudnia i 1 stycznia daje te same daty 2027", () => {
    const expected = [
      { departDate: "2027-01-10", returnDate: "2027-01-16" },
      { departDate: "2027-01-15", returnDate: "2027-01-21" },
      { departDate: "2027-01-20", returnDate: "2027-01-26" },
      { departDate: "2027-01-25", returnDate: "2027-01-31" },
    ];
    expect(candidateDates(1, 7, new Date("2026-12-31T12:00:00Z"))).toEqual(expected);
    expect(candidateDates(1, 7, new Date("2027-01-01T00:30:00Z"))).toEqual(expected);
  });
});
