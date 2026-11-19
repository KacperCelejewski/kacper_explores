import { describe, expect, it } from "vitest";
import { FORBIDDEN_COPY } from "./homeCopy";
import { buildShareOgModel, formatTripWhen, shareMetaText } from "./shareOg";

describe("formatTripWhen", () => {
  it("jeden miesiąc", () => expect(formatTripWhen("2026-11-27", 3)).toBe("27–29 listopada 2026"));
  it("przejście przez miesiąc", () => expect(formatTripWhen("2026-11-29", 4)).toBe("29 listopada – 2 grudnia 2026"));
  it("przejście przez rok", () => expect(formatTripWhen("2026-12-30", 4)).toBe("30 grudnia 2026 – 2 stycznia 2027"));
  it("jeden dzień", () => expect(formatTripWhen("2026-11-27", 1)).toBe("27 listopada 2026"));
  it("rok przestępny: 28 lutego i 3 dni", () => expect(formatTripWhen("2028-02-28", 3)).toBe("28 lutego – 1 marca 2028"));
  it("bez daty startu wraca liczba dni", () => {
    expect(formatTripWhen(undefined, 3)).toBe("3 dni");
    expect(formatTripWhen("nie-data", 1)).toBe("1 dzień");
    expect(formatTripWhen("2026-02-31", 3)).toBe("3 dni");
  });
  it("bez niczego null", () => {
    expect(formatTripWhen(undefined, undefined)).toBeNull();
    expect(formatTripWhen(undefined, -2)).toBeNull();
    expect(formatTripWhen(undefined, 400)).toBeNull();
  });
});

describe("buildShareOgModel", () => {
  const base = {
    city: "Budapeszt",
    country: "Węgry",
    ai_plan_json: { duration: 3, startDate: "2026-11-27", totalBudgetEstimate: "ok. 1 200 zł" },
  };

  it("brak miasta to brak modelu", () => {
    expect(buildShareOgModel(null)).toBeNull();
    expect(buildShareOgModel({ city: "  " })).toBeNull();
  });

  it("plan solo: daty i budżet, bez ekipy", () => {
    const m = buildShareOgModel({ ...base, quiz_answers: { companion: "solo" } });
    expect(m).toMatchObject({ city: "Budapeszt", when: "27–29 listopada 2026", crewLine: null, budgetLine: "ok. 1 200 zł, bez lotów" });
  });

  it("ekipa znajomych: skład i koszt na osobę oraz razem", () => {
    const m = buildShareOgModel({ ...base, quiz_answers: { companion: "friends", group: { adults: 4, childrenAges: [] } } });
    expect(m?.crewLine).toBe("Plan dla ekipy: 4 osoby");
    expect(m?.budgetLine).toContain("na osobę");
    expect(m?.budgetLine).toContain("razem");
  });

  it("rodzina nie ujawnia składu (wiek dzieci)", () => {
    const m = buildShareOgModel({ ...base, quiz_answers: { companion: "family", group: { adults: 2, childrenAges: [4] } } });
    expect(m?.crewLine).toBeNull();
    expect(JSON.stringify(m)).not.toMatch(/dziecko|dzieci/);
  });

  it("nie przepuszcza niczego spoza listy pól (preferencje, lotniska, e-mail)", () => {
    const m = buildShareOgModel({
      ...base,
      quiz_answers: { companion: "solo", airports: ["WRO"], email: "a@b.pl", budget: "low" },
    });
    expect(JSON.stringify(m)).not.toMatch(/WRO|a@b\.pl|low/);
  });

  it("obcina bardzo długie nazwy i śmieci w polach", () => {
    const m = buildShareOgModel({ city: "X".repeat(200), country: 5 as unknown as string, ai_plan_json: "tekst" });
    expect(m?.city.length).toBeLessThanOrEqual(40);
    expect(m?.country).toBe("");
    expect(m?.when).toBeNull();
  });
});

describe("shareMetaText", () => {
  it("opis i tytuł bez zakazanych wzorców", () => {
    const m = buildShareOgModel({
      city: "Budapeszt",
      country: "Węgry",
      ai_plan_json: { duration: 3, startDate: "2026-11-27", totalBudgetEstimate: "ok. 1 200 zł" },
      quiz_answers: { companion: "friends", group: { adults: 3, childrenAges: [] } },
    })!;
    const { title, description } = shareMetaText(m);
    expect(title).toBe("Plan dla ekipy: Budapeszt, Węgry");
    for (const re of FORBIDDEN_COPY) {
      expect(title).not.toMatch(re);
      expect(description).not.toMatch(re);
    }
    expect(description).toContain("27–29 listopada 2026");
  });
});
