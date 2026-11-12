import type { CityInfo, DropDeal, TpOffer, WeekendVariant, WeekKey } from "./types";

const API = "https://api.travelpayouts.com";
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 8000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchWeekendOffers(
  origin: string,
  v: WeekendVariant,
  token: string,
  fetchImpl: typeof fetch = fetch,
  retryDelayMs = 500,
): Promise<TpOffer[]> {
  const url =
    `${API}/aviasales/v3/prices_for_dates?origin=${encodeURIComponent(origin)}` +
    `&departure_at=${v.depart}&return_at=${v.return}&currency=pln` +
    `&sorting=price&limit=1000&token=${encodeURIComponent(token)}`;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0 && retryDelayMs > 0) await sleep(retryDelayMs * attempt);
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status >= 500 || res.status === 429) {
        console.warn(`[drop] ${origin}: status ${res.status} (próba ${attempt + 1}/${MAX_ATTEMPTS})`);
        continue;
      }
      if (!res.ok) {
        console.warn(`[drop] ${origin}: status ${res.status}, bez ponowienia`);
        return [];
      }
      const body = (await res.json()) as { data?: TpOffer[] };
      return Array.isArray(body.data) ? body.data : [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[drop] ${origin}: ${msg} (próba ${attempt + 1}/${MAX_ATTEMPTS})`);
    }
  }
  return [];
}

export async function fetchCities(
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, CityInfo>> {
  const map = new Map<string, CityInfo>();
  const res = await fetchImpl(`${API}/data/pl/cities.json`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`cities.json: ${res.status}`);
  const rows = (await res.json()) as Array<{
    code: string;
    name: string | null;
    country_code: string;
  }>;
  for (const r of rows) {
    if (!r.name) continue;
    map.set(r.code, { code: r.code, name: r.name, country_code: r.country_code });
  }
  return map;
}

function positiveMinutes(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;
}

// departure_at jest w czasie lokalnym lotniska ("2026-11-12T06:30:00+01:00"), bez konwersji strefy.
function isEarlyThursday(departureAt: string): boolean {
  const [y, m, d] = departureAt.slice(0, 10).split("-").map(Number);
  if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 4) return false;
  return departureAt.slice(11, 16) < "19:00";
}

export function groupDeals(
  offers: TpOffer[],
  variant: WeekendVariant,
  cities: Map<string, CityInfo>,
  week: WeekKey,
  fetchedAt: string,
  origin: string,
): DropDeal[] {
  const best = new Map<string, DropDeal>();
  for (const o of offers) {
    if (
      typeof o.departure_at !== "string" ||
      typeof o.return_at !== "string" ||
      typeof o.price !== "number" ||
      !Number.isFinite(o.price)
    ) {
      continue;
    }
    const city = cities.get(o.destination);
    if (!city || city.country_code === "PL") continue;
    if (o.transfers > 1 || o.return_transfers > 1) continue;
    if (o.departure_at.slice(0, 10) !== variant.depart) continue;
    if (o.return_at.slice(0, 10) !== variant.return) continue;
    // czwartkowy mail wychodzi o 17:00, wylot przed 19:00 zdążyłby odlecieć
    if (isEarlyThursday(o.departure_at)) continue;

    // Travelpayouts podaje w origin kod miasta (WAW dla WMI), więc bierzemy zapytane lotnisko
    const key = `${origin}|${o.destination}`;
    const current = best.get(key);
    if (current && current.price <= o.price) continue;
    best.set(key, {
      week,
      origin,
      city_code: o.destination,
      city_name: city.name,
      price: o.price,
      departure_at: o.departure_at,
      return_at: o.return_at,
      airline: o.airline,
      transfers: Math.max(o.transfers, o.return_transfers),
      link: o.link,
      duration_to: positiveMinutes(o.duration_to),
      duration_back: positiveMinutes(o.duration_back),
      fetched_at: fetchedAt,
    });
  }
  return [...best.values()];
}

export function mergeVariants(deals: DropDeal[]): DropDeal[] {
  const best = new Map<string, DropDeal>();
  for (const d of deals) {
    const key = `${d.origin}|${d.city_code}`;
    const current = best.get(key);
    if (!current || d.price < current.price) best.set(key, d);
  }
  return [...best.values()];
}
