import { describe, expect, it } from "vitest";
import { quizSummary } from "./quizSummary";
import type { QuizAnswers } from "@/types";

const NOW = new Date("2026-11-20T10:00:00Z");
const base: QuizAnswers = {
  budget: null, vibe: null, styles: [], placeType: null,
  month: null, duration: null, airports: ["WRO"], companion: null,
};

describe("quizSummary", () => {
  it("pokazuje tylko to, co człowiek faktycznie odpowiedział", () => {
    expect(quizSummary({ ...base, companion: "solo", budget: "low", month: 11, duration: 3 }, NOW))
      .toEqual(["Sam/a", "do 1500 zł", "lis 2026 · 3 dni", "z Wrocławia"]);
  });
  it("miesiąc z następnego roku pokazuje ten rok, także bez liczby dni", () => {
    expect(quizSummary({ ...base, month: 1, duration: 4 }, NOW)).toEqual(["sty 2027 · 4 dni", "z Wrocławia"]);
    expect(quizSummary({ ...base, month: 12 }, NOW)).toEqual(["gru 2026", "z Wrocławia"]);
  });
  it("bez odpowiedzi zostaje samo lotnisko", () => {
    expect(quizSummary(base)).toEqual(["z Wrocławia"]);
  });
  it("budżet komfortowy i dwa lotniska", () => {
    expect(quizSummary({ ...base, budget: "medium", airports: ["KRK", "KTW"] }))
      .toEqual(["1500–3000 zł", "z Krakowa lub Katowic"]);
  });
  it("z grupą zamiast „Znajomi” pokazuje opis grupy", () => {
    expect(quizSummary({ ...base, companion: "friends", group: { adults: 4, childrenAges: [] } }))
      .toEqual(["4 osoby", "z Wrocławia"]);
  });
  it("z grupą zamiast „Rodzina” pokazuje skład z dziećmi", () => {
    expect(quizSummary({ ...base, companion: "family", group: { adults: 2, childrenAges: [2, 4, 7] } }))
      .toEqual(["2 dorosłych, dzieci: 2, 4 i 7 lat", "z Wrocławia"]);
  });
  it("bez grupy zostaje „Znajomi”", () => {
    expect(quizSummary({ ...base, companion: "friends" })).toEqual(["Znajomi", "z Wrocławia"]);
  });
});
