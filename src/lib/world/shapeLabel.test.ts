import { describe, expect, it } from "vitest";
import { shapeLabel } from "./shapeLabel";

describe("shapeLabel", () => {
  it("names a counted country without a suffix", () => {
    expect(shapeLabel({ iso: "PL", sovereign: true, name: "Poland" })).toBe("Polska");
  });

  it("names a dependent territory in Polish, not by its code", () => {
    expect(shapeLabel({ iso: "GL", sovereign: false, name: "Greenland" })).toBe("Grenlandia (terytorium zależne)");
    expect(shapeLabel({ iso: "PR", sovereign: false, name: "Puerto Rico" })).toBe("Portoryko (terytorium zależne)");
  });

  it("falls back to the data name when a shape has no ISO code", () => {
    expect(shapeLabel({ iso: null, sovereign: false, name: "Kosovo" })).toBe("Kosovo (terytorium zależne)");
  });
});
