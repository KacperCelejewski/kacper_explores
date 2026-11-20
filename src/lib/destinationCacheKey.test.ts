import { describe, expect, it } from "vitest";
import { destinationCacheKey } from "./destinationCacheKey";
import type { QuizAnswers } from "@/types";

// Klucz sprzed dodania region/rodzaj wyjazdu/transport: stary quiz musi dawać identyczny ciąg.
const legacyKey = (a: QuizAnswers) => JSON.stringify({
  styles: a.styles, budget: a.budget, vibe: a.vibe, placeType: a.placeType, month: a.month,
  duration: a.duration, airports: a.airports, preferredCity: a.preferredCity,
});

const base: QuizAnswers = {
  budget: "low", vibe: "chill", styles: ["food", "history"], placeType: "charming",
  month: 6, duration: 4, airports: ["WRO", "KRK"], companion: "friends", group: { adults: 4, childrenAges: [] },
};

describe("destinationCacheKey", () => {
  it("stary quiz bez nowych pól daje dokładnie ten sam klucz co dawniej", () => {
    expect(destinationCacheKey(base)).toBe(legacyKey(base));
    const withCity = { ...base, preferredCity: "Barcelona" };
    expect(destinationCacheKey(withCity)).toBe(legacyKey(withCity));
    const empty: QuizAnswers = { budget: null, vibe: null, styles: [], placeType: null, month: null, duration: null, airports: ["WRO"], companion: null };
    expect(destinationCacheKey(empty)).toBe(legacyKey(empty));
  });

  it("puste listy nie zmieniają klucza", () => {
    expect(destinationCacheKey({ ...base, regions: [], transport: [] })).toBe(legacyKey(base));
  });

  it("jawna wartość domyślna ma ten sam klucz co brak odpowiedzi (zwiedzanie, sam samolot, null)", () => {
    expect(destinationCacheKey({ ...base, tripType: "zwiedzanie" })).toBe(legacyKey(base));
    expect(destinationCacheKey({ ...base, transport: ["samolot"] })).toBe(legacyKey(base));
    expect(destinationCacheKey({ ...base, tripType: null, regions: null, transport: null } as never)).toBe(legacyKey(base));
    expect(destinationCacheKey({ ...base, transport: ["samolot", "auto"] })).not.toBe(legacyKey(base));
  });

  it("klucz działa też na surowym ciele żądania (serwer)", () => {
    const body = { ...base } as Record<string, unknown>;
    expect(destinationCacheKey(body)).toBe(destinationCacheKey(base));
  });

  it("różne odpowiedzi w nowych polach dają różne klucze", () => {
    const keys = new Set([
      destinationCacheKey(base),
      destinationCacheKey({ ...base, regions: ["europa"] }),
      destinationCacheKey({ ...base, regions: ["azja"] }),
      destinationCacheKey({ ...base, regions: ["europa", "azja"] }),
      destinationCacheKey({ ...base, tripType: "narty" }),
      destinationCacheKey({ ...base, tripType: "plaza" }),
      destinationCacheKey({ ...base, transport: ["auto"] }),
      destinationCacheKey({ ...base, transport: ["rower"] }),
      destinationCacheKey({ ...base, transport: ["auto", "rower"] }),
    ]);
    expect(keys.size).toBe(9);
  });

  it("kolejność klikania ani powtórzenia nie zmieniają klucza", () => {
    expect(destinationCacheKey({ ...base, regions: ["azja", "europa"], transport: ["rower", "auto"] }))
      .toBe(destinationCacheKey({ ...base, regions: ["europa", "azja", "europa"], transport: ["auto", "rower"] }));
  });
});
