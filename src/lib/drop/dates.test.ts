import { describe, expect, it } from "vitest";
import { weekKey, weekendDates } from "./dates";

const WED = new Date("2026-11-11T21:00:00Z"); // środa 22:00 Europe/Warsaw

describe("weekendDates", () => {
  it("zwraca 3 warianty od najbliższego czwartku", () => {
    expect(weekendDates(WED)).toEqual([
      { label: "czw-nd", depart: "2026-11-12", return: "2026-11-15" },
      { label: "pt-nd", depart: "2026-11-13", return: "2026-11-15" },
      { label: "pt-pn", depart: "2026-11-13", return: "2026-11-16" },
    ]);
  });

  it("przechodzi przez przełom miesiąca i roku", () => {
    expect(weekendDates(new Date("2026-12-30T21:00:00Z"))[2]).toEqual({
      label: "pt-pn",
      depart: "2027-01-01",
      return: "2027-01-04",
    });
  });

  it("nie przesuwa dni przy zmianie czasu", () => {
    const v = weekendDates(new Date("2026-10-21T21:30:00Z"));
    expect(v[0]).toEqual({ label: "czw-nd", depart: "2026-10-22", return: "2026-10-25" });
    expect(v[2].return).toBe("2026-10-26");
  });

  it("w czwartek daje ten sam weekend co w środę", () => {
    expect(weekendDates(new Date("2026-11-12T10:00:00Z"))).toEqual(weekendDates(WED));
  });

  it("liczy dzień po czasie warszawskim, nie UTC", () => {
    // wtorek 23:30Z to już środa 00:30 w Warszawie
    expect(weekendDates(new Date("2026-11-10T23:30:00Z"))).toEqual(weekendDates(WED));
  });
});

describe("weekKey", () => {
  it("zwraca ISO tydzień środy przed czwartkiem", () => {
    expect(weekKey(WED)).toBe("2026-W46");
  });

  it("dopełnia numer tygodnia zerem", () => {
    // środa 2026-02-04 -> ISO tydzień 6
    expect(weekKey(new Date("2026-02-04T21:00:00Z"))).toBe("2026-W06");
  });

  it("obsługuje przełom roku ISO", () => {
    // środa 2026-12-30 -> 2026-W53
    expect(weekKey(new Date("2026-12-30T21:00:00Z"))).toBe("2026-W53");
    // środa 2025-12-31 -> ISO 2026-W01
    expect(weekKey(new Date("2025-12-31T21:00:00Z"))).toBe("2026-W01");
  });

  it("w czwartek zwraca ten sam klucz co w środę", () => {
    expect(weekKey(new Date("2026-11-12T10:00:00Z"))).toBe("2026-W46");
  });
});
