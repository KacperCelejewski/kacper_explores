import { describe, expect, it } from "vitest";
import { cityFromSlug, citySlug, weekendCities } from "./cities";

describe("weekendCities", () => {
  const cities = weekendCities();
  it("nie zawiera dalekich kierunków", () => {
    const names = cities.map((c) => c.city);
    for (const far of ["Bali", "Bangkok", "Dubai", "Nowy Jork", "Tokio", "Singapur", "Kair", "Tel Awiw", "Marrakesz", "Antalya"]) {
      expect(names).not.toContain(far);
    }
  });
  it("ma unikalne slugi", () => {
    const slugs = cities.map(citySlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("zawiera typowe europejskie miasta", () => {
    expect(cities.map((c) => c.city)).toEqual(expect.arrayContaining(["Lizbona", "Barcelona", "Praga"]));
  });
});

describe("cityFromSlug", () => {
  it("zwraca miasto po slugu", () => {
    expect(cityFromSlug("lizbona")?.city).toBe("Lizbona");
  });
  it("dla miasta wykluczonego lub nieznanego zwraca null", () => {
    expect(cityFromSlug("bali")).toBeNull();
    expect(cityFromSlug("xyz")).toBeNull();
  });
});

describe("cityAudience", () => {
  it("składa zdania z pól katalogu", async () => {
    const { cityAudience } = await import("./cities");
    const lis = cityFromSlug("lizbona")!;
    const lines = cityAudience(lis);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.endsWith("."))).toBe(true);
  });
});

describe("slugsWithDeals", () => {
  it("zwraca tylko miasta z listy weekendowej, które mają okazje", async () => {
    const { slugsWithDeals } = await import("./cities");
    expect(slugsWithDeals(["Lizbona", "Bali", "Nieznane"])).toEqual(["lizbona"]);
  });
  it("dla pustych danych zwraca pustą listę", async () => {
    const { slugsWithDeals } = await import("./cities");
    expect(slugsWithDeals([])).toEqual([]);
  });
});
