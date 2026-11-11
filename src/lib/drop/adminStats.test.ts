import { describe, expect, it } from "vitest";
import { countAirports, isMissingTableError, latestWeeks } from "./adminStats";

describe("countAirports", () => {
  it("liczy każdego subskrybenta raz na lotnisko i sortuje malejąco", () => {
    const rows = [
      { airports: ["WAW", "KRK"] },
      { airports: ["WAW", "WAW"] },
      { airports: ["GDN"] },
      { airports: null },
      { airports: ["KRK", "WAW"] },
    ];
    expect(countAirports(rows)).toEqual([
      { airport: "WAW", count: 3 },
      { airport: "KRK", count: 2 },
      { airport: "GDN", count: 1 },
    ]);
  });

  it("remisy sortuje po kodzie, a pustą listę zwraca jako pustą", () => {
    expect(countAirports([{ airports: ["POZ"] }, { airports: ["KTW"] }])).toEqual([
      { airport: "KTW", count: 1 },
      { airport: "POZ", count: 1 },
    ]);
    expect(countAirports([])).toEqual([]);
  });
});

describe("latestWeeks", () => {
  it("zwraca 4 najnowsze unikalne tygodnie, najnowszy pierwszy", () => {
    const weeks = ["2026-W44", "2026-W46", "2026-W46", "2026-W45", "2026-W43", "2026-W42", "2025-W52"];
    expect(latestWeeks(weeks, 4)).toEqual(["2026-W46", "2026-W45", "2026-W44", "2026-W43"]);
  });

  it("radzi sobie z mniejszą liczbą tygodni", () => {
    expect(latestWeeks(["2026-W46"], 4)).toEqual(["2026-W46"]);
    expect(latestWeeks([], 4)).toEqual([]);
  });
});

describe("isMissingTableError", () => {
  it("rozpoznaje brak tabeli", () => {
    expect(isMissingTableError({ code: "42P01" })).toBe(true);
    expect(isMissingTableError({ code: "PGRST205" })).toBe(true);
    expect(isMissingTableError({ code: "42703" })).toBe(true);
    expect(isMissingTableError({ code: "PGRST204" })).toBe(true);
    expect(isMissingTableError({ code: "PGRST200" })).toBe(true);
    expect(isMissingTableError({ code: "23505" })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
  });
});
