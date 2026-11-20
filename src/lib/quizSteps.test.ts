import { describe, expect, it } from "vitest";
import type { QuizAnswers } from "@/types";
import { QUIZ_STEPS, DROP_QUIZ_STEPS, QUIZ_QUESTION_COUNT, quizStepAt, quizStepIndex, quizStepsFor, migrateQuizStep, migrateQuizStepV5, migrateQuizStepV6, parseQuizStep, quizAnalyticsStep, canCompleteQuizStep, firstIncompleteQuizStep, resolveQuizStep } from "./quizSteps";

const empty: QuizAnswers = {
  budget: null, vibe: null, styles: [], placeType: null, month: null,
  duration: null, airports: ["WRO"], companion: null,
};
const complete: QuizAnswers = { ...empty, budget: "low", vibe: "chill", month: 11, duration: 5, companion: "friends", group: { adults: 4, childrenAges: [] } };

describe("human quiz navigation", () => {
  it("puts practical details after the trip idea, and budget last in both flows", () => {
    // Kolejność docelowa: Z kim, Dokąd (P7), Jaki wyjazd (P8); transport (P9) wejdzie po rodzaju wyjazdu.
    expect(QUIZ_STEPS).toEqual(["companion", "region", "tripType", "vibe", "styles", "when", "departure", "budget"]);
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
  it("keeps the trip type question optional: skipping means sightseeing, as before the question existed", () => {
    expect(canCompleteQuizStep("tripType", empty)).toBe(true);
    expect(canCompleteQuizStep("tripType", { ...empty, tripType: "narty" })).toBe(true);
    expect(firstIncompleteQuizStep({ ...complete }, QUIZ_STEPS)).toBeUndefined();
  });
  it("gives the new question an analytics number after the six legacy ones", () => {
    expect(quizAnalyticsStep("tripType")).toBe(7);
    expect(quizAnalyticsStep("region")).toBe(6);
    expect(QUIZ_STEPS.filter((id) => id !== "tripType" && id !== "region").every((id) => quizAnalyticsStep(id) >= 0 && quizAnalyticsStep(id) <= 5)).toBe(true);
  });
  it("maps a step saved before the trip type question to the same question afterwards", () => {
    const v5 = ["companion", "vibe", "styles", "when", "departure", "budget"] as const;
    v5.forEach((id, oldIndex) => expect(quizStepAt(migrateQuizStepV5(oldIndex))).toBe(id));
    for (const value of [undefined, null, -1, 6, 99, "2"]) expect(migrateQuizStepV5(value)).toBe(0);
  });
  it("maps a step saved before the trip type question (v6, with region) to the same question afterwards", () => {
    const v6 = ["companion", "region", "vibe", "styles", "when", "departure", "budget"] as const;
    v6.forEach((id, oldIndex) => expect(quizStepAt(migrateQuizStepV6(oldIndex))).toBe(id));
    for (const value of [undefined, null, -1, 7, 99, "2"]) expect(migrateQuizStepV6(value)).toBe(0);
  });
  it("handles malformed saved positions and accepts only named edit links", () => {
    for (const value of [undefined, null, -1, 6, 999, 1.5, "4"]) expect(migrateQuizStep(value)).toBe(0);
    for (const value of [undefined, null, -1, 6, 999, 1.5, "4"]) expect(migrateQuizStepV5(value)).toBe(0);
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

  it("pytanie o region jest opcjonalne i stoi zaraz po tym, kto jedzie", () => {
    expect(quizStepIndex("region")).toBe(quizStepIndex("companion") + 1);
    expect(canCompleteQuizStep("region", empty)).toBe(true);
    expect(canCompleteQuizStep("region", { ...empty, regions: ["azja"] })).toBe(true);
    // brak odpowiedzi o region nie zatrzymuje starego quizu ani zapisanych sesji
    expect(firstIncompleteQuizStep(complete, QUIZ_STEPS)).toBeUndefined();
  });
  it("liczba pytań to długość pełnego quizu, a miasto z galerii i okazje go skracają", () => {
    expect(QUIZ_QUESTION_COUNT).toBe(QUIZ_STEPS.length);
    expect(quizStepsFor({ drop: false })).toBe(QUIZ_STEPS);
    expect(quizStepsFor({ drop: false, preferredCity: null })).toBe(QUIZ_STEPS);
    expect(quizStepsFor({ drop: false, preferredCity: "Porto" })).toEqual(QUIZ_STEPS.filter((id) => id !== "region"));
    expect(quizStepsFor({ drop: true, preferredCity: "Porto" })).toBe(DROP_QUIZ_STEPS);
    expect(DROP_QUIZ_STEPS).not.toContain("region");
  });
  it("analityka: dotychczasowe numery kroków bez zmian, region dostaje 6, rodzaj wyjazdu 7", () => {
    expect(quizAnalyticsStep("region")).toBe(6);
    expect(QUIZ_STEPS.filter((id) => id !== "region" && id !== "tripType").map(quizAnalyticsStep).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("zapis z v5 (bez kroku region) wraca do tego samego pytania", () => {
    const v5 = ["companion", "vibe", "styles", "when", "departure", "budget"] as const;
    v5.forEach((id, oldIndex) => expect(quizStepAt(migrateQuizStepV5(oldIndex))).toBe(id));
  });
  it("wyższy przedział budżetu wymaga dalekiego regionu", () => {
    const high = { ...complete, budget: "high" as const };
    expect(canCompleteQuizStep("budget", high)).toBe(false);
    expect(canCompleteQuizStep("budget", { ...high, regions: ["europa"] })).toBe(false);
    expect(canCompleteQuizStep("budget", { ...high, regions: ["europa", "ameryka_poludniowa"] })).toBe(true);
    expect(firstIncompleteQuizStep({ ...high, regions: ["europa"] }, QUIZ_STEPS)).toBe("budget");
    expect(canCompleteQuizStep("budget", { ...complete, budget: "medium" })).toBe(true);
  });
});
