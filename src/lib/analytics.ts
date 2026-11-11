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

// Dane zdarzenia purchase z sesji Stripe; tylko dla opłaconych (status "complete" bywa przed zaksięgowaniem).
export function purchaseFromSession(session: {
  id: string;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  metadata?: Record<string, string> | null;
}): { id: string; value: number; currency: string; plan: string } | null {
  if (session.payment_status !== "paid" || session.amount_total == null) return null;
  return {
    id: session.id,
    value: session.amount_total / 100,
    currency: (session.currency ?? "pln").toUpperCase(),
    plan: session.metadata?.plan_key ?? "unknown",
  };
}
