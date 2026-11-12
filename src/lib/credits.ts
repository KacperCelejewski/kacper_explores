// Darmowe plany: 2 na miesiąc kalendarzowy (czas warszawski), nie kumulują się i schodzą jako pierwsze.
// Kredyty (Pack, feedback, stare konta) są osobno w credits_remaining i nie wygasają.
export const FREE_PLANS_PER_MONTH = 2;

interface FreePlanFields {
  free_plans_used?: number | null;
  free_plans_period?: string | null;
}

// Pierwszy dzień bieżącego miesiąca w Warszawie, ten sam klucz co w funkcji consume_plan_credit w bazie
export function currentPeriod(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit" })
    .formatToParts(now);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return `${year}-${month}-01`;
}

export function freePlansLeft(profile: FreePlanFields, now: Date = new Date()): number {
  if (profile.free_plans_period !== currentPeriod(now)) return FREE_PLANS_PER_MONTH;
  return Math.max(0, FREE_PLANS_PER_MONTH - (profile.free_plans_used ?? 0));
}

export function plansAvailable(profile: FreePlanFields & { credits_remaining: number }, now: Date = new Date()): number {
  return freePlansLeft(profile, now) + Math.max(0, profile.credits_remaining);
}
