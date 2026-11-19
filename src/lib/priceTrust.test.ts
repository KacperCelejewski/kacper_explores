import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  FRESH_DEAL_MAX_AGE_DAYS, PLAN_TOTAL_LABEL, PLAN_TOTAL_NOTE, budgetComparison, dealsPriceNote, isFreshDeal, plannedUpperBound,
} from "./priceTrust";
import { FORBIDDEN_COPY } from "./homeCopy";

const now = Date.parse("2026-11-19T12:00:00Z");
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();

describe("isFreshDeal", () => {
  it("fresh within the allowed age, stale after, never from the future", () => {
    expect(isFreshDeal({ price: 300, fetched_at: daysAgo(2) }, now)).toBe(true);
    expect(isFreshDeal({ price: 300, fetched_at: daysAgo(FRESH_DEAL_MAX_AGE_DAYS) }, now)).toBe(true);
    expect(isFreshDeal({ price: 300, fetched_at: daysAgo(FRESH_DEAL_MAX_AGE_DAYS + 1) }, now)).toBe(false);
    expect(isFreshDeal({ price: 300, fetched_at: daysAgo(-1) }, now)).toBe(false);
  });
  it("needs a real amount and a parseable date", () => {
    for (const price of [0, -5, NaN, Infinity]) expect(isFreshDeal({ price, fetched_at: daysAgo(1) }, now)).toBe(false);
    expect(isFreshDeal({ price: 300 }, now)).toBe(false);
    expect(isFreshDeal({ price: 300, fetched_at: "nie-data" }, now)).toBe(false);
  });
});

describe("dealsPriceNote", () => {
  it("says nothing without deals (no invented note)", () => {
    expect(dealsPriceNote([], now)).toBeNull();
  });
  it("dates the prices and marks them as orientation", () => {
    const note = dealsPriceNote([{ price: 300, fetched_at: daysAgo(2) }], now)!;
    expect(note).toContain("17 listopada");
    expect(note).toMatch(/orientacyjne/);
    expect(note).toMatch(/nie z rezerwacji na żywo/);
  });
  it("uses the OLDEST date, so a mixed list is not presented as fresher", () => {
    const note = dealsPriceNote([{ price: 1, fetched_at: daysAgo(1) }, { price: 2, fetched_at: daysAgo(5) }], now)!;
    expect(note).toContain("14 listopada");
  });
  it("warns when older than a week", () => {
    expect(dealsPriceNote([{ price: 1, fetched_at: daysAgo(12) }], now)).toMatch(/sprzed ponad tygodnia/);
  });
  it("does not claim a date when one is missing or broken", () => {
    for (const f of [undefined, "zepsute"]) {
      const note = dealsPriceNote([{ price: 1, fetched_at: f }], now)!;
      expect(note).toMatch(/bez podanej daty/);
      expect(note).not.toMatch(/listopada/);
    }
  });
  it("keeps the brand voice (no exclamation, no forbidden copy)", () => {
    for (const d of [1, 12]) {
      const note = dealsPriceNote([{ price: 1, fetched_at: daysAgo(d) }], now)!;
      expect(note).not.toContain("!");
      for (const pattern of FORBIDDEN_COPY) expect(note).not.toMatch(pattern);
    }
  });
});

describe("plan budget copy", () => {
  it("labels the estimate as excluding flights and says flights must be added", () => {
    expect(PLAN_TOTAL_LABEL).toMatch(/bez lotów/);
    expect(PLAN_TOTAL_NOTE).toMatch(/Lotu tu nie wliczamy/);
    expect(PLAN_TOTAL_LABEL + PLAN_TOTAL_NOTE).not.toContain("!");
  });
  it("plan and shared plan show the new label, not the old 'całkowity koszt'", () => {
    for (const file of ["src/app/plan/[tripId]/page.tsx", "src/app/share/[tripId]/ShareClient.tsx"]) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("PLAN_TOTAL_LABEL");
      expect(src).toContain("PLAN_TOTAL_NOTE");
      expect(src).not.toContain("Szacowany całkowity koszt");
    }
  });
  it("FlightCard no longer claims 'z ostatnich wyszukiwań' without a date", () => {
    const src = readFileSync("src/app/components/PartnerLinks.tsx", "utf8");
    expect(src).not.toContain("z ostatnich wyszukiwań");
    expect(src).toContain("bez daty sprawdzenia");
  });
  it("deal pages use the dated note instead of the static 'z ostatnich dni'", () => {
    for (const file of ["src/app/okazje/page.tsx", "src/app/okazje/[lotnisko]/page.tsx", "src/app/weekend/[miasto]/page.tsx", "src/app/components/DealsStrip.tsx"]) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("dealsPriceNote");
      expect(src).not.toContain("z ostatnich dni");
    }
  });
});

describe("plannedUpperBound / budgetComparison", () => {
  it("takes the upper end of a range", () => {
    expect(plannedUpperBound("1 200–1 500 PLN")).toBe(1500);
    expect(plannedUpperBound("ok. 1200 zł")).toBe(1200);
    expect(plannedUpperBound("Sprawdź w wyszukiwarce")).toBe(0);
  });
  it("does not count money spent on flights against the estimate that excludes flights", () => {
    const r = budgetComparison({ flights: 600, food: 100, accommodation: 300 }, "1200–1500 PLN");
    expect(r.totalSpent).toBe(1000);
    expect(r.comparable).toBe(400);
    expect(r.overBudget).toBe(false);
    expect(r.diff).toBe(400 - 1500);
  });
  it("still flags real overspend on the ground", () => {
    expect(budgetComparison({ food: 1600 }, "1200–1500 PLN").overBudget).toBe(true);
  });
});
