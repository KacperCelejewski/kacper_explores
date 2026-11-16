import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

async function analytics(consent: string | null) {
  const gtag = vi.fn();
  vi.stubGlobal("window", { gtag });
  vi.stubGlobal("localStorage", { getItem: () => consent });
  return { gtag, ...await import("./analytics") };
}

describe("analytics consent", () => {
  it.each([null, "rejected", "invalid"])("does not send events for %s consent even if GA was previously loaded", async (consent) => {
    const { trackEvent, gtag } = await analytics(consent);
    trackEvent("purchase");
    expect(gtag).not.toHaveBeenCalled();
  });
  it("sends only after explicit acceptance and stops when consent is reset", async () => {
    const { trackEvent, gtag } = await analytics("accepted");
    trackEvent("purchase", { value: 14.99 });
    expect(gtag).toHaveBeenCalledExactlyOnceWith("event", "purchase", { value: 14.99 });
    vi.stubGlobal("localStorage", { getItem: () => null });
    trackEvent("page_view");
    expect(gtag).toHaveBeenCalledTimes(1);
  });
  it("disables an already loaded GA instance when consent is withdrawn", async () => {
    const { setAnalyticsConsent, gtag } = await analytics("accepted");
    setAnalyticsConsent(false);
    expect(Reflect.get(window, "ga-disable-G-TEST")).toBe(true);
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", { analytics_storage: "denied" });
    setAnalyticsConsent(true);
    expect(Reflect.get(window, "ga-disable-G-TEST")).toBe(false);
  });
  it("does not enable a loaded GA instance if saving acceptance failed", async () => {
    const { setAnalyticsConsent, gtag } = await analytics(null);
    setAnalyticsConsent(true);
    expect(Reflect.get(window, "ga-disable-G-TEST")).toBe(true);
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", { analytics_storage: "denied" });
  });
  it("blocks events if storage becomes unavailable", async () => {
    const { trackEvent, gtag } = await analytics("accepted");
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); } });
    trackEvent("page_view");
    expect(gtag).not.toHaveBeenCalled();
  });
});
