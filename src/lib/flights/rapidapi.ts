import { createClient } from "@supabase/supabase-js";

export interface RealFlight {
  price: number;
  airline: string;
  departureDate: string;       // YYYY-MM-DD
  departureTime: string;       // HH:MM local at origin
  arrivalTime: string;         // HH:MM local at destination
  returnDate: string;          // YYYY-MM-DD
  returnDepartureTime: string; // HH:MM local at destination
  returnArrivalTime: string;   // HH:MM local at origin
  durationMinutes: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KiwiRaw = Record<string, any>;

interface KiwiResponse {
  itineraries?: KiwiRaw[];
}

function legTimes(leg: KiwiRaw): { dep: string; arr: string; airline: string } | null {
  const segs: KiwiRaw[] = leg?.sectorSegments ?? [];
  if (!segs.length) return null;
  const first = segs[0].segment;
  const last = segs[segs.length - 1].segment;
  const dep: string = first?.source?.localTime;
  const arr: string = last?.destination?.localTime;
  if (!dep || !arr) return null;
  const airline: string = first?.carrier?.name ?? "Linie lotnicze";
  return { dep, arr, airline };
}

// ── Global daily cap ──────────────────────────────────────────────────────────
export const DAILY_CAP = 400;
const ALERT_THRESHOLD = 0.8; // send alert email at 80% of cap

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

  // Fire-and-forget alert at threshold crossing
  if (dailyCallCount === Math.floor(DAILY_CAP * ALERT_THRESHOLD)) {
    void fireAlertIfNeeded(dailyCallCount);
  }

  return true;
}

async function fireAlertIfNeeded(count: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    // Check if we already sent an alert today
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await sb
      .from("api_alert_log")
      .select("id")
      .gte("sent_at", `${today}T00:00:00Z`)
      .limit(1)
      .single();

    if (data) return; // already alerted today

    await sb.from("api_alert_log").insert({ threshold: Math.round((count / DAILY_CAP) * 100) });

    // Dynamic import to avoid circular deps
    const { sendApiAlert } = await import("@/lib/email");
    await sendApiAlert(count, DAILY_CAP);
  } catch {
    // Non-critical
  }
}

// ── Process-level L1 cache (warm serverless instance, TTL 12h) ────────────────
const memCache = new Map<string, { data: RealFlight[]; expiresAt: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12h

// ── Supabase service client (L2 cache, persists across cold starts) ───────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function readSupabaseCache(cacheKey: string): Promise<RealFlight[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from("flight_cache")
      .select("flights")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();
    return data ? (data.flights as RealFlight[]) : null;
  } catch {
    return null;
  }
}

async function writeSupabaseCache(cacheKey: string, flights: RealFlight[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const expiresAt = new Date(Date.now() + CACHE_TTL).toISOString();
  try {
    await sb.from("flight_cache").upsert({ cache_key: cacheKey, flights, expires_at: expiresAt });
  } catch {
    // Non-critical — cache write failure doesn't break the feature
  }
}

async function cleanExpiredSupabaseCache(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("flight_cache").delete().lt("expires_at", new Date().toISOString());
  } catch {
    // Non-critical
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickDates(month: number, duration: number): { depart: string; ret: string } {
  const now = new Date();
  const year = month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const depart = `${year}-${pad(month)}-15`;
  const retDate = new Date(depart);
  retDate.setUTCDate(retDate.getUTCDate() + duration);
  return { depart, ret: retDate.toISOString().slice(0, 10) };
}

function hhmm(isoTimestamp: string): string {
  return isoTimestamp.slice(11, 16);
}

// ── Usage logging ─────────────────────────────────────────────────────────────

async function logUsage(
  cacheKey: string,
  origin: string,
  dest: string,
  month: number,
  hit: boolean
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("api_usage_log").insert({ cache_key: cacheKey, origin, dest, month, hit });
  } catch {
    // Non-critical
  }
}

// ── Core function: fetch + cache ──────────────────────────────────────────────

/**
 * Returns up to `maxResults` cheapest roundtrip flights for a route+month.
 * Cache hierarchy: L1 in-memory (per instance) → L2 Supabase (shared) → RapidAPI.
 * Falls back gracefully: if API unavailable or cap exceeded, returns [].
 */
export async function searchFlightOptions(
  originCode: string,
  destCode: string,
  month: number,
  duration: number,
  maxResults = 3
): Promise<RealFlight[]> {
  const token = process.env.RAPIDAPI_KEY;
  if (!token) return [];

  const { depart, ret } = pickDates(month, duration);
  const cacheKey = `${originCode}-${destCode}-${depart.slice(0, 7)}`;

  // L1: in-memory
  const mem = memCache.get(cacheKey);
  if (mem && mem.expiresAt > Date.now()) {
    void logUsage(cacheKey, originCode, destCode, month, true);
    return mem.data.slice(0, maxResults);
  }

  // L2: Supabase
  const cached = await readSupabaseCache(cacheKey);
  if (cached) {
    memCache.set(cacheKey, { data: cached, expiresAt: Date.now() + CACHE_TTL });
    void logUsage(cacheKey, originCode, destCode, month, true);
    return cached.slice(0, maxResults);
  }

  // Guard: daily cap
  if (!canCallApi()) {
    console.warn(`[RapidAPI] Daily cap (${DAILY_CAP}) reached — skipping API call`);
    void logUsage(cacheKey, originCode, destCode, month, false);
    return [];
  }

  try {
    const url = new URL("https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip");
    url.searchParams.set("source", `Airport:${originCode}`);
    url.searchParams.set("destination", `Airport:${destCode}`);
    url.searchParams.set("currency", "PLN");
    url.searchParams.set("locale", "pl");
    url.searchParams.set("adults", "1");
    url.searchParams.set("children", "0");
    url.searchParams.set("infants", "0");
    url.searchParams.set("handbags", "1");
    url.searchParams.set("holdbags", "0");
    url.searchParams.set("cabinClass", "ECONOMY");
    url.searchParams.set("sortBy", "PRICE");
    url.searchParams.set("sortOrder", "ASCENDING");
    url.searchParams.set("applyMixedClasses", "true");
    url.searchParams.set("allowReturnFromDifferentCity", "false");
    url.searchParams.set("enableSelfTransfer", "true");
    url.searchParams.set("transportTypes", "FLIGHT");
    url.searchParams.set("contentProviders", "FRESH,KIWI");
    url.searchParams.set("outbound", "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY");
    url.searchParams.set("limit", "10");

    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "kiwi-com-cheap-flights.p.rapidapi.com",
        "x-rapidapi-key": token,
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[Kiwi] HTTP ${res.status} ${originCode}→${destCode} body: ${errBody.slice(0, 300)}`);
      return [];
    }

    const json = (await res.json()) as KiwiResponse;
    const itineraries = json.itineraries ?? [];

    // Store all results in cache (up to 5), serve sliced on read
    const results: RealFlight[] = [];
    for (const item of itineraries.slice(0, 5)) {
      const out = legTimes(item.outbound);
      const inb = legTimes(item.inbound);
      if (!out || !inb) continue;

      const price = Number(item.price?.amount ?? item.priceEur?.amount ?? 0);
      if (!price) continue;

      results.push({
        price,
        airline: out.airline,
        departureDate: out.dep.slice(0, 10),
        departureTime: hhmm(out.dep),
        arrivalTime: hhmm(out.arr),
        returnDate: inb.dep.slice(0, 10),
        returnDepartureTime: hhmm(inb.dep),
        returnArrivalTime: hhmm(inb.arr),
        durationMinutes: Math.round((item.outbound?.duration ?? 0) / 60),
      });
    }

    // Write to both cache layers (fire-and-forget for Supabase)
    memCache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL });
    void writeSupabaseCache(cacheKey, results);
    void logUsage(cacheKey, originCode, destCode, month, false);
    // Opportunistically clean expired rows (1% chance to avoid overhead)
    if (Math.random() < 0.01) void cleanExpiredSupabaseCache();

    return results.slice(0, maxResults);
  } catch {
    return [];
  }
}

/**
 * Returns the single cheapest flight for a route+month.
 * Reuses the same cache as searchFlightOptions — no extra API call.
 */
export async function searchCheapestFlight(
  originCode: string,
  destCode: string,
  month: number,
  duration: number
): Promise<RealFlight | null> {
  const results = await searchFlightOptions(originCode, destCode, month, duration, 1);
  return results[0] ?? null;
}
