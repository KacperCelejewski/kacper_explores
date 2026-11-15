import { describe, expect, it } from "vitest";
import { adjustPlanBudget, parseActivityCost, shiftBudgetText } from "./budgetAdjust";
import type { DayActivity, TripPlan } from "@/types";

const act = (over: Partial<DayActivity>): DayActivity => ({
  time: "10:00",
  title: "x",
  description: "",
  type: "attraction",
  cost: "Free",
  emoji: "",
  ...over,
});

const plan = (activities: DayActivity[]): TripPlan => ({
  city: "Porto",
  country: "Portugalia",
  duration: 1,
  totalBudgetEstimate: "1200-1500 PLN",
  budgetBreakdown: {
    flights: "Sprawdź w wyszukiwarce",
    accommodation: "300-400 PLN",
    food: "200-250 PLN",
    attractions: "100-150 PLN",
  },
  generalTips: [],
  days: [{ day: 1, date: "Dzień 1", theme: "t", activities }],
});

describe("parseActivityCost", () => {
  it("treats free markers as zero", () => {
    expect(parseActivityCost("Free")).toBe(0);
    expect(parseActivityCost("Za darmo")).toBe(0);
    expect(parseActivityCost("0 PLN")).toBe(0);
  });
  it("reads amounts and range midpoints in PLN", () => {
    expect(parseActivityCost("~15 PLN")).toBe(15);
    expect(parseActivityCost("20-30 PLN")).toBe(25);
    expect(parseActivityCost("1 200 PLN")).toBe(1200);
  });
  it("returns null for unknown or foreign-currency costs", () => {
    expect(parseActivityCost("zależy")).toBeNull();
    expect(parseActivityCost("12 EUR")).toBeNull();
    expect(parseActivityCost("")).toBeNull();
  });
});

describe("shiftBudgetText", () => {
  it("shifts both ends of a range and never goes below zero", () => {
    expect(shiftBudgetText("1200-1500 PLN", 100)).toBe("1 300–1 600 PLN");
    expect(shiftBudgetText("100-150 PLN", -120)).toBe("0–30 PLN");
  });
  it("leaves text without numbers untouched", () => {
    expect(shiftBudgetText("Sprawdź w wyszukiwarce", 100)).toBe("Sprawdź w wyszukiwarce");
  });
});

describe("adjustPlanBudget", () => {
  it("adds the cost of a new paid attraction to attractions and total", () => {
    const before = plan([act({})]);
    const after = plan([act({}), act({ cost: "~100 PLN" })]);
    const out = adjustPlanBudget(before, after);

    expect(out.totalBudgetEstimate).toBe("1 300–1 600 PLN");
    expect(out.budgetBreakdown.attractions).toBe("200–250 PLN");
    expect(out.budgetBreakdown.food).toBe("200-250 PLN");
  });

  it("routes food to food and transport only to the total", () => {
    const before = plan([]);
    const after = plan([act({ type: "food", cost: "40 PLN" }), act({ type: "transport", cost: "10 PLN" })]);
    const out = adjustPlanBudget(before, after);

    expect(out.budgetBreakdown.food).toBe("240–290 PLN");
    expect(out.budgetBreakdown.attractions).toBe("100-150 PLN");
    expect(out.totalBudgetEstimate).toBe("1 250–1 550 PLN");
  });

  it("lowers the budget when a paid activity is swapped for a free one", () => {
    const before = plan([act({ cost: "50 PLN" })]);
    const after = plan([act({ cost: "Free" })]);

    expect(adjustPlanBudget(before, after).totalBudgetEstimate).toBe("1 150–1 450 PLN");
  });

  it("returns the new plan unchanged when costs are equal", () => {
    const before = plan([act({ cost: "20 PLN" })]);
    const after = plan([act({ title: "inne", cost: "20 PLN" })]);

    expect(adjustPlanBudget(before, after)).toBe(after);
  });

  it("does not mutate its inputs", () => {
    const before = plan([]);
    const after = plan([act({ cost: "100 PLN" })]);
    adjustPlanBudget(before, after);

    expect(after.totalBudgetEstimate).toBe("1200-1500 PLN");
  });
});
