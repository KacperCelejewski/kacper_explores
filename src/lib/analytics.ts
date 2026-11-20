import { loadConsent } from "./cookieConsent";
import type { QuizAnswers } from "@/types";
import { groupFromCompanion, groupSize } from "./group";
import { entryEventParams, type EntryAttribution } from "./entryAttribution";
import { normalizeFoundation } from "./quizOptions";

// Google Analytics 4 — skrypt i zdarzenia dopiero po wyraźnej zgodzie z banera.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type Params = Record<string, string | number | boolean | Array<Record<string, string | number>> | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// Zdarzenia z chwili, gdy skrypt GA jeszcze się nie załadował (np. lądowanie od razu na /quiz po wcześniejszej zgodzie),
// czekają w pamięci do gotowości gtag. Zgodę sprawdzamy ponownie przy wysyłce.
const pending: Array<[string, Params]> = [];
const MAX_PENDING = 30;

export function trackEvent(name: string, params: Params = {}) {
  if (typeof window === "undefined" || !GA_ID || loadConsent() !== "accepted") return;
  if (!window.gtag) {
    if (pending.length < MAX_PENDING) pending.push([name, params]);
    return;
  }
  window.gtag("event", name, params);
}

export function flushPendingEvents() {
  const queued = pending.splice(0);
  for (const [name, params] of queued) trackEvent(name, params);
}

// Nazwa zdarzenia quizu w GA4. Kroki dostają prefiks quiz_, ale quiz_complete i from_* zostają bez zmian.
// Do 2026-11-15 quiz_complete szło jako "quiz_quiz_complete" (a from_* jako "quiz_from_*"); w raportach
// historycznych traktuj te nazwy jako to samo zdarzenie. /api/track zapisuje nazwy bez prefiksu.
export function quizGaEventName(event: string): string {
  return event.startsWith("quiz_") || event.startsWith("from_") ? event : `quiz_${event}`;
}

export function setAnalyticsConsent(granted: boolean) {
  if (typeof window === "undefined" || !GA_ID) return;
  // Zablokowany zapis zgody nie może ponownie włączyć skryptu obecnego w pamięci.
  const enabled = granted && loadConsent() === "accepted";
  Object.assign(window, { [`ga-disable-${GA_ID}`]: !enabled });
  if (!window.gtag) return;
  window.gtag("consent", "update", { analytics_storage: enabled ? "granted" : "denied" });
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

// Parametry zdarzeń z odpowiedzi quizu: region, rodzaj wyjazdu, transport. Same klucze techniczne z zamkniętej
// listy (np. "europa,azja"), bez danych osobowych i bez tekstu wpisanego przez użytkownika. Brak odpowiedzi
// nie dopisuje parametru, więc zdarzenia starego quizu wyglądają jak dotąd.
// W GA4 trzeba je zarejestrować jako wymiary własne (zakres: zdarzenie): quiz_regions, quiz_trip_type, quiz_transport.
export function quizFoundationParams(
  quiz: Pick<QuizAnswers, "regions" | "tripType" | "transport">,
): { quiz_regions?: string; quiz_trip_type?: string; quiz_transport?: string } {
  const { regions, tripType, transport } = normalizeFoundation(quiz);
  return {
    ...(regions ? { quiz_regions: regions.join(",") } : {}),
    ...(tripType ? { quiz_trip_type: tripType } : {}),
    ...(transport ? { quiz_transport: transport.join(",") } : {}),
  };
}

// Parametry zdarzenia plan_generated; tylko liczba miejsc, bez danych osobowych.
export function planGeneratedParams(
  city: string,
  days: number,
  quiz: Pick<QuizAnswers, "companion" | "group"> & Partial<Pick<QuizAnswers, "regions" | "tripType" | "transport">>,
  entry?: EntryAttribution | null,
) {
  return { city, days, group_size: groupSize(groupFromCompanion(quiz.companion, quiz.group)), ...quizFoundationParams(quiz), ...entryEventParams(entry) };
}
