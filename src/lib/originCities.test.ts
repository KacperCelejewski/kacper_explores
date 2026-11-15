import { describe, expect, it } from "vitest";
import { excludeOriginCities, originCityNames, originExclusionPrompt } from "./originCities";

const d = (city: string) => ({ city });

describe("originCityNames", () => {
  it("lists the city of every selected airport", () => {
    expect(originCityNames(["WRO", "KTW"])).toEqual(["Wrocław", "Katowice"]);
  });
  it("ignores unknown codes", () => {
    expect(originCityNames(["XXX"])).toEqual([]);
  });
});

describe("excludeOriginCities", () => {
  it("drops the departure city, ignoring case, diacritics and English spelling", () => {
    const out = excludeOriginCities([d("Wrocław"), d("Porto"), d("WROCLAW"), d("Breslau")], ["WRO"]);
    expect(out).toEqual([d("Porto")]);
  });

  it("drops every selected departure city", () => {
    const out = excludeOriginCities([d("Kraków"), d("Warsaw"), d("Lizbona")], ["KRK", "WAW"]);
    expect(out).toEqual([d("Lizbona")]);
  });

  it("treats Modlin as Warsaw", () => {
    expect(excludeOriginCities([d("Warszawa"), d("Rzym")], ["WMI"])).toEqual([d("Rzym")]);
  });

  it("keeps other Polish cities", () => {
    expect(excludeOriginCities([d("Gdańsk"), d("Porto")], ["WRO"])).toEqual([d("Gdańsk"), d("Porto")]);
  });
});

describe("originExclusionPrompt", () => {
  it("names the departure cities as forbidden destinations", () => {
    const line = originExclusionPrompt(["WRO", "KTW"]);
    expect(line).toContain("Wrocław");
    expect(line).toContain("Katowice");
    expect(line).toMatch(/NIE proponuj/);
  });
  it("is empty without known airports", () => {
    expect(originExclusionPrompt(["XXX"])).toBe("");
  });
});
