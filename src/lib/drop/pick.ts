import type { DropDeal, DropSubscriber } from "./types";

const MAX_DEALS = 3;

export function pickDealsFor(sub: DropSubscriber, deals: DropDeal[]): DropDeal[] {
  const cheapestByCity = new Map<string, DropDeal>();
  for (const d of deals) {
    if (!sub.airports.includes(d.origin) || d.price > sub.max_price) continue;
    const prev = cheapestByCity.get(d.city_code);
    if (!prev || d.price < prev.price) cheapestByCity.set(d.city_code, d);
  }
  return [...cheapestByCity.values()]
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_DEALS);
}
