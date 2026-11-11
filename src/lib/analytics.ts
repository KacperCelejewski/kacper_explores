// Google Analytics 4 — Consent Mode v2. Zdarzenia lecą tylko do GA, a pełne
// ciasteczka dopiero po zgodzie z bannera (inaczej GA dostaje anonimowe pingi).
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type Params = Record<string, string | number | boolean | Array<Record<string, string | number>> | undefined>;

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

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

const purchaseKey = (transactionId: string) => `purchase_sent_${transactionId}`;

// "wait": GA jeszcze się nie załadował (trackEvent po cichu by nic nie zrobił), "skip": już wysłane.
export function purchaseAction(
  storage: KeyValueStorage | null,
  transactionId: string,
  gtagReady: boolean,
): "send" | "wait" | "skip" {
  if (!gtagReady) return "wait";
  try {
    if (storage?.getItem(purchaseKey(transactionId))) return "skip";
  } catch { /* storage zablokowany: traktujemy jak niewysłane */ }
  return "send";
}

export function rememberPurchase(storage: KeyValueStorage | null, transactionId: string) {
  try { storage?.setItem(purchaseKey(transactionId), "1"); } catch { /* storage zablokowany */ }
}
