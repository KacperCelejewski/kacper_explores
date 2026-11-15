"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode, type ComponentProps } from "react";
import { partnerLinkProps, withAffiliateConsent, type PartnerConfig, type PartnerLink, type Placement } from "@/lib/affiliate";
import { loadConsent, subscribeConsent, serverConsent, resetConsent } from "@/lib/cookieConsent";
import { setAnalyticsConsent } from "@/lib/analytics";

const AffiliateContext = createContext<PartnerConfig>({});

export function useCookieConsent() {
  return useSyncExternalStore(subscribeConsent, loadConsent, serverConsent);
}

export function AffiliateProvider({ config, children }: { config: PartnerConfig; children?: ReactNode }) {
  return <AffiliateContext.Provider value={config}>{children}</AffiliateContext.Provider>;
}

export function useAffiliateConfig(): PartnerConfig {
  const config = useContext(AffiliateContext);
  const consent = useCookieConsent();
  return consent === "accepted" ? config : {};
}

// For links prepared by Server Components (e.g. the deals page).
export function AffiliateAnchor({ link, placement, city, children, ...props }: {
  link: PartnerLink; placement: Placement; city: string;
} & Omit<ComponentProps<"a">, "href" | "rel" | "target">) {
  const active = withAffiliateConsent(link, useCookieConsent());
  return (
    <a {...props} {...partnerLinkProps(active, placement, city)}>
      {children}
      {active.paid && <span className="block text-xs font-normal mt-1">link partnerski</span>}
    </a>
  );
}

export function CookieSettingsButton() {
  return <button type="button" className="text-sm underline" style={{ color: "var(--accent)" }} onClick={() => {
    setAnalyticsConsent(false);
    resetConsent();
  }}>Zmień zgodę na cookies</button>;
}
