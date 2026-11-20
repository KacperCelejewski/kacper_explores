import type { QuizAnswers, TripPlan } from "@/types";
import type { AccessCost } from "@/lib/costModel";
import { isGroundMode, planTransport, planTravel, travelBudgetText, travelModeName } from "./index";

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

/**
 * Dane do `buildPlanCostModel` dla planu lądowego: `ground` wyłącza pozycję Lot, a `access` niesie nasz szacunek
 * dojazdu (z pola `flights`, bez nazwy środka i dopisku "(szacunek)": pozycja ma własną etykietę i status).
 * Plan na samolot i starszy plan dają `{ ground: false, access: null }`.
 */
export function planAccessInput(plan: Pick<TripPlan, "transport" | "budgetBreakdown">): { ground: boolean; access: AccessCost | null } {
  if (!plan.transport || !isGroundMode(plan.transport)) return { ground: false, access: null };
  const raw = (plan.budgetBreakdown?.flights ?? "").trim();
  const value = raw.replace(/^[^:]+:\s*/, "").replace(/\s*\(szacunek\)$/, "");
  return { ground: true, access: value ? { label: `Dojazd (${travelModeName(plan.transport).toLowerCase()})`, value } : null };
}
