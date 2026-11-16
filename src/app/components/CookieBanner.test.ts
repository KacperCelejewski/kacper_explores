import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";

const state = vi.hoisted(() => ({ consent: null as "accepted" | "rejected" | null }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: () => {},
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock("./AffiliateProvider", () => ({ useCookieConsent: () => state.consent }));
vi.mock("@/lib/cookieConsent", () => ({ saveConsent: vi.fn(), subscribeConsent: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ setAnalyticsConsent: vi.fn() }));

import CookieBanner from "./CookieBanner";
import { saveConsent } from "@/lib/cookieConsent";
import { setAnalyticsConsent } from "@/lib/analytics";

type ButtonProps = { children: string; style: Record<string, unknown>; type: string; onClick: () => void; autoFocus?: boolean; "aria-pressed"?: boolean };
function buttons(node: ReactNode): ButtonProps[] {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  if (node.type === "button") return [node.props as ButtonProps];
  return buttons(node.props.children);
}

beforeEach(() => { state.consent = null; vi.clearAllMocks(); });

describe("CookieBanner", () => {
  it("gives both choices identical dimensions, weight and contrast, and a 44px target", () => {
    const [accept, reject] = buttons(CookieBanner());
    expect([accept.children, reject.children]).toEqual(["Akceptuj wszystkie", "Tylko niezbędne"]);
    expect(accept.style).toEqual(reject.style);
    expect(accept.style.minHeight).toBeGreaterThanOrEqual(44);
    expect(accept.style.flex).toBe("1 1 0");
    expect(accept.type).toBe("button");
    expect(reject.type).toBe("button");
    for (const choice of [accept, reject]) {
      expect(choice.autoFocus).not.toBe(true);
      expect(choice["aria-pressed"]).not.toBe(true);
    }
    expect(saveConsent).not.toHaveBeenCalled();
  });

  it("saves explicit acceptance and grants analytics only on click", () => {
    buttons(CookieBanner())[0].onClick();
    expect(saveConsent).toHaveBeenCalledWith("accepted");
    expect(setAnalyticsConsent).toHaveBeenCalledWith(true);
  });

  it("saves rejection and denies analytics", () => {
    buttons(CookieBanner())[1].onClick();
    expect(saveConsent).toHaveBeenCalledWith("rejected");
    expect(setAnalyticsConsent).toHaveBeenCalledWith(false);
  });

  it.each(["accepted", "rejected"] as const)("hides after a saved %s choice", (consent) => {
    state.consent = consent;
    expect(buttons(CookieBanner())).toEqual([]);
  });
});
