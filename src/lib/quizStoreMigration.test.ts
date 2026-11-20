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

describe("persisted quiz v6", () => {
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
    expect(useAppStore.persist.getOptions().version).toBe(6);
  });
  it("v5 -> v6: zapisany krok wskazuje to samo pytanie po dodaniu transportu, odpowiedzi bez zmian", async () => {
    const answers = { companion: "solo", styles: [], airports: ["KRK"], month: 6, duration: 3 };
    const migrate = useAppStore.persist.getOptions().migrate!;
    // w v5 indeks 3 = "when", w v6 jest to indeks 4
    const when = await migrate({ quizAnswers: { ...answers }, currentQuizStep: 3 }, 5) as { currentQuizStep: number; quizAnswers: unknown };
    expect(quizStepAt(when.currentQuizStep)).toBe("when");
    expect(when.quizAnswers).toEqual(answers);
    const budget = await migrate({ quizAnswers: {}, currentQuizStep: 5 }, 5) as { currentQuizStep: number };
    expect(quizStepAt(budget.currentQuizStep)).toBe("budget");
    // zapis już w v6 zostaje bez zmian
    const same = await migrate({ quizAnswers: {}, currentQuizStep: 4 }, 6) as { currentQuizStep: number };
    expect(same.currentQuizStep).toBe(4);
  });
  it("retains the older airport and companion migrations", async () => {
    const migrated = await useAppStore.persist.getOptions().migrate!({ quizAnswers: {}, currentQuizStep: 2 }, 1) as { quizAnswers: { airports: string[]; companion: null }; currentQuizStep: number };
    expect(migrated.quizAnswers.airports).toEqual(["WRO"]);
    expect(migrated.quizAnswers.companion).toBeNull();
    expect(quizStepAt(migrated.currentQuizStep)).toBe("vibe");
  });
});

describe("quiz: region, rodzaj wyjazdu, transport w zapisanym stanie", () => {
  const migrate = (state: unknown, version: number) => useAppStore.persist.getOptions().migrate!(state, version) as Promise<{ quizAnswers: Record<string, unknown> }> | { quizAnswers: Record<string, unknown> };

  it("stary zapis bez nowych pól zostaje bez zmian (nie dostaje nowych kluczy)", async () => {
    const answers = { budget: "low", styles: ["food"], airports: ["WRO"], companion: "solo", month: 6, duration: 3 };
    const migrated = await migrate({ quizAnswers: { ...answers }, currentQuizStep: 0 }, 5);
    expect(migrated.quizAnswers).toEqual(answers);
    expect(Object.keys(migrated.quizAnswers)).not.toContain("regions");
    expect(Object.keys(migrated.quizAnswers)).not.toContain("tripType");
    expect(Object.keys(migrated.quizAnswers)).not.toContain("transport");
  });

  it("zapis z nowymi polami zachowuje je", async () => {
    const answers = { budget: "low", styles: [], airports: ["WRO"], regions: ["europa"], tripType: "narty", transport: ["auto"] };
    const migrated = await migrate({ quizAnswers: { ...answers }, currentQuizStep: 0 }, 5);
    expect(migrated.quizAnswers).toEqual(answers);
  });

  it("domyślny stan quizu nie ma nowych pól, a ich ustawienie czyści cache kierunków", () => {
    const { quizAnswers, setQuizAnswer, setCachedDestinations } = useAppStore.getState();
    expect(quizAnswers.regions).toBeUndefined();
    expect(quizAnswers.tripType).toBeUndefined();
    expect(quizAnswers.transport).toBeUndefined();
    setCachedDestinations("k", []);
    expect(useAppStore.getState().cachedDestinations).not.toBeNull();
    setQuizAnswer("tripType", "narty");
    expect(useAppStore.getState().quizAnswers.tripType).toBe("narty");
    expect(useAppStore.getState().cachedDestinations).toBeNull();
    useAppStore.getState().resetQuiz();
    expect(useAppStore.getState().quizAnswers.tripType).toBeUndefined();
  });
});
