// Google Analytics 4 — Consent Mode v2. Zdarzenia lecą tylko do GA, a pełne
// ciasteczka dopiero po zgodzie z bannera (inaczej GA dostaje anonimowe pingi).
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: Params = {}) {
  if (typeof window === "undefined" || !GA_ID || !window.gtag) return;
  window.gtag("event", name, params);
}

export function setAnalyticsConsent(granted: boolean) {
  if (typeof window === "undefined" || !GA_ID || !window.gtag) return;
  window.gtag("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
}
