import { POLISH_AIRPORTS } from "@/lib/airports";
import { createServiceClient } from "@/lib/supabase/service";
import type { CityTeaser, DropDeal } from "./types";

// Segment adresu (/okazje/wro) na kod polskiego lotniska; reszta to 404
export function originFromSlug(slug: string): string | null {
  const code = slug.trim().toUpperCase();
  return POLISH_AIRPORTS.some((a) => a.code === code) ? code : null;
}

// Klucz tygodnia ma format RRRR-Www, więc zwykłe porównanie tekstu porządkuje też przełom roku
export function pickLatestWeek<T extends { week: string }>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const latest = rows.reduce((max, r) => (r.week > max ? r.week : max), rows[0].week);
  return rows.filter((r) => r.week === latest);
}

// Okazji z lotem, który już odleciał, nie pokazujemy. Czas ma offset, więc porównanie jest dokładne.
export function upcomingDeals<T extends { departure_at: string }>(deals: T[], now: Date = new Date()): T[] {
  return deals.filter((d) => {
    const t = Date.parse(d.departure_at);
    return !Number.isNaN(t) && t >= now.getTime();
  });
}

export interface DealsForOrigin {
  deals: DropDeal[];
  teasers: Map<string, CityTeaser>;
  week: string | null;
}

// Najtańsze okazje z ostatniego tygodnia, w którym cron coś zapisał dla tego lotniska
export async function getDealsForOrigin(origin: string, limit = 12): Promise<DealsForOrigin> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("drop_deals")
    .select("*")
    .eq("origin", origin)
    .order("week", { ascending: false })
    .order("price", { ascending: true })
    .limit(80);
  if (error || !data) {
    if (error) console.error("[drop/read] drop_deals", error.message);
    return { deals: [], teasers: new Map(), week: null };
  }

  const deals = upcomingDeals(pickLatestWeek(data as DropDeal[]))
    .sort((a, b) => a.price - b.price)
    .slice(0, limit);
  if (deals.length === 0) return { deals: [], teasers: new Map(), week: null };

  const week = deals[0].week;
  const { data: teaserRows } = await db
    .from("city_teasers")
    .select("*")
    .eq("week", week)
    .in("city_code", deals.map((d) => d.city_code));
  const teasers = new Map<string, CityTeaser>(((teaserRows ?? []) as CityTeaser[]).map((t) => [t.city_code, t]));
  return { deals, teasers, week };
}

// Najtańsza oferta z każdego lotniska, od najtańszej; do bloku „loty w tym tygodniu” na stronie miasta
export function bestPerOrigin(deals: DropDeal[]): DropDeal[] {
  const best = new Map<string, DropDeal>();
  for (const d of deals) {
    const cur = best.get(d.origin);
    if (!cur || d.price < cur.price) best.set(d.origin, d);
  }
  return [...best.values()].sort((a, b) => a.price - b.price);
}

// Oferty do jednego miasta (po nazwie z Travelpayouts) z ostatniego tygodnia; przy błędzie bazy pusto,
// żeby strona miasta nadal się renderowała
export async function getDealsForCity(cityName: string): Promise<DropDeal[]> {
  try {
    const { data, error } = await createServiceClient()
      .from("drop_deals")
      .select("*")
      .eq("city_name", cityName)
      .order("week", { ascending: false })
      .limit(60);
    if (error || !data) return [];
    return bestPerOrigin(upcomingDeals(pickLatestWeek(data as DropDeal[])));
  } catch (err) {
    console.error("[drop/read] city", err instanceof Error ? err.message : err);
    return [];
  }
}
