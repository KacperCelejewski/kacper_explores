import { describe, expect, it } from "vitest";
import { citiesWithDeals, cityFromSlug, citySlug, similarCities, slugsWithDeals, weekendCities } from "./cities";

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

describe("nazwy z Travelpayouts", () => {
  it("Tallin i Reykjavik pasują do nazw z danych o lotach", async () => {
    const { cityFromDealName, slugsWithDeals } = await import("./cities");
    expect(cityFromDealName("Tallinn")?.city).toBe("Tallin");
    expect(cityFromDealName("Reykjavík")?.city).toBe("Reykjavik");
    expect(slugsWithDeals(["Tallinn"])).toEqual(["tallin"]);
  });
});

describe("similarCities", () => {
  const praga = cityFromSlug("praga")!;
  it("zwraca 3 inne miasta z listy weekendowej, bez duplikatów", () => {
    const out = similarCities(praga);
    expect(out).toHaveLength(3);
    expect(out.map((c) => c.city)).not.toContain(praga.city);
    expect(new Set(out.map(citySlug)).size).toBe(3);
    for (const c of out) expect(weekendCities()).toContain(c);
  });
  it("wybiera miasta ze wspólnymi tagami i jest deterministyczne", () => {
    const out = similarCities(praga);
    expect(out.every((c) => c.tags.some((t) => praga.tags.includes(t)))).toBe(true);
    expect(similarCities(praga).map(citySlug)).toEqual(out.map(citySlug));
  });
});

describe("citiesWithDeals", () => {
  it("zwraca tylko miasta z listy weekendowej, które mają okazje, w kolejności katalogu", () => {
    const out = citiesWithDeals(["Praga", "Tallinn", "Nieznane", "Bali"]);
    expect(out.map((c) => c.city)).toEqual(expect.arrayContaining(["Praga", "Tallin"]));
    expect(out.map((c) => c.city)).not.toContain("Bali");
    expect(out).toHaveLength(2);
  });
  it("jest zgodna ze slugsWithDeals", () => {
    const names = ["Praga", "Rzym", "Budapeszt"];
    expect(citiesWithDeals(names).map(citySlug)).toEqual(slugsWithDeals(names));
  });
});
