import { describe, expect, it } from "vitest";
import { splitAtHeading } from "./blogSplit";

const md = "Wstęp.\n\n## Jeden\n\nTekst jeden.\n\n## Dwa\n\nTekst dwa.\n\n## Trzy\n\nTekst trzy.";

describe("splitAtHeading", () => {
  it("tnie przed pierwszym nagłówkiem po zadanej części tekstu", () => {
    const [a, b] = splitAtHeading(md, 0.4);
    expect(a + b).toBe(md);
    expect(b.startsWith("## ")).toBe(true);
    expect(a.length).toBeGreaterThanOrEqual(md.length * 0.4 - 20);
  });
  it("bez nagłówka po tej części zostawia całość w pierwszej połowie", () => {
    expect(splitAtHeading("Sam tekst bez nagłówków.", 0.4)).toEqual(["Sam tekst bez nagłówków.", ""]);
  });
  it("nie tnie w środku nagłówka h3", () => {
    const text = "Wstęp długi tekst.\n\n### Podpunkt\n\nTreść.";
    expect(splitAtHeading(text, 0.1)).toEqual([text, ""]);
  });
});
