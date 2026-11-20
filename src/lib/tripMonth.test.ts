import { describe, expect, it } from "vitest";
import {
  monthYearLabel,
  monthYearShort,
  resolveDepartureYear,
  resolveTripYear,
  upcomingMonths,
} from "./tripMonth";

const at = (iso: string) => new Date(iso);

describe("resolveTripYear: rok miesiąca względem dzisiejszej daty", () => {
  it("w środku roku grudzień i styczeń to rok bieżący i następny", () => {
    const now = at("2026-06-15T10:00:00Z");
    expect(resolveTripYear(12, now)).toBe(2026);
    expect(resolveTripYear(1, now)).toBe(2027);
  });

  it("20 listopada: listopad jeszcze w tym roku, grudzień w tym roku, styczeń w następnym", () => {
    const now = at("2026-11-20T10:00:00Z");
    expect(resolveTripYear(11, now)).toBe(2026);
    expect(resolveTripYear(12, now)).toBe(2026);
    expect(resolveTripYear(1, now)).toBe(2027);
  });

  it("31 grudnia: grudzień przechodzi na następny rok, styczeń też", () => {
    const now = at("2026-12-31T12:00:00Z");
    expect(resolveTripYear(12, now)).toBe(2027);
    expect(resolveTripYear(1, now)).toBe(2027);
    expect(resolveTripYear(11, now)).toBe(2027);
  });

  it("31 grudnia tuż przed północą UTC nadal daje 2027 dla stycznia", () => {
    expect(resolveTripYear(1, at("2026-12-31T23:59:00Z"))).toBe(2027);
  });

  it("1 stycznia: styczeń to nowy rok, grudzień też", () => {
    const now = at("2027-01-01T00:30:00Z");
    expect(resolveTripYear(1, now)).toBe(2027);
    expect(resolveTripYear(12, now)).toBe(2027);
    expect(resolveTripYear(2, now)).toBe(2027);
  });

  it("nigdy nie zwraca przeszłości: miesiąc, który minął, trafia na następny rok", () => {
    const now = at("2026-11-20T10:00:00Z");
    for (const m of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) expect(resolveTripYear(m, now)).toBe(2027);
  });

  it("późny listopad (po 22.): listopad liczy się jak w wyszukiwarce lotów, czyli 2027", () => {
    // 4 terminy (10, 15, 20, 25) muszą być co najmniej 3 dni od dziś
    expect(resolveTripYear(11, at("2026-11-26T10:00:00Z"))).toBe(2027);
    expect(resolveTripYear(12, at("2026-11-26T10:00:00Z"))).toBe(2026);
  });
});

describe("resolveDepartureYear: jedna reguła dla dnia i miesiąca", () => {
  it("dzień musi być co najmniej 3 dni od teraz", () => {
    const now = at("2026-11-20T00:00:00Z");
    expect(resolveDepartureYear(11, 23, now)).toBe(2026);
    expect(resolveDepartureYear(11, 22, now)).toBe(2027);
  });
});

describe("upcomingMonths: 12 miesięcy po kolei od najbliższego", () => {
  it("20 listopada 2026: lis, gru 2026, potem sty–paź 2027", () => {
    const list = upcomingMonths(at("2026-11-20T10:00:00Z"));
    expect(list).toHaveLength(12);
    expect(list[0]).toEqual({ month: 11, year: 2026 });
    expect(list[1]).toEqual({ month: 12, year: 2026 });
    expect(list[2]).toEqual({ month: 1, year: 2027 });
    expect(list[11]).toEqual({ month: 10, year: 2027 });
  });

  it("31 grudnia 2026: cały rok 2027, od stycznia do grudnia", () => {
    const list = upcomingMonths(at("2026-12-31T12:00:00Z"));
    expect(list.map((x) => x.year)).toEqual(Array(12).fill(2027));
    expect(list.map((x) => x.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("1 stycznia 2027: ten sam układ co 31 grudnia", () => {
    const list = upcomingMonths(at("2027-01-01T00:30:00Z"));
    expect(list[0]).toEqual({ month: 1, year: 2027 });
    expect(list[11]).toEqual({ month: 12, year: 2027 });
  });

  it("każdy miesiąc występuje dokładnie raz i lista rośnie chronologicznie", () => {
    for (const iso of ["2026-01-05T10:00:00Z", "2026-07-31T10:00:00Z", "2026-12-26T10:00:00Z"]) {
      const list = upcomingMonths(at(iso));
      expect(new Set(list.map((x) => x.month)).size).toBe(12);
      const keys = list.map((x) => x.year * 12 + x.month);
      expect([...keys].sort((a, b) => a - b)).toEqual(keys);
    }
  });
});

describe("etykiety", () => {
  it("pełna etykieta z rokiem, małą literą", () => {
    expect(monthYearLabel(12, at("2026-11-20T10:00:00Z"))).toBe("grudzień 2026");
    expect(monthYearLabel(1, at("2026-11-20T10:00:00Z"))).toBe("styczeń 2027");
  });

  it("skrót z rokiem do podsumowań", () => {
    expect(monthYearShort(12, at("2026-11-20T10:00:00Z"))).toBe("gru 2026");
    expect(monthYearShort(1, at("2026-11-20T10:00:00Z"))).toBe("sty 2027");
  });
});
