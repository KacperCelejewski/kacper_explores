import { describe, expect, it } from "vitest";
import { COUNTRIES } from "./countries";
import { countryStats, formatPercent } from "./stats";

describe("countryStats", () => {
  it("is all zeros for an empty set, with six continents", () => {
    const s = countryStats([]);
    expect(s).toMatchObject({ visited: 0, total: 195, percent: 0 });
    expect(s.continents).toHaveLength(6);
    for (const c of s.continents) expect(c).toMatchObject({ visited: 0, percent: 0 });
  });

  it("shows 100% for the world and every continent when all 195 countries are visited", () => {
    const s = countryStats(COUNTRIES.map((c) => c.iso));
    expect(s).toMatchObject({ visited: 195, percent: 100 });
    for (const c of s.continents) expect(c.percent).toBe(100);
  });

  it("ignores codes outside the list and counts a duplicate once", () => {
    expect(countryStats(["GL"]).visited).toBe(0);
    expect(countryStats(["ZZ"]).visited).toBe(0);
    expect(countryStats(["PL", "PL"]).visited).toBe(1);
  });

  it("sums the continents to the world total", () => {
    const s = countryStats(["PL", "DE", "JP", "BR", "EG"]);
    expect(s.continents.reduce((n, c) => n + c.visited, 0)).toBe(s.visited);
    expect(s.visited).toBe(5);
  });

  it("reports the exact ratio, not a rounded one", () => {
    expect(countryStats(["PL"]).percent).toBeCloseTo((1 / 195) * 100, 10);
  });
});

describe("formatPercent", () => {
  it("formats the edges and rounds to whole percent", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.51)).toBe("<1%");
    expect(formatPercent(21.02)).toBe("21%");
    expect(formatPercent(99.6)).toBe("100%");
    expect(formatPercent(100)).toBe("100%");
  });
});
