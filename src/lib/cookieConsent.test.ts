import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConsent, saveConsent, resetConsent } from "./cookieConsent";

afterEach(() => vi.unstubAllGlobals());
describe("cookie consent", () => {
  it("accepts only an explicit accepted or rejected value", () => {
    vi.stubGlobal("localStorage", { getItem: () => "anything" });
    expect(loadConsent()).toBe(null);
    vi.stubGlobal("localStorage", { getItem: () => "accepted" });
    expect(loadConsent()).toBe("accepted");
  });
  it("persists rejection and allows resetting the choice", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("window", { dispatchEvent: () => true });
    vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key), setItem: (key: string, val: string) => data.set(key, val), removeItem: (key: string) => data.delete(key) });
    saveConsent("rejected");
    expect(data.get("cookie_consent")).toBe("rejected");
    expect(loadConsent()).toBe("rejected");
    resetConsent();
    expect(loadConsent()).toBe(null);
  });
  it("does not throw with blocked storage", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } });
    expect(loadConsent()).toBe(null);
    expect(() => saveConsent("accepted")).not.toThrow();
    expect(() => resetConsent()).not.toThrow();
  });
});
