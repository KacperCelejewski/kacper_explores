import { extractBudgetNumbers, mapBudgetNumbers } from "./group";
import type { DayActivity, TripPlan } from "@/types";

const FREE_RE = /^\s*(free|za darmo|darmow\w*|bezpłatn\w*|gratis)/i;
const FOREIGN_CURRENCY_RE = /eur|€|usd|\$|gbp|£|czk|chf|huf|nok|sek/i;

/** Cost of one activity in PLN: 0 for free, midpoint of a range, null when unknown or in another currency. */
export function parseActivityCost(cost: string): number | null {
  if (!cost) return null;
  if (FREE_RE.test(cost)) return 0;
  if (FOREIGN_CURRENCY_RE.test(cost)) return null;
  const numbers = extractBudgetNumbers(cost);
  if (numbers.length === 0) return null;
  return numbers.length === 1 ? numbers[0] : (numbers[0] + numbers[1]) / 2;
}

/** Shifts every number in a budget text (both ends of a range) by `delta`, never below zero. */
export function shiftBudgetText(text: string, delta: number): string {
  if (!/\d/.test(text)) return text;
  return mapBudgetNumbers(text, (n) => Math.max(0, n + delta));
}

type Category = "attractions" | "food" | "accommodation";

const CATEGORY_BY_TYPE: Partial<Record<DayActivity["type"], Category>> = {
  attraction: "attractions",
  food: "food",
  accommodation: "accommodation",
};

function costsByCategory(plan: TripPlan): { total: number; byCategory: Record<Category, number> } {
  const byCategory: Record<Category, number> = { attractions: 0, food: 0, accommodation: 0 };
  let total = 0;
  for (const day of plan.days) {
    for (const activity of day.activities) {
      const cost = parseActivityCost(activity.cost);
      if (cost === null) continue;
      total += cost;
      const category = CATEGORY_BY_TYPE[activity.type];
      if (category) byCategory[category] += cost;
    }
  }
  return { total, byCategory };
}

/**
 * Carries the header budget over from `before` to `after`: the total and the matching
 * categories move by the change in activity costs. Pure; returns `after` itself when nothing changed.
 */
export function adjustPlanBudget(before: TripPlan, after: TripPlan): TripPlan {
  const a = costsByCategory(before);
  const b = costsByCategory(after);
  const totalDelta = b.total - a.total;
  if (totalDelta === 0) return after;

  const breakdown = { ...after.budgetBreakdown };
  for (const category of Object.keys(b.byCategory) as Category[]) {
    const delta = b.byCategory[category] - a.byCategory[category];
    if (delta !== 0) breakdown[category] = shiftBudgetText(breakdown[category], delta);
  }
  return {
    ...after,
    totalBudgetEstimate: shiftBudgetText(after.totalBudgetEstimate, totalDelta),
    budgetBreakdown: breakdown,
  };
}
