import { describe, expect, it } from "vitest";
import { CONTINENTS, COUNTRIES, countryName } from "./countries";

const byIso = (iso: string) => COUNTRIES.find((c) => c.iso === iso);

describe("COUNTRIES", () => {
  it("lists exactly 195 sovereign states", () => {
    expect(COUNTRIES).toHaveLength(195);
  });

  it("has unique two-letter upper-case codes", () => {
    const codes = COUNTRIES.map((c) => c.iso);
    expect(new Set(codes).size).toBe(195);
    for (const code of codes) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it("puts at least one country on every continent and sums to 195", () => {
    let sum = 0;
    for (const continent of CONTINENTS) {
      const n = COUNTRIES.filter((c) => c.continent === continent).length;
      expect(n).toBeGreaterThan(0);
      sum += n;
    }
    expect(sum).toBe(195);
  });

  it("follows the continent rules for the contested cases", () => {
    expect(byIso("PL")?.continent).toBe("europe");
    expect(byIso("RU")?.continent).toBe("europe");
    expect(byIso("CY")?.continent).toBe("europe");
    expect(byIso("TR")?.continent).toBe("asia");
    expect(byIso("KZ")?.continent).toBe("asia");
    expect(byIso("EG")?.continent).toBe("africa");
    expect(byIso("MX")?.continent).toBe("north-america");
    expect(byIso("BR")?.continent).toBe("south-america");
    expect(byIso("AU")?.continent).toBe("oceania");
  });

  it("counts the Vatican and Palestine but no dependent territories", () => {
    expect(byIso("VA")).toBeDefined();
    expect(byIso("PS")).toBeDefined();
    for (const territory of ["GL", "HK", "PR", "TW"]) expect(byIso(territory)).toBeUndefined();
  });
});

describe("countryName", () => {
  it("gives the Polish name", () => {
    expect(countryName("PL")).toContain("Polska");
  });

  it("returns the code itself for something that is not a counted country", () => {
    expect(countryName("ZZ")).toBe("ZZ");
    expect(countryName("GL")).toBe("GL");
  });
});
