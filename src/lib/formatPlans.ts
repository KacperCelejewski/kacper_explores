// 1 plan, 2–4 plany, 0 i 5+ planów, ale 12–14 to znów „planów”.
export function formatPlans(n: number): string {
  if (n === 1) return "1 plan";
  const lastTwo = n % 100;
  const last = n % 10;
  const few = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return `${n} ${few ? "plany" : "planów"}`;
}
