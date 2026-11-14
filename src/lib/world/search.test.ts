import { describe, expect, it } from "vitest";
import { COUNTRIES, countryName } from "./countries";
import { filterCountries, normalize } from "./search";

const isos = (list: { iso: string }[]) => list.map((c) => c.iso);

describe("normalize", () => {
  it("lowers case, trims and drops Polish diacritics", () => {
    expect(normalize("  WŁOCHY ")).toBe("wlochy");
    expect(normalize("Łódź żółć")).toBe("lodz zolc");
  });
});

describe("filterCountries", () => {
  it("finds Italy by Włochy however it is typed", () => {
    expect(isos(filterCountries("wlochy"))).toContain("IT");
    expect(isos(filterCountries("  WŁOCHY "))).toContain("IT");
  });

  it("finds a country by part of its name", () => {
    expect(isos(filterCountries("pol"))).toContain("PL");
  });

  it("returns nothing when nothing matches", () => {
    expect(filterCountries("qqqqqq")).toEqual([]);
  });

  it("returns all 195 countries sorted by Polish name for an empty query", () => {
    const all = filterCountries("");
    expect(all).toHaveLength(195);
    const names = all.map((c) => countryName(c.iso));
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pl")));
    expect(new Set(isos(all))).toEqual(new Set(COUNTRIES.map((c) => c.iso)));
  });
});
