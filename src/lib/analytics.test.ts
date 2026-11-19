import { describe, expect, it } from "vitest";
import { planGeneratedParams, purchaseAction, purchaseFromSession, rememberPurchase } from "./analytics";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    size: () => map.size,
  };
}

const blocked = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
};

describe("purchaseAction", () => {
  it("sends a new purchase once GA is ready", () => {
    expect(purchaseAction(memoryStorage(), "cs_1", true)).toBe("send");
  });

  it("waits for GA without remembering anything", () => {
    const storage = memoryStorage();
    expect(purchaseAction(storage, "cs_1", false)).toBe("wait");
    expect(storage.size()).toBe(0);
  });

  it("skips a purchase that was already sent", () => {
    const storage = memoryStorage();
    rememberPurchase(storage, "cs_1");
    expect(purchaseAction(storage, "cs_1", true)).toBe("skip");
    expect(purchaseAction(storage, "cs_2", true)).toBe("send");
  });

  it("still sends when storage is blocked or missing", () => {
    expect(purchaseAction(blocked, "cs_1", true)).toBe("send");
    expect(purchaseAction(null, "cs_1", true)).toBe("send");
    expect(() => rememberPurchase(blocked, "cs_1")).not.toThrow();
  });
});

describe("purchaseFromSession", () => {
  const paid = { id: "cs_1", payment_status: "paid", amount_total: 1499, currency: "pln", metadata: { plan_key: "pack_5" } };

  it("maps a paid session to purchase data", () => {
    expect(purchaseFromSession(paid)).toEqual({ id: "cs_1", value: 14.99, currency: "PLN", plan: "pack_5" });
  });

  it("ignores sessions that are complete but not paid yet", () => {
    expect(purchaseFromSession({ ...paid, payment_status: "unpaid" })).toBeNull();
  });

  it("ignores sessions without an amount", () => {
    expect(purchaseFromSession({ ...paid, amount_total: null })).toBeNull();
  });
});

describe("planGeneratedParams", () => {
  it("passes city and days with the group size", () => {
    expect(planGeneratedParams("Rzym", 4, { companion: "solo" })).toEqual({ city: "Rzym", days: 4, group_size: 1 });
  });

  it("derives the size from the companion when no group is given", () => {
    expect(planGeneratedParams("Rzym", 3, { companion: "couple" }).group_size).toBe(2);
    expect(planGeneratedParams("Rzym", 3, { companion: null }).group_size).toBe(1);
  });

  it("prefers an explicit group", () => {
    const quiz = { companion: "friends" as const, group: { adults: 5, childrenAges: [] } };
    expect(planGeneratedParams("Rzym", 3, quiz).group_size).toBe(5);
  });

  it("dopisuje wejście, a bez niego nie dodaje parametrów", () => {
    const entry = { channel: "ig", material: "ig:bio:ekipa" };
    expect(planGeneratedParams("Rzym", 4, { companion: "solo" }, entry)).toEqual({
      city: "Rzym", days: 4, group_size: 1, entry_channel: "ig", entry_material: "ig:bio:ekipa",
    });
    expect(Object.keys(planGeneratedParams("Rzym", 4, { companion: "solo" }, null))).toEqual(["city", "days", "group_size"]);
  });

  it("does not count an infant as a seat", () => {
    const quiz = { companion: "family" as const, group: { adults: 2, childrenAges: [1, 7] } };
    expect(planGeneratedParams("Rzym", 3, quiz).group_size).toBe(3);
  });
});

import { quizGaEventName } from "./analytics";

describe("quizGaEventName", () => {
  it("dodaje prefiks quiz_ do zdarzeń kroków", () => {
    expect(quizGaEventName("step_view")).toBe("quiz_step_view");
    expect(quizGaEventName("step_complete")).toBe("quiz_step_complete");
  });

  it("nie dubluje prefiksu: quiz_complete to quiz_complete, nie quiz_quiz_complete", () => {
    expect(quizGaEventName("quiz_complete")).toBe("quiz_complete");
  });

  it("zdarzenia źródła ruchu zostają from_*, bez prefiksu", () => {
    expect(quizGaEventName("from_ig_ekipa")).toBe("from_ig_ekipa");
  });
});
