import type { QuizAnswers } from "@/types";
import { highBudgetAvailable } from "@/lib/quizOptions";

// Kolejność docelowa (uwagi 7-9): Z kim -> Dokąd (region, P7) -> Jaki wyjazd (tripType, P8) -> Czym (transport, P9)
// -> ochota -> zainteresowania -> termin -> skąd -> budżet. "Dokąd?" stoi zaraz po "Z kim jedziesz?": kierunek to
// najwęższe z pytań, a od niego zależy, czy budżet ma wyższy przedział. "region", "tripType" i "transport" są
// opcjonalne (puste = obojętnie / zwiedzanie / samolot).
export const QUIZ_STEPS = ["companion", "region", "tripType", "transport", "vibe", "styles", "when", "departure", "budget"] as const;
export type QuizStepId = typeof QUIZ_STEPS[number];
/** Liczba pytań w pełnym quizie: teksty na stronach biorą ją stąd, żeby nie rozjeżdżały się z quizem. */
export const QUIZ_QUESTION_COUNT = QUIZ_STEPS.length;
export const DROP_QUIZ_STEPS: readonly QuizStepId[] = ["companion", "vibe", "styles", "budget"];
const LEGACY_STEPS: readonly QuizStepId[] = ["companion", "budget", "vibe", "styles", "when", "departure"];
// Kolejność z zapisów w wersji 5 (bez "region" i "tripType"): indeks w localStorage odnosi się do tej listy.
const V5_STEPS: readonly QuizStepId[] = ["companion", "vibe", "styles", "when", "departure", "budget"];
// Kolejność z zapisów w wersji 6 (z "region", bez "tripType").
const V6_STEPS: readonly QuizStepId[] = ["companion", "region", "vibe", "styles", "when", "departure", "budget"];
// Kolejność z zapisów w wersji 7 (z "region" i "tripType", bez "transport").
const V7_STEPS: readonly QuizStepId[] = ["companion", "region", "tripType", "vibe", "styles", "when", "departure", "budget"];
// Numery kroków w analityce: dotychczasowe sześć zachowuje stare znaczenie, nowe kroki dostają kolejne numery
// (region 6, rodzaj wyjazdu 7, transport 8) i nigdy nie przesuwają starych.
const ANALYTICS_STEPS: readonly QuizStepId[] = [...LEGACY_STEPS, "region", "tripType", "transport"];

/**
 * Kroki do pokazania: skrócona ścieżka okazji, albo pełna. Gdy kierunek jest już wybrany (miasto z galerii),
 * pytanie "Dokąd?" odpada, bo przeczyłoby wyborowi.
 */
export function quizStepsFor(opts: { drop: boolean; preferredCity?: string | null }): readonly QuizStepId[] {
  if (opts.drop) return DROP_QUIZ_STEPS;
  return opts.preferredCity ? QUIZ_STEPS.filter((id) => id !== "region") : QUIZ_STEPS;
}

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

// Zapisy w wersji 5, 6 i 7 miały indeksy bez nowszych kroków; zachowujemy to samo pytanie, nie ten sam numer.
export function migrateQuizStepV5(index: unknown): number {
  return quizStepIndex(V5_STEPS[typeof index === "number" ? index : -1] ?? "companion");
}

export function migrateQuizStepV6(index: unknown): number {
  return quizStepIndex(V6_STEPS[typeof index === "number" ? index : -1] ?? "companion");
}

export function migrateQuizStepV7(index: unknown): number {
  return quizStepIndex(V7_STEPS[typeof index === "number" ? index : -1] ?? "companion");
}

// Keep the historic meaning of step in quiz_events and GA4 reports.
export function quizAnalyticsStep(id: QuizStepId): number {
  return ANALYTICS_STEPS.indexOf(id);
}

export function canCompleteQuizStep(id: QuizStepId, answers: QuizAnswers): boolean {
  switch (id) {
    case "companion": return answers.companion !== null;
    case "region": return true;
    case "vibe": return answers.vibe !== null;
    case "styles": return true;
    // Bez wyboru: zwiedzanie, jak przed dodaniem pytania
    case "tripType": return true;
    case "transport": return true; // brak wyboru = samolot
    case "when": return answers.month !== null && answers.duration !== null;
    case "departure": return answers.airports.length > 0;
    // Wyższy przedział istnieje tylko dla dalekich regionów; po zmianie regionu stary wybór przestaje wystarczać.
    case "budget": return answers.budget !== null && (answers.budget !== "high" || highBudgetAvailable(answers.regions));
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
