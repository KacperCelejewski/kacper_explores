import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DropDeal } from "@/lib/drop/types";

type Row = DropDeal;
const db = vi.hoisted(() => ({
  cache: [] as { cache_key: string; flights: unknown[]; expires_at: string }[],
  deals: [] as Row[],
  dealsError: null as null | { message: string },
  dealQueries: 0,
}));

// Minimal PostgREST-like builder: records .eq/.in filters and resolves them against fixture rows.
function dealsBuilder() {
  const filters: [string, unknown[]][] = [];
  let columns = "*";
  let limit = Infinity;
  let desc = false;
  const b: Record<string, unknown> = {
    select: (c: string) => { columns = c; return b; },
    eq: (col: string, v: unknown) => { filters.push([col, [v]]); return b; },
    in: (col: string, v: unknown[]) => { filters.push([col, v]); return b; },
    order: (_c: string, o: { ascending: boolean }) => { desc = !o.ascending; return b; },
    limit: (n: number) => { limit = n; return b; },
    then: (resolve: (v: unknown) => void) => {
      db.dealQueries++;
      if (db.dealsError) return resolve({ data: null, error: db.dealsError });
      let rows = db.deals.filter((r) => filters.every(([c, vs]) => vs.includes((r as unknown as Record<string, unknown>)[c])));
      if (desc) rows = [...rows].sort((a, c) => String(c.week).localeCompare(String(a.week)));
      const out: unknown[] = rows.slice(0, limit).map((r) => (columns === "week" ? { week: r.week } : r));
      return resolve({ data: out, error: null });
    },
  };
  return b;
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: (table: string) => {
    if (table === "api_usage_log") return { insert: async () => ({ error: null }) };
    if (table === "drop_deals") return dealsBuilder();
    return { select: () => ({ in: () => ({ gt: async () => ({ data: db.cache, error: null }) }) }) };
  } }),
}));

const now = Date.parse("2026-11-19T12:00:00Z");
const deal = (over: Partial<DropDeal> = {}): DropDeal => ({
  week: "2026-W47", origin: "WRO", city_code: "BCN", city_name: "Barcelona", price: 389,
  departure_at: "2026-11-20T06:15:00+01:00", return_at: "2026-11-22T21:40:00+01:00",
  airline: "FR", transfers: 0, link: "/search/WRO2011BCN22111", fetched_at: "2026-11-18T18:00:00Z", ...over,
});
const body = (over: Record<string, unknown> = {}, dests = [{ city: "Barcelona", country: "Hiszpania" }]) => ({
  destinations: dests,
  quizAnswers: { month: 11, duration: 3, airports: ["WRO"], companion: "solo", ...over },
});

async function post(b: unknown) {
  const { POST } = await import("@/app/api/destination-flight-prices/route");
  const { NextRequest } = await import("next/server");
  const res = await POST(new NextRequest("http://localhost/api/destination-flight-prices", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
  }));
  return res.json();
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Upstream must never be called"); }));
  db.cache = []; db.deals = []; db.dealsError = null; db.dealQueries = 0;
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("card API: drop_deals fallback", () => {
  it("falls back to a fresh weekly deal when the cache is empty", async () => {
    db.deals = [deal()];
    const { prices } = await post(body());
    expect(prices[0]).toMatchObject({ source: "deal", price: 389, origin: "WRO", departDate: "2026-11-20" });
    expect(prices[0].deal.link).toBe("/search/WRO2011BCN22111");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("gives the cache priority and does not even query deals when every card has a cache price", async () => {
    db.cache = [{
      cache_key: "sky-WRO-BCN-2026-11-25-2026-11-27",
      flights: [{ price: 500, departureDate: "2026-11-25", returnDate: "2026-11-27" }],
      expires_at: new Date(now + 1000).toISOString(),
    }];
    db.deals = [deal({ price: 100 })];
    const { prices } = await post(body());
    expect(prices[0]).toMatchObject({ price: 500, destination: "BCN" });
    expect(prices[0].source).toBeUndefined();
    expect(db.dealQueries).toBe(0);
  });

  it("returns null (no amount) when nothing matches or the data is stale", async () => {
    db.deals = [deal({ city_code: "ATH", city_name: "Ateny" })];
    expect((await post(body())).prices).toEqual([null]);
    db.deals = [deal({ fetched_at: "2026-11-01T00:00:00Z" })];
    expect((await post(body())).prices).toEqual([null]);
  });

  it("does not use an older week when the newest week of that airport lacks the city", async () => {
    db.deals = [
      deal({ week: "2026-W46", price: 99, fetched_at: "2026-11-12T18:00:00Z", departure_at: "2026-11-21T06:00:00+01:00" }),
      deal({ week: "2026-W47", city_code: "ATH", city_name: "Ateny" }),
    ];
    expect((await post(body())).prices).toEqual([null]);
  });

  it("works for BER and falls back to null on a database error without failing the request", async () => {
    db.deals = [deal({ origin: "BER" })];
    expect((await post(body({ airports: ["BER"] }))).prices[0]).toMatchObject({ origin: "BER", price: 389 });
    db.dealsError = { message: "boom" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post(body())).prices).toEqual([null]);
  });

  it("prices only the cards that match, keeping the card order and a per-person amount for groups", async () => {
    db.deals = [deal()];
    const { prices } = await post(body(
      { companion: "friends", group: { adults: 3, childrenAges: [] } },
      [{ city: "Ateny", country: "Grecja" }, { city: "Barcelona", country: "Hiszpania" }],
    ));
    expect(prices[0]).toBeNull();
    expect(prices[1].price).toBe(389); // nie mnożymy po cichu: kwota z wiersza jest za 1 dorosłego
  });
});
