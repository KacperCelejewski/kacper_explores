import { cache } from "react";
import { POLISH_AIRPORTS } from "@/lib/airports";
import { createServiceClient } from "@/lib/supabase/service";
import { citiesWithDeals, dealCityName } from "@/lib/seo/cities";
import type { CatalogEntry } from "@/lib/destinations/catalog";
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
// cache: generateMetadata i strona w jednym żądaniu dzielą jedno zapytanie
export const getDealsForOrigin = cache(async (origin: string, limit = 12): Promise<DealsForOrigin> => {
  try {
    return await loadDealsForOrigin(origin, limit);
  } catch (err) {
    // Brak połączenia albo zmiennych środowiskowych nie wywraca strony: pokazuje się stan „brak okazji”
    console.error("[drop/read] origin", err instanceof Error ? err.message : err);
    return { deals: [], teasers: new Map(), week: null };
  }
});

async function loadDealsForOrigin(origin: string, limit: number): Promise<DealsForOrigin> {
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
export const getDealsForCity = cache(async (cityName: string): Promise<DropDeal[]> => {
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
});

// Miasta z listy weekendowej, do których w ostatnim tygodniu są ceny (te strony są w indeksie); przy błędzie bazy pusto.
// Stały spis miast na /okazje i na stronie głównej, żeby każda indeksowalna strona miasta miała wejście z linku.
export const getCitiesWithDeals = cache(async (): Promise<CatalogEntry[]> => {
  try {
    const { data } = await createServiceClient().from("drop_deals").select("city_name, week").order("week", { ascending: false }).limit(1500);
    if (!data) return [];
    return citiesWithDeals(pickLatestWeek(data as { week: string; city_name: string }[]).map((r) => r.city_name));
  } catch (err) {
    console.error("[drop/read] cities", err instanceof Error ? err.message : err);
    return [];
  }
});

const IATA = /^[A-Z]{3}$/;

// Cena na karcie kierunku z quizu: wiersze drop_deals dla miast z katalogu i wybranych lotnisk, tylko z NAJNOWSZEGO
// tygodnia każdego lotniska (starszego nie podstawiamy, gdy najnowszy nie ma tego miasta). Przy błędzie bazy pusto.
export async function getDealsForCards(cities: CatalogEntry[], origins: string[]): Promise<DropDeal[]> {
  const airports = [...new Set(origins)].filter((o) => IATA.test(o)).slice(0, 8);
  if (!cities.length || !airports.length) return [];
  try {
    const db = createServiceClient();
    const latest = new Map<string, string>();
    await Promise.all(airports.map(async (origin) => {
      const { data, error } = await db.from("drop_deals").select("week").eq("origin", origin)
        .order("week", { ascending: false }).limit(1);
      if (error) throw new Error(error.message);
      if (data?.[0]?.week) latest.set(origin, data[0].week as string);
    }));
    if (!latest.size) return [];
    const weeks = [...new Set(latest.values())];
    const codes = [...new Set(cities.flatMap((c) => [c.iataWro, c.iataBer].filter((x): x is string => !!x)))];
    const names = [...new Set(cities.map(dealCityName))];
    const base = () => db.from("drop_deals").select("*").in("origin", [...latest.keys()]).in("week", weeks).order("price", { ascending: true });
    const [byCode, byName] = await Promise.all([base().in("city_code", codes).limit(500), base().in("city_name", names).limit(500)]);
    if (byCode.error || byName.error) throw new Error((byCode.error ?? byName.error)!.message);
    const rows = new Map<string, DropDeal>();
    for (const row of [...(byCode.data ?? []), ...(byName.data ?? [])] as DropDeal[]) {
      if (latest.get(row.origin) !== row.week) continue;
      rows.set(`${row.origin}|${row.city_code}|${row.week}`, row);
    }
    return [...rows.values()];
  } catch (err) {
    console.error("[drop/read] cards", err instanceof Error ? err.message : err);
    return [];
  }
}
