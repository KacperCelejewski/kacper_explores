import { describe, expect, it } from "vitest";
import { dealNotes, hoursInCity } from "./stay";

const deal = (over: Record<string, unknown> = {}) => ({
  departure_at: "2026-11-13T18:30:00+01:00",
  return_at: "2026-11-15T20:00:00+01:00",
  airline: "FR",
  duration_to: 150,
  ...over,
});

describe("hoursInCity", () => {
  it("counts from landing to the return departure", () => {
    // wylot 17:30 UTC + 150 min = 20:00 UTC, powrót 19:00 UTC w niedzielę: 47 h
    expect(hoursInCity(deal())).toBe(47);
  });

  it("works across time zones, because both times carry an offset", () => {
    // wylot 18:30 CET (17:30Z) + 3 h lotu = 20:30Z, powrót 21:00 EET (19:00Z): 46,5 h, zaokrąglone do 47
    expect(hoursInCity(deal({ return_at: "2026-11-15T21:00:00+02:00", duration_to: 180 }))).toBe(47);
  });

  it("is null without a flight duration, because nothing honest can be said", () => {
    expect(hoursInCity(deal({ duration_to: null }))).toBeNull();
    expect(hoursInCity(deal({ duration_to: undefined }))).toBeNull();
  });

  it("is null for dates that cannot be parsed or a return before landing", () => {
    expect(hoursInCity(deal({ departure_at: "nie data" }))).toBeNull();
    expect(hoursInCity(deal({ return_at: "2026-11-13T18:00:00+01:00" }))).toBeNull();
  });
});

describe("dealNotes", () => {
  it("warns about cabin bags on Ryanair and Wizz Air without inventing a price", () => {
    for (const code of ["FR", "W6", "W4"]) {
      const notes = dealNotes({ airline: code });
      expect(notes.join(" ")).toMatch(/bagaż/i);
      expect(notes.join(" ")).not.toMatch(/\d+\s?(zł|pln|eur)/i);
    }
  });

  it("has no baggage note for other airlines", () => {
    expect(dealNotes({ airline: "LO" })).toEqual([]);
  });
});
