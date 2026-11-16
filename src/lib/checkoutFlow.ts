import { safeNextPath } from "./safeRedirect";

const GENERIC_ERROR = "Płatność się nie otworzyła. Spróbuj jeszcze raz — zwykle działa za drugim.";

/** In-app path or null: never lets a return link point at another host. */
export function safeReturnPath(value: unknown): string | null {
  const path = safeNextPath(value, "");
  return path === "" ? null : path;
}

/** Stripe success_url; carries the plan to go back to, unless they started from pricing. */
export function successUrl(appUrl: string, returnTo: string | null): string {
  const base = `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
  return returnTo && returnTo !== "/pricing" ? `${base}&return=${encodeURIComponent(returnTo)}` : base;
}

/** User-facing line for a failed checkout call. Server details are shown only for 4xx (our own messages). */
export function checkoutErrorMessage(status: number, body: { error?: unknown } | null): string {
  if (status >= 400 && status < 500 && typeof body?.error === "string" && body.error) return body.error;
  return GENERIC_ERROR;
}

/**
 * Zdarzenie GA4 po odpowiedzi /api/checkout. begin_checkout liczymy dopiero, gdy istnieje sesja Stripe
 * (wcześniej leciało przy każdym kliknięciu, także bez logowania i przy błędach, stąd 17 zdarzeń wobec 2 sesji).
 */
export function checkoutTrackingEvent(
  status: number,
  body: { url?: unknown; error?: unknown } | null,
): "begin_checkout" | "checkout_login_required" | null {
  if (status === 401) return "checkout_login_required";
  if (status >= 200 && status < 300 && typeof body?.url === "string" && body.url) return "begin_checkout";
  return null;
}

/**
 * Informacja przy przycisku płatności w oknie Stripe (custom_text.submit.message, limit 1200 znaków).
 * Odpowiada regulaminowi §4-§5; zmieniając jedno, zmień drugie. To informacja, nie zgoda: osobne pole
 * zgody wymaga adresu regulaminu w ustawieniach Stripe (zadanie właściciela).
 */
export const PURCHASE_NOTICE =
  "Plany pojawią się na koncie zaraz po płatności. Masz 14 dni na odstąpienie od umowy, ale gdy wygenerujesz plan z Packa albo na Pro, zaczynamy ją wykonywać i prawo odstąpienia wygasa. Pro odnawia się automatycznie, anulujesz je w profilu. Szczegóły: wloczykij.me/regulamin";
