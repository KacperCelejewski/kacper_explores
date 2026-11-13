import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("usuwa polskie znaki", () => {
    expect(slugify("Wrocław")).toBe("wroclaw");
    expect(slugify("Kraków")).toBe("krakow");
    expect(slugify("Łódź")).toBe("lodz");
  });
  it("łączy wyrazy myślnikiem", () => {
    expect(slugify("Palma de Mallorca")).toBe("palma-de-mallorca");
    expect(slugify("Nowy Jork")).toBe("nowy-jork");
  });
});
