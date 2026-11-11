import { describe, expect, it } from "vitest";
import { purchaseAction, purchaseFromSession, rememberPurchase } from "./analytics";

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
