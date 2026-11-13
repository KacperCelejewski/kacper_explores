import { describe, expect, it } from "vitest";
import { bestPerOrigin } from "./read";
import type { DropDeal } from "./types";

const deal = (origin: string, price: number): DropDeal => ({
  week: "2026-W47", origin, city_code: "LIS", city_name: "Lizbona", price,
  departure_at: "2026-11-20T10:00:00+01:00", return_at: "2026-11-22T20:00:00+01:00",
  airline: "FR", transfers: 0, link: "", duration_to: null, duration_back: null, fetched_at: "2026-11-13T00:00:00Z",
});

describe("bestPerOrigin", () => {
  it("zostawia najtańszą ofertę z każdego lotniska i sortuje rosnąco", () => {
    const out = bestPerOrigin([deal("WRO", 500), deal("WRO", 420), deal("KRK", 380)]);
    expect(out.map((d) => [d.origin, d.price])).toEqual([["KRK", 380], ["WRO", 420]]);
  });
  it("dla pustej listy zwraca pustą", () => {
    expect(bestPerOrigin([])).toEqual([]);
  });
});
