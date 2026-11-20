import type { QuizAnswers, TripPlan } from "@/types";
import { isGroundMode, planTransport, planTravel, travelBudgetText } from "./index";

/**
 * Pozycja "dojazd" w podziale kosztów planu: dla środka lądowego wpisujemy nasz szacunek (z odległości),
 * zamiast odpowiedzi modelu. Pole zostaje pod starym kluczem `flights`, więc zapisane plany się nie zmieniają.
 * Plan na samolot wraca bez zmian.
 */
export function withTravelBudget(plan: TripPlan, quiz: Pick<QuizAnswers, "transport" | "airports">, city: string): TripPlan {
  const mode = planTransport(quiz);
  if (!isGroundMode(mode)) return plan;
  return { ...plan, transport: mode, budgetBreakdown: { ...plan.budgetBreakdown, flights: travelBudgetText(planTravel(quiz, city), mode) } };
}
