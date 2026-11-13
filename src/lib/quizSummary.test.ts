import { describe, expect, it } from "vitest";
import { quizSummary } from "./quizSummary";
import type { QuizAnswers } from "@/types";

const base: QuizAnswers = {
  budget: null, vibe: null, styles: [], placeType: null,
  month: null, duration: null, airports: ["WRO"], companion: null,
};

describe("quizSummary", () => {
  it("pokazuje tylko to, co człowiek faktycznie odpowiedział", () => {
    expect(quizSummary({ ...base, companion: "solo", budget: "low", month: 11, duration: 3 }))
      .toEqual(["Sam/a", "do 1500 zł", "lis · 3 dni", "z Wrocławia"]);
  });
  it("bez odpowiedzi zostaje samo lotnisko", () => {
    expect(quizSummary(base)).toEqual(["z Wrocławia"]);
  });
  it("budżet komfortowy i dwa lotniska", () => {
    expect(quizSummary({ ...base, budget: "medium", airports: ["KRK", "KTW"] }))
      .toEqual(["1500–3000 zł", "z Krakowa lub Katowic"]);
  });
});
