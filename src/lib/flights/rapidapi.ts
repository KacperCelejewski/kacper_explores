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

// ── Response types ────────────────────────────────────────────────────────────

interface KiwiSegment {
  source: { localTime: string };
  destination: { localTime: string };
  carrier?: { name?: string };
}

interface KiwiSectorSegment {
  segment: KiwiSegment;
}

interface KiwiLeg {
  sectorSegments: KiwiSectorSegment[];
  duration?: number; // seconds
}

interface KiwiItinerary {
  price: { amount: string | number };
  outbound: KiwiLeg;
  inbound?: KiwiLeg;
}

interface KiwiResponse {
  status: boolean;
  data: { itineraries: KiwiItinerary[] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function legTimes(leg: KiwiLeg): { dep: string; arr: string; airline: string } | null {
  const segs = leg?.sectorSegments ?? [];
  if (!segs.length) return null;
  const first = segs[0].segment;
  const last = segs[segs.length - 1].segment;
  const dep: string = first?.source?.localTime;
  const arr: string = last?.destination?.localTime;
  if (!dep || !arr) return null;
  const airline: string = first?.carrier?.name ?? "Linie lotnicze";
  return { dep, arr, airline };
}

function localHHMM(isoStr: string): string {
  // localTime is already local — just extract HH:MM
  const m = isoStr.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "00:00";
}

function dateOnly(isoStr: string): string {
  return isoStr.slice(0, 10);
}

/** Pick a plausible mid-month departure date for a given month, then add `duration` days for return */
function pickDates(month: number, duration: number): { departDate: string; returnDate: string } {
  const now = new Date();
  const year = month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
  const depart = new Date(Date.UTC(year, month - 1, 15));
  const ret = new Date(depart.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { departDate: fmt(depart), returnDate: fmt(ret) };
}

// ── Global daily cap ──────────────────────────────────────────────────────────
export const DAILY_CAP = 400;
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
    // Non-critical
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
 * Cache hierarchy: L1 in-memory (per instance) → L2 Supabase (shared) → flights-scraper-real-time.
 * Falls back gracefully: if API unavailable or cap exceeded, returns [].
 */
export async function searchFlightOptions(
  originCode: string,
  destCode: string,
  month: number,
  duration: number,
  maxResults = 3
): Promise<RealFlight[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  const { departDate, returnDate } = pickDates(month, duration);
  const cacheKey = `fsr-${originCode}-${destCode}-${departDate}-${returnDate}`;

  // L1: in-memory
  const mem = memCache.get(cacheKey);
  if (mem && mem.expiresAt > Date.now() && mem.data.length > 0) {
    void logUsage(cacheKey, originCode, destCode, month, true);
    return mem.data.slice(0, maxResults);
  }

  // L2: Supabase
  const cached = await readSupabaseCache(cacheKey);
  if (cached && cached.length > 0) {
    memCache.set(cacheKey, { data: cached, expiresAt: Date.now() + CACHE_TTL });
    void logUsage(cacheKey, originCode, destCode, month, true);
    return cached.slice(0, maxResults);
  }

  if (!canCallApi()) return [];

  try {
    const url = new URL("https://flights-scraper-real-time.p.rapidapi.com/flights/search-return");
    url.searchParams.set("originSkyId", originCode);
    url.searchParams.set("destinationSkyId", destCode);
    url.searchParams.set("departDate", departDate);
    url.searchParams.set("returnDate", returnDate);
    url.searchParams.set("adults", "1");
    url.searchParams.set("currency", "PLN");

    const res = await fetch(url.toString(), {
      headers: {
        "x-rapidapi-host": "flights-scraper-real-time.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });

    if (!res.ok) {
      console.error(`[flights-scraper] HTTP ${res.status} ${originCode}→${destCode}`);
      return [];
    }

    const json = (await res.json()) as KiwiResponse;
    if (!json.status) return [];

    const itineraries = json.data?.itineraries ?? [];
    const results: RealFlight[] = [];

    for (const it of itineraries.slice(0, 10)) {
      if (!it.outbound || !it.price) continue;

      const out = legTimes(it.outbound);
      const inb = it.inbound ? legTimes(it.inbound) : null;
      if (!out) continue;

      const price = Math.round(Number(it.price.amount));
      if (!price) continue;

      const durMinutes = it.outbound.duration ? Math.round(it.outbound.duration / 60) : 120;

      // API ignores departDate — use pickDates() dates so user sees their selected month.
      // Times (HH:MM) are real flight schedule data for this route.
      results.push({
        price,
        airline: out.airline,
        departureDate: departDate,
        departureTime: localHHMM(out.dep),
        arrivalTime: localHHMM(out.arr),
        returnDate: returnDate,
        returnDepartureTime: inb ? localHHMM(inb.dep) : "08:00",
        returnArrivalTime: inb ? localHHMM(inb.arr) : "11:00",
        durationMinutes: durMinutes,
      });
    }

    results.sort((a, b) => a.price - b.price);

    if (results.length > 0) {
      memCache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL });
      void writeSupabaseCache(cacheKey, results);
    }
    void logUsage(cacheKey, originCode, destCode, month, false);
    if (Math.random() < 0.01) void cleanExpiredSupabaseCache();

    return results.slice(0, maxResults);
  } catch (err) {
    console.error("[flights-scraper] error:", err);
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
