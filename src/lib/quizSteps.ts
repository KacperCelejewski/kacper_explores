import type { QuizAnswers } from "@/types";

export const QUIZ_STEPS = ["companion", "vibe", "styles", "when", "departure", "budget"] as const;
export type QuizStepId = typeof QUIZ_STEPS[number];
export const DROP_QUIZ_STEPS: readonly QuizStepId[] = ["companion", "vibe", "styles", "budget"];
const LEGACY_STEPS: readonly QuizStepId[] = ["companion", "budget", "vibe", "styles", "when", "departure"];

export function quizStepIndex(id: QuizStepId): number {
  return QUIZ_STEPS.indexOf(id);
}

export function parseQuizStep(value: string | null): QuizStepId | null {
  return QUIZ_STEPS.find((id) => id === value) ?? null;
}

// The store index always refers to the FULL flow, including while using a drop link.
export function quizStepAt(index: number): QuizStepId {
  return QUIZ_STEPS[index] ?? "companion";
}

export function migrateQuizStep(index: unknown): number {
  return quizStepIndex(LEGACY_STEPS[typeof index === "number" ? index : -1] ?? "companion");
}

// Keep the historic meaning of step in quiz_events and GA4 reports.
export function quizAnalyticsStep(id: QuizStepId): number {
  return LEGACY_STEPS.indexOf(id);
}

export function canCompleteQuizStep(id: QuizStepId, answers: QuizAnswers): boolean {
  switch (id) {
    case "companion": return answers.companion !== null;
    case "vibe": return answers.vibe !== null;
    case "styles": return true;
    case "when": return answers.month !== null && answers.duration !== null;
    case "departure": return answers.airports.length > 0;
    case "budget": return answers.budget !== null;
  }
}

export function firstIncompleteQuizStep(answers: QuizAnswers, steps: readonly QuizStepId[]): QuizStepId | undefined {
  return steps.find((id) => !canCompleteQuizStep(id, answers));
}

// A migrated session may be further ahead than its required answers. Resume at
// the first missing question rather than presenting a last step that cannot finish.
export function resolveQuizStep(index: number, answers: QuizAnswers, steps: readonly QuizStepId[]): QuizStepId {
  const requested = quizStepAt(index);
  const position = steps.indexOf(requested);
  if (position < 0) return steps[0];
  return firstIncompleteQuizStep(answers, steps.slice(0, position)) ?? requested;
}
