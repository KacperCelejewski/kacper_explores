import { describe, expect, it } from "vitest";
import {
  REGION_OPTIONS, TRIP_TYPE_OPTIONS, TRANSPORT_OPTIONS,
  REGION_VALUES, TRIP_TYPE_VALUES, TRANSPORT_VALUES,
  DEFAULT_TRIP_TYPE, DEFAULT_TRANSPORT,
  effectiveTripType, effectiveTransport, effectiveRegions, normalizeFoundation,
  regionLabel, tripTypeLabel, transportLabel, isRegion, isTripType, isTransport,
} from "./quizOptions";

const all = [...REGION_OPTIONS, ...TRIP_TYPE_OPTIONS, ...TRANSPORT_OPTIONS];

describe("quizOptions", () => {
  it("ma wartości zgodne z briefem", () => {
    expect(REGION_VALUES).toEqual(["europa", "ameryka_poludniowa", "ameryka_polnocna", "azja", "afryka", "bliski_wschod", "oceania"]);
    expect(TRIP_TYPE_VALUES).toEqual(["zwiedzanie", "wypoczynek", "narty", "gory", "plaza", "aktywny", "wieczory"]);
    expect(TRANSPORT_VALUES).toEqual(["samolot", "auto", "pociag_bus", "rower"]);
  });

  it("klucze są techniczne (ASCII, małe litery, podkreślniki)", () => {
    for (const o of all) expect(o.value).toMatch(/^[a-z_]+$/);
  });

  it("każda opcja ma polską etykietę i opis, bez wykrzykników i emoji", () => {
    for (const o of all) {
      expect(o.label.length).toBeGreaterThan(2);
      expect(o.hint.length).toBeGreaterThan(8);
      for (const text of [o.label, o.hint]) {
        expect(text).not.toMatch(/!/);
        expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    }
  });

  it("etykiety są dostępne po kluczu", () => {
    expect(regionLabel("bliski_wschod")).toBe("Bliski Wschód");
    expect(tripTypeLabel("narty")).toBe("Narty");
    expect(transportLabel("pociag_bus")).toBe("Pociąg lub bus");
  });

  it("strażnicy typów odrzucają obce wartości", () => {
    expect(isRegion("europa")).toBe(true);
    expect(isRegion("toString")).toBe(false);
    expect(isTripType("narty")).toBe(true);
    expect(isTripType(undefined)).toBe(false);
    expect(isTransport("rower")).toBe(true);
    expect(isTransport("Rower")).toBe(false);
  });
});

describe("wartości domyślne (zgodność wstecz)", () => {
  it("brak rodzaju wyjazdu to zwiedzanie, brak transportu to samolot, brak regionu to obojętnie", () => {
    expect(effectiveTripType({})).toBe("zwiedzanie");
    expect(DEFAULT_TRIP_TYPE).toBe("zwiedzanie");
    expect(effectiveTransport({})).toEqual(["samolot"]);
    expect(effectiveTransport({ transport: [] })).toEqual(["samolot"]);
    expect(DEFAULT_TRANSPORT).toEqual(["samolot"]);
    expect(effectiveRegions({})).toEqual([]);
  });

  it("jawny wybór wygrywa z domyślnym", () => {
    expect(effectiveTripType({ tripType: "narty" })).toBe("narty");
    expect(effectiveTransport({ transport: ["auto"] })).toEqual(["auto"]);
    expect(effectiveRegions({ regions: ["azja"] })).toEqual(["azja"]);
  });
});

describe("normalizeFoundation", () => {
  it("brak pól i puste listy dają ten sam, pusty wynik", () => {
    expect(normalizeFoundation({})).toEqual({});
    expect(normalizeFoundation({ regions: [], transport: [] })).toEqual({});
  });

  it("usuwa powtórzenia i ustawia kolejność opcji", () => {
    expect(normalizeFoundation({ regions: ["azja", "europa", "azja"], transport: ["rower", "auto"] })).toEqual({
      regions: ["europa", "azja"], transport: ["auto", "rower"],
    });
  });

  it("pomija nieznane wartości", () => {
    const dirty = { regions: ["europa", "x"], tripType: "kosmos", transport: ["y"] } as unknown as Parameters<typeof normalizeFoundation>[0];
    expect(normalizeFoundation(dirty)).toEqual({ regions: ["europa"] });
  });
});
