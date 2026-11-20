import { extractBudgetNumbers } from "./group";

/** Weekly cron (Wed evening); a week plus a day of slack before a deal price counts as stale. */
export const FRESH_DEAL_MAX_AGE_DAYS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

interface FetchedDeal { price: number; fetched_at?: string | null }

function fetchedTime(deal: FetchedDeal): number | null {
  const t = deal.fetched_at ? Date.parse(deal.fetched_at) : NaN;
  return Number.isNaN(t) ? null : t;
}

/** A deal price is "fresh" when it is a real amount and was fetched within the allowed age (never in the future). */
export function isFreshDeal(deal: FetchedDeal, now: number): boolean {
  const t = fetchedTime(deal);
  if (!Number.isFinite(deal.price) || deal.price < 1 || t === null) return false;
  return t <= now && now - t <= FRESH_DEAL_MAX_AGE_DAYS * DAY_MS;
}

const dateFmt = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "long" });

/**
 * One honest sentence about where displayed deal prices come from. Uses the OLDEST fetch date among
 * the shown deals, so a mixed list is never presented as fresher than it is. Null when no deals.
 */
export function dealsPriceNote(deals: FetchedDeal[], now: number = Date.now()): string | null {
  if (deals.length === 0) return null;
  const times = deals.map(fetchedTime);
  // brak daty, błędna data albo data z przyszłości (zepsuty zegar, zły wiersz): nie udajemy świeżości
  if (times.some((t) => t === null || t > now)) {
    return "Ceny orientacyjne, z wyszukiwań bez podanej daty, nie z rezerwacji na żywo. Przed zakupem sprawdź aktualną.";
  }
  const oldest = Math.min(...(times as number[]));
  const date = dateFmt.format(oldest);
  if (now - oldest > FRESH_DEAL_MAX_AGE_DAYS * DAY_MS) {
    return `Ceny pobraliśmy ${date}, czyli ponad tydzień temu, nie z rezerwacji na żywo, więc traktuj je jako orientacyjne. Przed zakupem sprawdź aktualną.`;
  }
  return `Ceny orientacyjne, pobrane przez nas ${date} z wyszukiwań, nie z rezerwacji na żywo. Przed zakupem sprawdź aktualną.`;
}

// ── Budżet planu: szacunek bez lotów ──────────────────────────────────────────

export const PLAN_TOTAL_LABEL = "Razem na miejscu (bez lotu)";
export const PLAN_TOTAL_NOTE_SHARED = "Lotu tu nie wliczamy: jego cenę trzeba sprawdzić w wyszukiwarce i doliczyć do kosztów wyjazdu.";
export const PLAN_TOTAL_NOTE = "Lotu tu nie wliczamy. Budżet z quizu obejmuje też lot, więc cenę lotu odejmij od niego, zanim porównasz go z tą kwotą.";
// Plan na auto, pociąg lub bus albo rower: dojazd podajemy osobno jako szacunek z odległości.
export const PLAN_TOTAL_LABEL_GROUND = "Szacunek na miejscu, bez dojazdu";
export const PLAN_TOTAL_NOTE_GROUND = "Dojazdu tu nie wliczamy: jego orientacyjny koszt jest osobno, w pozycji Dojazd. Budżet z quizu obejmuje też dojazd, więc odejmij go od niego, zanim porównasz budżet z tą kwotą.";
export const PLAN_TOTAL_NOTE_SHARED_GROUND = "Dojazdu tu nie wliczamy: jego orientacyjny koszt jest osobno, w pozycji Dojazd, i trzeba go sprawdzić przed wyjazdem.";

/** Upper end of a budget text ("1 200–1 500 PLN" -> 1500); 0 when there is no number. */
export function plannedUpperBound(text: string): number {
  const numbers = extractBudgetNumbers(text);
  return numbers.length ? Math.max(...numbers) : 0;
}

/**
 * Spending vs. plan. The plan estimate excludes flights, so money logged under "flights" is
 * shown but never compared against it (otherwise a ticket alone reads as "over budget").
 */
export function budgetComparison(expenses: Record<string, number>, plannedTotalText: string) {
  const totalSpent = Object.values(expenses).reduce((a, b) => a + b, 0);
  const comparable = totalSpent - (expenses.flights ?? 0);
  const planned = plannedUpperBound(plannedTotalText);
  // Bez odczytanego szacunku (planned = 0) nie ma z czym porównywać, więc nie ma też "powyżej budżetu"
  return { totalSpent, comparable, planned, diff: comparable - planned, overBudget: planned > 0 && comparable > planned };
}
