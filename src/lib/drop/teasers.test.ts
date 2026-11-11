import { describe, it, expect } from "vitest";
import { buildTeaserPrompt, parseTeaser } from "./teasers";

describe("buildTeaserPrompt", () => {
  const prompt = buildTeaserPrompt("Mediolan", "IT");

  it("zawiera miasto i wymagania dotyczące formy", () => {
    expect(prompt).toContain("Mediolan");
    expect(prompt).toContain("2–3 zdania");
    expect(prompt).toContain("weekend");
    expect(prompt).toContain("JSON");
  });

  it("zakazuje wykrzykników", () => {
    expect(prompt).toContain("wykrzykników");
  });
});

describe("parseTeaser", () => {
  it("parsuje poprawny JSON", () => {
    expect(
      parseTeaser('{"teaser":"Sobota na Navigli…","local_budget":"ok. 120 EUR"}'),
    ).toEqual({ teaser: "Sobota na Navigli…", local_budget: "ok. 120 EUR" });
  });

  it("zwraca null dla niepoprawnego JSON", () => {
    expect(parseTeaser("nie json")).toBeNull();
  });

  it("zwraca null dla pustego teasera", () => {
    expect(parseTeaser('{"teaser":"  ","local_budget":"ok. 120 EUR"}')).toBeNull();
  });

  it("zwraca null dla teasera dłuższego niż 320 znaków", () => {
    const teaser = "a".repeat(321);
    expect(parseTeaser(JSON.stringify({ teaser, local_budget: "ok. 120 EUR" }))).toBeNull();
  });

  it("zwraca null dla brakującego local_budget", () => {
    expect(parseTeaser('{"teaser":"Sobota na Navigli"}')).toBeNull();
  });

  it("przycina białe znaki i usuwa blok ```json", () => {
    const raw = '```json\n{"teaser":"  Sobota na Navigli  ","local_budget":" ok. 120 EUR "}\n```';
    expect(parseTeaser(raw)).toEqual({
      teaser: "Sobota na Navigli",
      local_budget: "ok. 120 EUR",
    });
  });
});
