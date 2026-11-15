import { describe, expect, it } from "vitest";
import { BUDGET_CAPS_PLN, budgetPromptLabel } from "./constants";
import { buildPlanPrompt } from "./gemini";
import { quizSummary } from "./quizSummary";

// Jedna reguła: budżet z quizu to kwota NA OSOBĘ za cały wyjazd, w każdym trybie.
describe("quiz budget is per person, everywhere", () => {
  it("uses the same caps as the quiz cards (1500 and 3000 zł)", () => {
    expect(BUDGET_CAPS_PLN).toEqual({ low: 1500, medium: 3000 });
  });

  it("labels the model prompt per person for the whole trip", () => {
    expect(budgetPromptLabel("low")).toContain("do 1500 PLN na osobę");
    expect(budgetPromptLabel("medium")).toContain("1500–3000 PLN na osobę");
    expect(budgetPromptLabel("medium")).not.toContain("2500");
  });

  it("passes the per-person cap to the plan prompt", () => {
    const dest = { city: "Porto", country: "Portugalia" } as never;
    const quiz = { budget: "medium", styles: [], duration: 3, month: 6, companion: "friends" } as never;
    expect(buildPlanPrompt(dest, quiz, null)).toContain("1500–3000 PLN na osobę");
  });

  it("keeps the summary shown at login in line with the cards", () => {
    const out = quizSummary({ budget: "low", airports: [], styles: [] } as never);
    expect(out).toContain("do 1500 zł");
  });
});
