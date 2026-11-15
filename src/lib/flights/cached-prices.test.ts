import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLIGHT_CACHE_TTL_MS } from "@/lib/constants";

const db = vi.hoisted(() => ({
  rows: [] as { cache_key: string; flights: unknown[]; expires_at: string }[],
  error: null as unknown,
  select: vi.fn(), keys: vi.fn(), gt: vi.fn(), insert: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: (table: string) => {
    if (table === "api_usage_log") return { insert: db.insert };
    return { select: db.select };
  } }),
}));

const now = Date.parse("2026-11-15T12:00:00Z");
const solo = { adults: 1, children: 0, infants: 0 };
const pair = { origin: "WRO", destination: "BCN", departDate: "2026-11-20", returnDate: "2026-11-22" };
const key = "sky-WRO-BCN-2026-11-20-2026-11-22";
const legacyFlight = { price: 420, departureDate: pair.departDate, returnDate: pair.returnDate };
const requestBody = {
  destinations: [{ city: "Barcelona", country: "Hiszpania", estimatedFlightCost: "100–200 PLN" }],
  quizAnswers: { month: 11, duration: 3, airports: ["WRO"], companion: "solo" },
};

async function post(body: unknown = requestBody) {
  const { POST } = await import("@/app/api/destination-flight-prices/route");
  const { NextRequest } = await import("next/server");
  return POST(new NextRequest("http://localhost/api/destination-flight-prices", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
  vi.stubEnv("RAPIDAPI_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Upstream must never be called"); }));
  db.rows = [{ cache_key: key, flights: [legacyFlight], expires_at: new Date(now + 1000).toISOString() }];
  db.error = null;
  db.select.mockImplementation(() => ({
    in: db.keys.mockImplementation(() => ({ gt: db.gt })),
    eq: () => ({ gt: () => ({ single: async () => ({ data: db.rows[0] }) }) }),
  }));
  db.gt.mockImplementation(async () => ({ data: db.rows, error: db.error }));
  db.insert.mockResolvedValue({ error: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("cache-only card API", () => {
  it("reads a fresh quote without RAPIDAPI_KEY, batches exact keys and logs hits only", async () => {
    vi.stubEnv("RAPIDAPI_KEY", "");
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const { prices } = await res.json();
    expect(prices[0]).toMatchObject({ price: 420, origin: "WRO", destination: "BCN",
      checkedAt: now + 1000 - FLIGHT_CACHE_TTL_MS, expiresAt: now + 1000 });
    expect(db.keys).toHaveBeenCalledOnce();
    expect(db.keys.mock.calls[0][1]).toEqual([
      key, "sky-WRO-BCN-2026-11-25-2026-11-27", "sky-WRO-BCN-2027-11-10-2027-11-12",
    ]);
    expect(db.insert).toHaveBeenCalledWith([{ cache_key: key, origin: "WRO", dest: "BCN", month: 11, hit: true }]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not extend L2 expiry when promoted to L1", async () => {
    const { readCachedFlightPairs } = await import("./rapidapi");
    expect((await readCachedFlightPairs([pair], solo))[0].expiresAt).toBe(now + 1000);
    await vi.advanceTimersByTimeAsync(1001);
    expect(await readCachedFlightPairs([pair], solo)).toEqual([]);
    expect(db.keys).toHaveBeenCalledTimes(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves the original L2 expiry in the existing paid search reader too", async () => {
    vi.stubEnv("RAPIDAPI_KEY", "test-only");
    const { readCachedFlightPairs, searchFlightForDates } = await import("./rapidapi");
    expect(await searchFlightForDates("WRO", "BCN", pair.departDate, pair.returnDate)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1001);
    expect(await readCachedFlightPairs([pair], solo)).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["missing", "stale", "empty", "table-error", "no-config", "throw"])(
    "returns no amount on %s cache, without paid calls or paid-miss logs", async (scenario) => {
      if (scenario === "missing") db.rows = [];
      if (scenario === "stale") db.rows[0].expires_at = new Date(now).toISOString();
      if (scenario === "empty") db.rows[0].flights = [];
      if (scenario === "table-error") db.error = { message: "table unavailable" };
      if (scenario === "no-config") vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
      if (scenario === "throw") db.gt.mockRejectedValueOnce(new Error("Database down"));
      expect(await (await post()).json()).toEqual({ prices: [null] });
      expect(db.insert).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("matches all selected origins but never a different route, date or year", async () => {
    db.rows.push(
      { ...db.rows[0], cache_key: key.replace("WRO", "KTW"), flights: [{ ...legacyFlight, price: 300 }] },
      { ...db.rows[0], cache_key: key.replace("BCN", "LIS"), flights: [{ ...legacyFlight, price: 1 }] },
      { ...db.rows[0], cache_key: key.replaceAll("2026", "2025"), flights: [{ ...legacyFlight, price: 2 }] },
    );
    const res = await post({ ...requestBody, quizAnswers: { ...requestBody.quizAnswers, airports: ["WRO", "KTW"] } });
    expect((await res.json()).prices[0]).toMatchObject({ origin: "KTW", price: 300 });
    expect(db.keys.mock.calls[0][1]).toHaveLength(6);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses passenger-specific keys and never shows solo prices to a group", async () => {
    const res = await post({ ...requestBody, quizAnswers: { ...requestBody.quizAnswers, companion: "friends" } });
    expect((await res.json()).prices).toEqual([null]);
    expect(db.keys.mock.calls[0][1].every((k: string) => k.endsWith("-a4c0i0"))).toBe(true);
  });

  it("uses one cache query and one usage insert for six cards and eight origins", async () => {
    const destinations = [
      { city: "Barcelona", country: "Hiszpania" }, { city: "Porto", country: "Portugalia" },
      { city: "Rzym", country: "Włochy" }, { city: "Ateny", country: "Grecja" },
      { city: "Madryt", country: "Hiszpania" }, { city: "Praga", country: "Czechy" },
    ];
    const res = await post({
      destinations,
      quizAnswers: { ...requestBody.quizAnswers, airports: ["WRO", "KTW", "KRK", "WAW", "WMI", "POZ", "GDN", "BER"] },
    });
    expect((await res.json()).prices).toHaveLength(6);
    expect(db.keys).toHaveBeenCalledOnce();
    expect(db.keys.mock.calls[0][1]).toHaveLength(144);
    expect(db.insert).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns no price for unknown city/country mappings", async () => {
    expect((await (await post({ ...requestBody, destinations: [{ city: "Barcelona", country: "Włochy" }] })).json()).prices).toEqual([null]);
    expect(db.keys).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    {}, { ...requestBody, destinations: Array(7).fill(requestBody.destinations[0]) },
    { ...requestBody, quizAnswers: { ...requestBody.quizAnswers, month: 13 } },
    { ...requestBody, quizAnswers: { ...requestBody.quizAnswers, month: 1.5 } },
    { ...requestBody, quizAnswers: { ...requestBody.quizAnswers, duration: null } },
    { ...requestBody, quizAnswers: { ...requestBody.quizAnswers, airports: ["XYZ"] } },
    { ...requestBody, quizAnswers: { ...requestBody.quizAnswers, companion: "wrong" } },
    { ...requestBody, quizAnswers: { ...requestBody.quizAnswers, group: { adults: 0, childrenAges: [] } } },
  ])("rejects invalid/bulk input before touching cache", async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(db.select).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("limits repeated cache reads without spending the paid search rate limit", async () => {
    const { checkRateLimit, LIMITS } = await import("@/lib/rateLimit");
    for (let i = 0; i < LIMITS.flights.limit; i++) expect((await post()).status).toBe(200);
    const limited = await post();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    expect(checkRateLimit("real-flights:unknown", LIMITS.realFlights.limit, LIMITS.realFlights.windowMs).allowed).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
