import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCities, fetchWeekendOffers, groupDeals, mergeVariants } from "./deals";
import type { CityInfo, TpOffer, WeekendVariant } from "./types";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const ptNd:WeekendVariant = { label: "pt-nd", depart: "2026-11-13", return: "2026-11-15" };
const czwNd: WeekendVariant = { label: "czw-nd", depart: "2026-11-12", return: "2026-11-15" };

const cities = new Map<string, CityInfo>([
  ["MIL", { code: "MIL", name: "Mediolan", country_code: "IT" }],
  ["GDN", { code: "GDN", name: "Gdańsk", country_code: "PL" }],
]);

function offer(over: Partial<TpOffer> = {}): TpOffer {
  return {
    origin: "WRO",
    destination: "MIL",
    price: 201,
    airline: "FR",
    departure_at: "2026-11-13T18:35:00+01:00",
    return_at: "2026-11-15T08:25:00+01:00",
    transfers: 0,
    return_transfers: 0,
    link: "/search/WRO1311MIL15111?t=abc",
    ...over,
  };
}

const group = (offers: TpOffer[], v = ptNd) =>
  groupDeals(offers, v, cities, "2026-W46", "2026-11-11T21:00:00Z");

describe("groupDeals", () => {
  it("keeps the cheapest offer per origin and destination", () => {
    const deals = group([offer({ price: 260 }), offer({ price: 201 })]);
    expect(deals).toHaveLength(1);
    expect(deals[0].price).toBe(201);
  });

  it("rejects domestic destinations", () => {
    expect(group([offer({ destination: "GDN" })])).toEqual([]);
  });

  it("rejects offers with more than one transfer in either direction", () => {
    expect(group([offer({ transfers: 2 })])).toEqual([]);
    expect(group([offer({ return_transfers: 2 })])).toEqual([]);
  });

  it("rejects destinations missing from the city map", () => {
    expect(group([offer({ destination: "XXX" })])).toEqual([]);
  });

  it("rejects offers whose local dates differ from the variant", () => {
    expect(group([offer({ departure_at: "2026-11-14T08:00:00+01:00" })])).toEqual([]);
    expect(group([offer({ return_at: "2026-11-16T08:00:00+01:00" })])).toEqual([]);
  });

  it("fills city name, week and fetched_at", () => {
    const [d] = group([offer()]);
    expect(d).toMatchObject({
      city_code: "MIL",
      city_name: "Mediolan",
      week: "2026-W46",
      fetched_at: "2026-11-11T21:00:00Z",
      origin: "WRO",
      price: 201,
    });
  });
});

describe("mergeVariants", () => {
  it("keeps the cheapest deal per origin and city across variants", () => {
    const a = group([offer({ price: 201 })], ptNd);
    const b = group(
      [offer({ price: 189, departure_at: "2026-11-12T18:35:00+01:00" })],
      czwNd,
    );
    const merged = mergeVariants([...a, ...b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].price).toBe(189);
  });
});

const res = (status: number, body: unknown = {}) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("fetchWeekendOffers", () => {
  it("returns data from the third attempt after two 500s", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(res(500))
      .mockResolvedValueOnce(res(500))
      .mockResolvedValueOnce(res(200, { success: true, data: [offer()] }));
    const out = await fetchWeekendOffers("WRO", ptNd, "tok", f as unknown as typeof fetch, 0);
    expect(out).toHaveLength(1);
    expect(f).toHaveBeenCalledTimes(3);
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain("origin=WRO&departure_at=2026-11-13&return_at=2026-11-15&currency=pln");
  });

  it("returns [] after three failures", async () => {
    const f = vi.fn().mockResolvedValue(res(500));
    expect(await fetchWeekendOffers("WRO", ptNd, "tok", f as unknown as typeof fetch, 0)).toEqual([]);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("retries on network errors", async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new Error("net"))
      .mockResolvedValueOnce(res(200, { data: [offer()] }));
    const out = await fetchWeekendOffers("WRO", ptNd, "tok", f as unknown as typeof fetch, 0);
    expect(out).toHaveLength(1);
  });
});

describe("fetchWeekendOffers resilience", () => {
  it("retries after timeout aborts and passes an abort signal", async () => {
    const abort = () => Object.assign(new Error("aborted"), { name: "AbortError" });
    const f = vi
      .fn()
      .mockRejectedValueOnce(abort())
      .mockRejectedValueOnce(abort())
      .mockResolvedValueOnce(res(200, { data: [offer()] }));
    const out = await fetchWeekendOffers("WRO", ptNd, "tok", f as unknown as typeof fetch, 0);
    expect(out).toHaveLength(1);
    expect(f).toHaveBeenCalledTimes(3);
    expect(f.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("retries on 429", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(res(429))
      .mockResolvedValueOnce(res(200, { data: [offer()] }));
    const out = await fetchWeekendOffers("WRO", ptNd, "tok", f as unknown as typeof fetch, 0);
    expect(out).toHaveLength(1);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("returns [] after one call on other 4xx and warns", async () => {
    const warn = vi.mocked(console.warn);
    const f = vi.fn().mockResolvedValue(res(401));
    expect(await fetchWeekendOffers("WRO", ptNd, "tok", f as unknown as typeof fetch, 0)).toEqual([]);
    expect(f).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("WRO"));
  });
});

describe("fetchCities", () => {
  it("maps codes and skips entries without a Polish name", async () => {
    const f = vi.fn().mockResolvedValue(
      res(200, [
        { code: "MIL", name: "Mediolan", country_code: "IT" },
        { code: "ZZZ", name: null, country_code: "XX" },
      ]),
    );
    const map = await fetchCities(f as unknown as typeof fetch);
    expect(map.get("MIL")).toEqual({ code: "MIL", name: "Mediolan", country_code: "IT" });
    expect(map.has("ZZZ")).toBe(false);
  });
});
