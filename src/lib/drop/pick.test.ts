import { describe, it, expect } from "vitest";
import { pickDealsFor } from "./pick";
import type { DropDeal, DropSubscriber } from "./types";

function deal(origin: string, city: string, price: number): DropDeal {
  return {
    week: "2026-W46", origin, city_code: city, city_name: city, price,
    departure_at: "2026-11-13T19:05:00+01:00", return_at: "2026-11-15T20:00:00+01:00",
    airline: "FR", transfers: 0, link: "/search/x", fetched_at: "2026-11-11T21:00:00Z",
  };
}

const sub = (airports: string[], max_price: number): DropSubscriber => ({
  id: "1", email: "a@b.pl", airports, max_price, unsubscribe_token: "t",
});

describe("pickDealsFor", () => {
  it("filtruje po lotnisku i budżecie", () => {
    const r = pickDealsFor(sub(["WRO"], 300), [
      deal("WRO", "BCN", 250), deal("KRK", "ROM", 100), deal("WRO", "LIS", 400),
    ]);
    expect(r.map((d) => d.city_code)).toEqual(["BCN"]);
  });

  it("zwraca maksymalnie 3, rosnąco po cenie", () => {
    const r = pickDealsFor(sub(["WRO"], 500), [
      deal("WRO", "A", 400), deal("WRO", "B", 100), deal("WRO", "C", 300),
      deal("WRO", "D", 200),
    ]);
    expect(r.map((d) => d.price)).toEqual([100, 200, 300]);
  });

  it("jedno miasto z dwóch lotnisk daje jedną okazję, tańszą", () => {
    const r = pickDealsFor(sub(["WRO", "KTW"], 500), [
      deal("WRO", "MIL", 260), deal("KTW", "MIL", 230),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].origin).toBe("KTW");
    expect(r[0].price).toBe(230);
  });

  it("nic nie pasuje: pusta lista", () => {
    expect(pickDealsFor(sub(["WRO"], 200), [deal("WRO", "BCN", 250)])).toEqual([]);
  });

  it("cena równa max_price przechodzi", () => {
    expect(pickDealsFor(sub(["WRO"], 250), [deal("WRO", "BCN", 250)])).toHaveLength(1);
  });
});
