import { createServiceClient } from "@/lib/supabase/service";
import { FLIGHT_CACHE_TTL_MS } from "@/lib/constants";
import { SKY_IDS } from "@/lib/flights/sky-ids";
import { MAX_GROUP, type FlightPassengers } from "@/lib/group";

const SOLO: FlightPassengers = { adults: 1, children: 0, infants: 0 };

export interface RealFlight {
  price: number;               // PLN za osobę
  totalPrice: number;          // PLN za całą grupę
  passengers: FlightPassengers;
  airline: string;
  departureDate: string;       // YYYY-MM-DD
  departureTime: string;       // HH:MM local at origin
  arrivalTime: string;         // HH:MM local at destination
  returnDate: string;          // YYYY-MM-DD
  returnDepartureTime: string; // HH:MM local at destination
  returnArrivalTime: string;   // HH:MM local at origin
  durationMinutes: number;
}

// ── Sky Scrapper response types ───────────────────────────────────────────────

interface SkyCarrier {
  name: string;
  alternateId?: string;
}

interface SkyLeg {
  id: string;
  departure: string;        // "2026-08-15T06:30:00"
  arrival: string;          // "2026-08-15T09:15:00"
  durationInMinutes: number;
  carriers: {
    marketing: SkyCarrier[];
  };
  segments?: {
    departure: string;
    arrival: string;
    durationInMinutes: number;
    marketingCarrier?: { name: string };
  }[];
}

interface SkyItinerary {
  price: { raw: number; formatted?: string };
  legs: SkyLeg[];
  score?: number;
}

interface SkyResponse {
  status: boolean;
  data: {
    itineraries: SkyItinerary[];
    context?: { status: string; totalResults: number; sessionId?: string };
    sessionId?: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoToDate(iso: string): string {
  return iso.slice(0, 10);
}

function isoToHHMM(iso: string): string {
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "00:00";
}

function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Returns up to 4 candidate departure dates for the month, sorted nearest first.
// Tries days 10, 15, 20, 25; each picks the first occurrence ≥3 days from now.
function candidateDates(month: number, duration: number): Array<{ departDate: string; returnDate: string }> {
  const now = new Date();
  const minTime = now.getTime() + 3 * 24 * 60 * 60 * 1000;
  const results: Array<{ departDate: string; returnDate: string; t: number }> = [];

  for (const day of [10, 15, 20, 25]) {
    let depart = new Date(Date.UTC(now.getFullYear(), month - 1, day));
    if (depart.getTime() < minTime) {
      depart = new Date(Date.UTC(now.getFullYear() + 1, month - 1, day));
    }
    const ret = new Date(depart.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
    results.push({ departDate: fmtDate(depart), returnDate: fmtDate(ret), t: depart.getTime() });
  }

  results.sort((a, b) => a.t - b.t);

  // Deduplicate (e.g. all 4 days might land in next year same month)
  const seen = new Set<string>();
  return results
    .filter(({ departDate }) => {
      if (seen.has(departDate)) return false;
      seen.add(departDate);
      return true;
    })
    .map(({ departDate, returnDate }) => ({ departDate, returnDate }));
}

// Klucz cache: jeden dorosły zachowuje dawny format, żeby stare wpisy dalej trafiały.
export function buildFlightCacheKey(
  origin: string,
  dest: string,
  departDate: string,
  returnDate: string,
  p: FlightPassengers
): string {
  const base = `sky-${origin}-${dest}-${departDate}-${returnDate}`;
  if (p.adults === 1 && p.children === 0 && p.infants === 0) return base;
  return `${base}-a${p.adults}c${p.children}i${p.infants}`;
}

// TODO: potwierdzić zapytaniem na żywo (2 dorosłych vs 1) przed zaufaniem cenom grupowym
// Parametry pasażerów dla Sky Scrappera; dla jednego dorosłego zostaje samo adults=1.
export function buildSearchParams(p: FlightPassengers): Record<string, string> {
  const params: Record<string, string> = { adults: String(p.adults) };
  if (p.children > 0) params.childrens = String(p.children);
  if (p.infants > 0) params.infants = String(p.infants);
  return params;
}

// Skład z query stringa: domyślnie 1/0/0, null gdy wartości są poza zakresem
// albo miejsc (dorośli plus dzieci, bez niemowląt) jest więcej niż MAX_GROUP.
export function parsePassengers(searchParams: URLSearchParams): FlightPassengers | null {
  const read = (name: string, fallback: number, min: number): number | null => {
    const raw = searchParams.get(name);
    if (raw === null || raw === "") return fallback;
    if (!/^\d+$/.test(raw)) return null;
    const n = Number(raw);
    return n >= min && n <= MAX_GROUP ? n : null;
  };
  const adults = read("adults", 1, 1);
  const children = read("children", 0, 0);
  const infants = read("infants", 0, 0);
  if (adults === null || children === null || infants === null) return null;
  if (adults + children > MAX_GROUP) return null;
  return { adults, children, infants };
}

// Zakładamy, że price.raw to cena całej rezerwacji (z niemowlętami włącznie).
// Cena za osobę to całość podzielona przez liczbę miejsc (dorośli plus dzieci, jak w groupSize);
// niemowlęta wchodzą tylko do sumy.
// TODO: potwierdzić zapytaniem na żywo (2 dorosłych vs 1) przed zaufaniem cenom grupowym
export function splitPrice(total: number, p: FlightPassengers): { price: number; totalPrice: number } {
  const seats = p.adults + p.children;
  const totalPrice = Math.round(total);
  return { price: Math.round(totalPrice / seats), totalPrice };
}

// Stare wpisy cache nie mają totalPrice ani passengers. Dla klucza bez sufiksu (jeden dorosły)
// uzupełniamy braki, dla kluczy grupowych taki wpis uznajemy za brak w cache (null).
export function normalizeCachedFlights(flights: RealFlight[], p: FlightPassengers): RealFlight[] | null {
  const solo = p.adults === 1 && p.children === 0 && p.infants === 0;
  const out: RealFlight[] = [];
  for (const f of flights) {
    if (f.totalPrice !== undefined && f.passengers !== undefined) {
      out.push(f);
    } else if (solo) {
      out.push({ ...f, totalPrice: f.totalPrice ?? f.price, passengers: f.passengers ?? SOLO });
    } else {
      return null;
    }
  }
  return out;
}

// ── Global daily cap ──────────────────────────────────────────────────────────
export const DAILY_CAP = 10600;
const ALERT_THRESHOLD = 0.8;

let dailyCallCount = 0;
let dailyResetAt = startOfNextDay();

function startOfNextDay(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function canCallApi(): boolean {
  const now = Date.now();
  if (now >= dailyResetAt) {
    dailyCallCount = 0;
    dailyResetAt = startOfNextDay();
  }
  if (dailyCallCount >= DAILY_CAP) return false;
  dailyCallCount++;
  if (dailyCallCount === Math.floor(DAILY_CAP * ALERT_THRESHOLD)) {
    void fireAlertIfNeeded(dailyCallCount);
  }
  return true;
}

async function fireAlertIfNeeded(count: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await sb
      .from("api_alert_log")
      .select("id")
      .gte("sent_at", `${today}T00:00:00Z`)
      .limit(1)
      .single();
    if (data) return;
    await sb.from("api_alert_log").insert({ threshold: Math.round((count / DAILY_CAP) * 100) });
    const { sendApiAlert } = await import("@/lib/email");
    await sendApiAlert(count, DAILY_CAP);
  } catch (err) {
    console.error("[rapidapi] fireAlertIfNeeded failed:", err);
  }
}

// ── Process-level L1 cache ────────────────────────────────────────────────────
const memCache = new Map<string, { data: RealFlight[]; expiresAt: number }>();

// ── Supabase L2 cache ─────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient();
}

async function readSupabaseCache(cacheKey: string, passengers: FlightPassengers): Promise<RealFlight[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from("flight_cache")
      .select("flights")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();
    return data ? normalizeCachedFlights(data.flights as RealFlight[], passengers) : null;
  } catch { return null; }
}

async function writeSupabaseCache(cacheKey: string, flights: RealFlight[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const expiresAt = new Date(Date.now() + FLIGHT_CACHE_TTL_MS).toISOString();
  try {
    await sb.from("flight_cache").upsert({ cache_key: cacheKey, flights, expires_at: expiresAt });
  } catch { /* non-critical */ }
}

async function cleanExpiredSupabaseCache(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("flight_cache").delete().lt("expires_at", new Date().toISOString());
  } catch { /* non-critical */ }
}

async function logUsage(cacheKey: string, origin: string, dest: string, month: number, hit: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("api_usage_log").insert({ cache_key: cacheKey, origin, dest, month, hit });
  } catch { /* non-critical */ }
}

// ── Single-date fetch with built-in retry ─────────────────────────────────────
// Returns parsed flights or null (null = no results for this date, try next candidate).
// Dokumentacja Sky Scrappera (RapidAPI) była niedostępna, więc poniższe punkty to założenia do sprawdzenia:
// - dzieci i niemowlęta to parametry `childrens` i `infants` obok `adults`;
// - `price.raw` traktujemy jako cenę całej rezerwacji, a nie za osobę;
// - limit pasażerów przyjmujemy jak MAX_GROUP (9 miejsc);
// - segmenty nie mają w naszych typach numeru lotu (pole nieznane, nie używamy go).
async function fetchForDate(
  originSky: { skyId: string; entityId: string },
  destSky: { skyId: string; entityId: string },
  departDate: string,
  returnDate: string,
  originCode: string,
  destCode: string,
  apiKey: string,
  passengers: FlightPassengers = SOLO
): Promise<RealFlight[] | null> {
  const url = new URL("https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchFlights");
  url.searchParams.set("originSkyId", originSky.skyId);
  url.searchParams.set("originEntityId", originSky.entityId);
  url.searchParams.set("destinationSkyId", destSky.skyId);
  url.searchParams.set("destinationEntityId", destSky.entityId);
  url.searchParams.set("date", departDate);
  url.searchParams.set("returnDate", returnDate);
  url.searchParams.set("cabinClass", "economy");
  for (const [key, value] of Object.entries(buildSearchParams(passengers))) url.searchParams.set(key, value);
  url.searchParams.set("sortBy", "best");
  url.searchParams.set("currency", "PLN");

  const skyFetch = () =>
    fetch(url.toString(), {
      headers: {
        "x-rapidapi-host": "sky-scrapper.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
      cache: "no-store",
    });

  if (!canCallApi()) return null;

  let res = await skyFetch();
  if (!res.ok) {
    console.error(`[sky-scrapper] HTTP ${res.status} ${originCode}→${destCode} date:${departDate}`);
    return null;
  }

  let json = (await res.json()) as SkyResponse;
  console.log(`[sky-scrapper] attempt1 ${originCode}→${destCode} date:${departDate} status:${json.status} itineraries:${json.data?.itineraries?.length ?? 0} context:${json.data?.context?.status}`);

  // Sky Scrapper always needs two calls — first builds the session, second returns results
  if (!json.status || !json.data?.itineraries?.length) {
    await new Promise((r) => setTimeout(r, 1000));
    if (!canCallApi()) return null;
    res = await skyFetch();
    if (!res.ok) {
      console.error(`[sky-scrapper] retry HTTP ${res.status} ${originCode}→${destCode} date:${departDate}`);
      return null;
    }
    json = (await res.json()) as SkyResponse;
    console.log(`[sky-scrapper] attempt2 ${originCode}→${destCode} date:${departDate} status:${json.status} itineraries:${json.data?.itineraries?.length ?? 0} context:${json.data?.context?.status}`);
  }

  if (!json.status || !json.data?.itineraries?.length) return null;

  const results: RealFlight[] = [];

  for (const it of json.data.itineraries.slice(0, 10)) {
    const outbound = it.legs[0];
    const inbound = it.legs[1] ?? null;
    if (!outbound) continue;

    const { price, totalPrice } = splitPrice(it.price.raw, passengers);
    if (!totalPrice) continue;

    const airline = outbound.carriers?.marketing?.[0]?.name ?? "Linie lotnicze";
    const durMinutes = outbound.durationInMinutes ?? 120;

    results.push({
      price,
      totalPrice,
      passengers,
      airline,
      departureDate: isoToDate(outbound.departure),
      departureTime: isoToHHMM(outbound.departure),
      arrivalTime: isoToHHMM(outbound.arrival),
      returnDate: inbound ? isoToDate(inbound.departure) : returnDate,
      returnDepartureTime: inbound ? isoToHHMM(inbound.departure) : "08:00",
      returnArrivalTime: inbound ? isoToHHMM(inbound.arrival) : "11:00",
      durationMinutes: durMinutes,
    });
  }

  results.sort((a, b) => a.price - b.price);
  return results.length > 0 ? results : null;
}

// ── Core fetch ────────────────────────────────────────────────────────────────

export async function searchFlightOptions(
  originCode: string,
  destCode: string,
  month: number,
  duration: number,
  maxResults = 3,
  passengers: FlightPassengers = SOLO
): Promise<{ flights: RealFlight[]; reason?: string }> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return { flights: [], reason: "no_api_key" };

  const originSky = SKY_IDS[originCode];
  const destSky = SKY_IDS[destCode];
  if (!originSky || !destSky) {
    console.warn(`[sky-scrapper] unknown code: origin=${originCode}(${originSky ? "ok" : "missing"}) dest=${destCode}(${destSky ? "ok" : "missing"})`);
    return { flights: [], reason: `unknown_code:${!originSky ? originCode : ""}${!destSky ? "+"+destCode : ""}` };
  }

  const candidates = candidateDates(month, duration).slice(0, 3);

  const perCandidate = await Promise.all(
    candidates.map(async ({ departDate, returnDate }) => {
      const cacheKey = buildFlightCacheKey(originCode, destCode, departDate, returnDate, passengers);

      // L1
      const mem = memCache.get(cacheKey);
      if (mem && mem.expiresAt > Date.now() && mem.data.length > 0) {
        void logUsage(cacheKey, originCode, destCode, month, true);
        return mem.data;
      }

      // L2
      const cached = await readSupabaseCache(cacheKey, passengers);
      if (cached && cached.length > 0) {
        memCache.set(cacheKey, { data: cached, expiresAt: Date.now() + FLIGHT_CACHE_TTL_MS });
        void logUsage(cacheKey, originCode, destCode, month, true);
        return cached;
      }

      try {
        const results = await fetchForDate(originSky, destSky, departDate, returnDate, originCode, destCode, apiKey, passengers);
        if (results && results.length > 0) {
          memCache.set(cacheKey, { data: results, expiresAt: Date.now() + FLIGHT_CACHE_TTL_MS });
          void writeSupabaseCache(cacheKey, results);
          void logUsage(cacheKey, originCode, destCode, month, false);
          return results;
        }
      } catch (err) {
        console.error("[sky-scrapper] error:", err);
      }
      return null;
    })
  );

  const allResults: RealFlight[] = perCandidate.flatMap((r) => r ?? []);

  if (Math.random() < 0.01) void cleanExpiredSupabaseCache();

  if (allResults.length === 0) {
    console.warn(`[sky-scrapper] no flights found for ${originCode}→${destCode} month:${month}`);
    return { flights: [], reason: "no_flights_this_month" };
  }

  allResults.sort((a, b) => a.price - b.price);
  return { flights: allResults.slice(0, maxResults) };
}

export async function searchCheapestFlight(
  originCode: string,
  destCode: string,
  month: number,
  duration: number,
  passengers: FlightPassengers = SOLO
): Promise<RealFlight | null> {
  const { flights } = await searchFlightOptions(originCode, destCode, month, duration, 1, passengers);
  return flights[0] ?? null;
}
