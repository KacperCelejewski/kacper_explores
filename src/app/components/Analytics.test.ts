import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ consent: null as "accepted" | "rejected" | null }));
vi.mock("react", async (original) => ({ ...await original<typeof import("react")>(), useEffect: () => {} }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("./AffiliateProvider", () => ({ useCookieConsent: () => state.consent }));
vi.mock("@/lib/analytics", () => ({ GA_ID: "G-TEST", trackEvent: vi.fn(), setAnalyticsConsent: vi.fn() }));
import Analytics from "./Analytics";

beforeEach(() => { state.consent = null; });
describe("Analytics script loading", () => {
  it.each([null, "rejected"] as const)("renders no Google scripts with %s consent", (consent) => {
    state.consent = consent;
    expect(Analytics()).toBeNull();
  });
  it("renders Google scripts after explicit acceptance", () => {
    state.consent = "accepted";
    expect(Analytics()).not.toBeNull();
  });
});
