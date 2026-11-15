import { beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  });
});

import { useAppStore } from "./store";
import type { DayActivity, Trip } from "@/types";

const free: DayActivity = { time: "10:00", title: "Park", description: "", type: "attraction", cost: "Free", emoji: "" };
const paid: DayActivity = { ...free, title: "Muzeum", cost: "100 PLN" };

const trip: Trip = {
  id: "t1",
  createdAt: "2026-11-15",
  destination: {} as Trip["destination"],
  quizAnswers: {} as Trip["quizAnswers"],
  plan: {
    city: "Porto",
    country: "Portugalia",
    duration: 1,
    totalBudgetEstimate: "1200-1500 PLN",
    budgetBreakdown: { flights: "", accommodation: "", food: "", attractions: "100-150 PLN" },
    generalTips: [],
    days: [{ day: 1, date: "Dzień 1", theme: "t", activities: [free] }],
  },
};

describe("trip mutations keep the header budget in step", () => {
  beforeEach(() => useAppStore.getState().setCurrentTrip(trip));

  it("adds a paid activity to the total", () => {
    useAppStore.getState().addTripActivity(0, paid);
    expect(useAppStore.getState().currentTrip?.plan?.totalBudgetEstimate).toBe("1 300–1 600 PLN");
  });

  it("applies a swap to the total", () => {
    useAppStore.getState().updateTripActivity(0, 0, paid);
    expect(useAppStore.getState().currentTrip?.plan?.budgetBreakdown.attractions).toBe("200–250 PLN");
  });

  it("applies a regenerated day to the total", () => {
    useAppStore.getState().updateTripDay(0, { day: 1, date: "Dzień 1", theme: "n", activities: [paid, paid] });
    expect(useAppStore.getState().currentTrip?.plan?.totalBudgetEstimate).toBe("1 400–1 700 PLN");
  });
});
