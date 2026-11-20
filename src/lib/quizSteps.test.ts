import { describe, expect, it } from "vitest";
import type { QuizAnswers } from "@/types";
import { QUIZ_STEPS, DROP_QUIZ_STEPS, quizStepAt, quizStepIndex, migrateQuizStep, migrateQuizStepV5, parseQuizStep, quizAnalyticsStep, canCompleteQuizStep, firstIncompleteQuizStep, resolveQuizStep } from "./quizSteps";

const empty: QuizAnswers = {
  budget: null, vibe: null, styles: [], placeType: null, month: null,
  duration: null, airports: ["WRO"], companion: null,
};
const complete: QuizAnswers = { ...empty, budget: "low", vibe: "chill", month: 11, duration: 5, companion: "friends", group: { adults: 4, childrenAges: [] } };

describe("human quiz navigation", () => {
  it("puts practical details after the trip idea, and budget last in both flows", () => {
    expect(QUIZ_STEPS).toEqual(["companion", "transport", "vibe", "styles", "when", "departure", "budget"]);
    expect(DROP_QUIZ_STEPS).toEqual(["companion", "vibe", "styles", "budget"]);
    // The shortened flow still persists the canonical full-flow budget index.
    expect(quizStepAt(quizStepIndex(DROP_QUIZ_STEPS[3]))).toBe("budget");
  });
  it("keeps the meaning of every stored legacy question and analytics step", () => {
    const legacy = ["companion", "budget", "vibe", "styles", "when", "departure"] as const;
    legacy.forEach((id, oldIndex) => {
      expect(quizStepAt(migrateQuizStep(oldIndex))).toBe(id);
      expect(quizAnalyticsStep(id)).toBe(oldIndex);
    });
  });
  it("transport is optional (no choice = plane), keeps its own analytics number after the legacy ones", () => {
    expect(canCompleteQuizStep("transport", empty)).toBe(true);
    expect(firstIncompleteQuizStep({ ...complete, transport: [] }, QUIZ_STEPS)).toBeUndefined();
    expect(quizAnalyticsStep("transport")).toBe(6);
    const used = QUIZ_STEPS.map(quizAnalyticsStep);
    expect(new Set(used).size).toBe(QUIZ_STEPS.length);
    expect(DROP_QUIZ_STEPS).not.toContain("transport");
  });
  it("moves a v5 saved position to the same question after inserting transport", () => {
    const v5 = ["companion", "vibe", "styles", "when", "departure", "budget"] as const;
    v5.forEach((id, oldIndex) => expect(quizStepAt(migrateQuizStepV5(oldIndex))).toBe(id));
    for (const value of [undefined, null, -1, 6, 99, "2"]) expect(quizStepAt(migrateQuizStepV5(value))).toBe("companion");
  });
  it("handles malformed saved positions and accepts only named edit links", () => {
    for (const value of [undefined, null, -1, 6, 999, 1.5, "4"]) expect(migrateQuizStep(value)).toBe(0);
    expect(parseQuizStep("when")).toBe("when");
    expect(parseQuizStep("companion")).toBe("companion");
    for (const value of [null, "4", "WHEN", "<script>"]) expect(parseQuizStep(value)).toBeNull();
    expect(quizStepAt(999)).toBe("companion");
  });
  it("allows skipping interests but requires all real search inputs", () => {
    expect(canCompleteQuizStep("styles", empty)).toBe(true);
    expect(firstIncompleteQuizStep(empty, QUIZ_STEPS)).toBe("companion");
    expect(firstIncompleteQuizStep({ ...empty, companion: "solo" }, QUIZ_STEPS)).toBe("vibe");
    expect(firstIncompleteQuizStep({ ...complete, duration: null }, QUIZ_STEPS)).toBe("when");
    expect(firstIncompleteQuizStep({ ...complete, airports: [] }, QUIZ_STEPS)).toBe("departure");
    expect(firstIncompleteQuizStep({ ...complete, budget: null }, QUIZ_STEPS)).toBe("budget");
    expect(firstIncompleteQuizStep(complete, QUIZ_STEPS)).toBeUndefined();
  });
  it("does not finish a migrated last question with missing earlier answers", () => {
    const savedBudgetStep = migrateQuizStep(1);
    expect(resolveQuizStep(savedBudgetStep, { ...empty, companion: "solo", budget: "low" }, QUIZ_STEPS)).toBe("vibe");
    expect(resolveQuizStep(savedBudgetStep, complete, QUIZ_STEPS)).toBe("budget");
  });
  it("resumes valid stored positions and named edits without clearing answers", () => {
    expect(resolveQuizStep(quizStepIndex("when"), complete, QUIZ_STEPS)).toBe("when");
    expect(resolveQuizStep(quizStepIndex("companion"), complete, QUIZ_STEPS)).toBe("companion");
    expect(resolveQuizStep(quizStepIndex("budget"), complete, DROP_QUIZ_STEPS)).toBe("budget");
    expect(resolveQuizStep(quizStepIndex("when"), complete, DROP_QUIZ_STEPS)).toBe("companion");
    expect(complete.group?.adults).toBe(4);
  });
});
