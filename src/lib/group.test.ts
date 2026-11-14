import { describe, it, expect } from "vitest";
import {
  MAX_GROUP,
  groupFromCompanion,
  groupSize,
  toFlightPassengers,
  isValidGroup,
  scaleBudgetText,
  groupLabel,
} from "./group";

describe("groupFromCompanion", () => {
  it("wylicza domyślny skład z typu towarzystwa", () => {
    expect(groupFromCompanion("solo")).toEqual({ adults: 1, childrenAges: [] });
    expect(groupFromCompanion("couple")).toEqual({ adults: 2, childrenAges: [] });
    expect(groupFromCompanion("friends")).toEqual({ adults: 4, childrenAges: [] });
    expect(groupFromCompanion("family")).toEqual({ adults: 2, childrenAges: [] });
    expect(groupFromCompanion(null)).toEqual({ adults: 1, childrenAges: [] });
  });

  it("przekazany skład wygrywa", () => {
    const g = { adults: 3, childrenAges: [5] };
    expect(groupFromCompanion("solo", g)).toBe(g);
  });
});

describe("toFlightPassengers / groupSize", () => {
  const g = { adults: 2, childrenAges: [1, 2, 11, 12] };

  it("dzieli pasażerów po granicach wieku 2 i 12", () => {
    expect(toFlightPassengers(g)).toEqual({ adults: 3, children: 2, infants: 1 });
  });

  it("niemowlęta nie zajmują miejsca", () => {
    expect(groupSize(g)).toBe(5);
  });
});

describe("isValidGroup", () => {
  it("przyjmuje poprawne składy", () => {
    expect(isValidGroup({ adults: 1, childrenAges: [3] })).toBe(true);
    expect(isValidGroup({ adults: 9, childrenAges: [] })).toBe(true);
    expect(isValidGroup({ adults: 9, childrenAges: [1] })).toBe(true);
  });

  it("odrzuca niepoprawne składy", () => {
    expect(isValidGroup({ adults: 0, childrenAges: [] })).toBe(false);
    expect(isValidGroup({ adults: 10, childrenAges: [] })).toBe(false);
    expect(isValidGroup({ adults: 2, childrenAges: [-1] })).toBe(false);
    expect(isValidGroup({ adults: 2, childrenAges: [18] })).toBe(false);
    expect(isValidGroup({ adults: 2, childrenAges: [4.5] })).toBe(false);
    expect(isValidGroup({ adults: 2, childrenAges: "x" })).toBe(false);
    expect(isValidGroup(null)).toBe(false);
  });

  it("odrzuca skład ponad MAX_GROUP miejsc", () => {
    expect(MAX_GROUP).toBe(9);
    expect(isValidGroup({ adults: 9, childrenAges: [5] })).toBe(false);
  });
});

describe("scaleBudgetText", () => {
  it("mnoży liczby i formatuje zakres", () => {
    expect(scaleBudgetText("1200-1500 PLN", 4)).toBe("4 800–6 000 PLN");
    expect(scaleBudgetText("~300 PLN", 2)).toBe("600 PLN");
  });

  it("zwraca null bez cyfr", () => {
    expect(scaleBudgetText("Free", 4)).toBeNull();
    expect(scaleBudgetText("", 4)).toBeNull();
  });
});

describe("groupLabel", () => {
  it("opisuje grupę dorosłych", () => {
    expect(groupLabel({ adults: 1, childrenAges: [] })).toBe("1 osoba");
    expect(groupLabel({ adults: 4, childrenAges: [] })).toBe("4 osoby");
    expect(groupLabel({ adults: 5, childrenAges: [] })).toBe("5 osób");
  });

  it("wylicza dzieci z wiekiem", () => {
    expect(groupLabel({ adults: 2, childrenAges: [4, 7] })).toBe("2 dorosłych, dzieci: 4 i 7 lat");
    expect(groupLabel({ adults: 2, childrenAges: [2, 4, 7] })).toBe("2 dorosłych, dzieci: 2, 4 i 7 lat");
    expect(groupLabel({ adults: 1, childrenAges: [3] })).toBe("1 dorosły, dziecko: 3 lata");
  });
});
