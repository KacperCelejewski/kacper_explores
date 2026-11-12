import { describe, expect, it } from "vitest";
import { FREE_PLANS_PER_MONTH, currentPeriod, freePlansLeft, plansAvailable } from "./credits";

describe("currentPeriod", () => {
  it("returns the first day of the month in Warsaw time", () => {
    expect(currentPeriod(new Date("2026-11-12T10:00:00Z"))).toBe("2026-11-01");
  });

  it("switches month at Warsaw midnight, not UTC", () => {
    // 23:30 UTC 30 listopada to już 00:30 1 grudnia w Warszawie (CET)
    expect(currentPeriod(new Date("2026-11-30T23:30:00Z"))).toBe("2026-12-01");
    expect(currentPeriod(new Date("2026-11-30T22:30:00Z"))).toBe("2026-11-01");
  });

  it("handles summer time", () => {
    // 22:30 UTC 31 lipca to 00:30 1 sierpnia w Warszawie (CEST)
    expect(currentPeriod(new Date("2026-07-31T22:30:00Z"))).toBe("2026-08-01");
  });
});

describe("freePlansLeft", () => {
  const now = new Date("2026-11-12T10:00:00Z");

  it("gives the full allowance when nothing was used yet", () => {
    expect(freePlansLeft({ free_plans_used: 0, free_plans_period: null }, now)).toBe(FREE_PLANS_PER_MONTH);
  });

  it("subtracts plans used in the current month", () => {
    expect(freePlansLeft({ free_plans_used: 1, free_plans_period: "2026-11-01" }, now)).toBe(1);
    expect(freePlansLeft({ free_plans_used: 2, free_plans_period: "2026-11-01" }, now)).toBe(0);
  });

  it("renews in a new month", () => {
    expect(freePlansLeft({ free_plans_used: 2, free_plans_period: "2026-10-01" }, now)).toBe(FREE_PLANS_PER_MONTH);
  });

  it("never goes below zero", () => {
    expect(freePlansLeft({ free_plans_used: 7, free_plans_period: "2026-11-01" }, now)).toBe(0);
  });

  it("treats columns missing before the migration as unused", () => {
    expect(freePlansLeft({}, now)).toBe(FREE_PLANS_PER_MONTH);
  });
});

describe("plansAvailable", () => {
  const now = new Date("2026-11-12T10:00:00Z");

  it("adds purchased and legacy credits to the monthly plans", () => {
    expect(plansAvailable({ credits_remaining: 3, free_plans_used: 1, free_plans_period: "2026-11-01" }, now)).toBe(4);
  });

  it("is zero only when both are spent", () => {
    expect(plansAvailable({ credits_remaining: 0, free_plans_used: 2, free_plans_period: "2026-11-01" }, now)).toBe(0);
  });

  it("keeps credits when the monthly plans are gone", () => {
    expect(plansAvailable({ credits_remaining: 5, free_plans_used: 2, free_plans_period: "2026-11-01" }, now)).toBe(5);
  });
});
