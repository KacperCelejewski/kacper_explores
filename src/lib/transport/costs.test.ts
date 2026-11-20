import { describe, expect, it } from "vitest";
import { buildPlanCostModel } from "@/lib/costModel";
import { planAccessInput, withTravelBudget } from "./plan";
import type { TripPlan } from "@/types";

const basePlan = {
  city: "Praga", country: "Czechy", duration: 3, totalBudgetEstimate: "650-880 PLN",
  budgetBreakdown: { flights: "Sprawdź w wyszukiwarce", accommodation: "300-400 PLN", food: "200-250 PLN", attractions: "100-150 PLN", transport: "50-80 PLN" },
  generalTips: [], days: [],
} as unknown as TripPlan;

const groundPlan = withTravelBudget(basePlan, { transport: ["auto"], airports: ["WRO"] }, "Praga");

const model = (plan: TripPlan) =>
  buildPlanCostModel({ breakdown: plan.budgetBreakdown, totalEstimate: plan.totalBudgetEstimate, people: 1, group: false, now: Date.UTC(2026, 10, 20), ...planAccessInput(plan) });

describe("dojazd lądowy w modelu kosztów (P6 + P9)", () => {
  it("plan lądowy: pozycja Dojazd jest orientacyjna i poza sumą na miejscu, bez pozycji Lot", () => {
    const m = model(groundPlan);
    expect(m.components.some((c) => c.key === "flight")).toBe(false);
    const access = m.components.find((c) => c.key === "access");
    expect(access).toMatchObject({ status: "estimate", statusLabel: "orientacyjnie", inOnSiteTotal: false });
    expect(access?.label).toMatch(/^Dojazd/);
    expect(access?.display).toMatch(/paliwo/);
    expect(access?.display).not.toMatch(/\(szacunek\)/);
  });
  it("plan lądowy: nie jest starszym planem, suma nosi etykietę bez dojazdu i nie ma linii o locie", () => {
    const m = model(groundPlan);
    expect(m.legacy).toBe(false);
    expect(m.onSite.label).toMatch(/bez dojazdu/i);
    expect(m.onSite.note).toMatch(/Bez dojazdu/);
    expect(m.withFlight).toBeNull();
    expect(m.flightLine).toBe("");
  });
  it("rower: pozycja Dojazd jest pokazana mimo braku kwoty (bez opłat za przejazd)", () => {
    const bike = withTravelBudget(basePlan, { transport: ["rower"], airports: ["WRO"] }, "Kłodzko");
    const access = model(bike).components.find((c) => c.key === "access");
    expect(access?.display).toMatch(/bez opłat/);
  });
  it("ceny lotu nie da się wstawić do planu lądowego", () => {
    const m = buildPlanCostModel({
      breakdown: groundPlan.budgetBreakdown, totalEstimate: groundPlan.totalBudgetEstimate, people: 1, group: false,
      now: Date.UTC(2026, 10, 20), flight: { pricePerPerson: 300, checkedAt: Date.UTC(2026, 10, 19), multiplyByGroup: true },
      ...planAccessInput(groundPlan),
    });
    expect(m.withFlight).toBeNull();
    expect(m.components.some((c) => c.key === "flight")).toBe(false);
  });
  it("plan na samolot i plan bez pola transport: model bez zmian (pozycja Lot, brak Dojazdu)", () => {
    expect(planAccessInput(basePlan)).toEqual({ ground: false, access: null });
    const m = model(basePlan);
    expect(m.components.some((c) => c.key === "flight")).toBe(true);
    expect(m.components.some((c) => c.key === "access")).toBe(false);
    expect(m.flightLine).toMatch(/Lot/);
  });
});
