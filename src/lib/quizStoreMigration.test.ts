import { describe, expect, it, vi } from "vitest";
vi.hoisted(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  });
  Object.defineProperty(globalThis, "window", { value: { localStorage: globalThis.localStorage } });
});
import { useAppStore } from "./store";
import { quizStepAt } from "./quizSteps";

describe("persisted quiz v5", () => {
  it("migrates the step without changing answers, the trip or selected flights", async () => {
    const answers = { companion: "friends", group: { adults: 5, childrenAges: [] }, budget: "medium", styles: ["food"], airports: ["KTW"] };
    const trip = { id: "keep-my-trip" };
    const flightDetails = { departureAirport: "KTW" };
    const selectedDestination = { city: "Madrid" };
    const state = { quizAnswers: answers, currentQuizStep: 4, currentTrip: trip, flightDetails, selectedDestination };
    const migrated = await useAppStore.persist.getOptions().migrate!(state, 4) as typeof state;
    expect(quizStepAt(migrated.currentQuizStep)).toBe("when");
    expect(migrated.quizAnswers).toEqual(answers);
    expect(migrated.currentTrip).toBe(trip);
    expect(migrated.flightDetails).toBe(flightDetails);
    expect(migrated.selectedDestination).toBe(selectedDestination);
    expect(useAppStore.persist.getOptions().version).toBe(5);
  });
  it("retains the older airport and companion migrations", async () => {
    const migrated = await useAppStore.persist.getOptions().migrate!({ quizAnswers: {}, currentQuizStep: 2 }, 1) as { quizAnswers: { airports: string[]; companion: null }; currentQuizStep: number };
    expect(migrated.quizAnswers.airports).toEqual(["WRO"]);
    expect(migrated.quizAnswers.companion).toBeNull();
    expect(quizStepAt(migrated.currentQuizStep)).toBe("vibe");
  });
});
