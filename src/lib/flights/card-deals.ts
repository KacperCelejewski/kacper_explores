import { CATALOG, type CatalogEntry } from "@/lib/destinations/catalog";
import { FRESH_DEAL_MAX_AGE_DAYS, isFreshDeal } from "@/lib/priceTrust";
import { dealCityName } from "@/lib/seo/cities";
import type { DropDeal } from "@/lib/drop/types";
import type { QuizAnswers } from "@/types";
import type { CardFlightPrice } from "./card-price";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fallback card price: the cheapest fresh, still-upcoming round trip from the weekly `drop_deals`
 * (Travelpayouts cron), for the nearest weekend only. One adult. The raw row travels with it so the
 * link is exactly the flight that the amount was read from.
 */
export interface CardDealPrice {
  source: "deal";
  origin: string;
  /** Travelpayouts code of the destination, as stored in the deal row. */
  destination: string;
  cityName: string;
  departDate: string;
  returnDate: string;
  price: number;
  /** `fetched_at` of the deal row: when we pulled this fare, not when the quiz was filled. */
  checkedAt: number;
  /** Earlier of "fetched + 8 days" and the departure: the amount disappears when it stops being true. */
  expiresAt: number;
  /** The deal's departure month differs from the month chosen in the quiz. */
  outsideMonth: boolean;
  /** Length of this flight's trip in days (first to last day), and the length chosen in the quiz. */
  tripDays: number;
  quizDays: number | null;
  deal: DropDeal;
}

export type CardPrice = CardFlightPrice | CardDealPrice;

export function isDealPrice(quote: CardPrice | null | undefined): quote is CardDealPrice {
  return !!quote && (quote as CardDealPrice).source === "deal";
}

export function catalogCityFor(dest: { city: string; country: string }): CatalogEntry | null {
  const city = dest.city.toLocaleLowerCase("pl");
  const country = dest.country.toLocaleLowerCase("pl");
  return CATALOG.find((entry) => entry.city.toLocaleLowerCase("pl") === city
    && entry.country.toLocaleLowerCase("pl") === country) ?? null;
}

/** Same destination code convention as the cache pairs: BER uses its own code when the catalog has one. */
export function destinationCodeFor(city: CatalogEntry, origin: string): string {
  return origin === "BER" ? city.iataBer ?? city.iataWro : city.iataWro;
}

/** City identity of a deal row: catalog IATA code for that origin, or the name used by /weekend pages. */
export function dealMatchesCity(deal: Pick<DropDeal, "origin" | "city_code" | "city_name">, city: CatalogEntry): boolean {
  return deal.city_code === destinationCodeFor(city, deal.origin) || deal.city_name === dealCityName(city);
}

function tripDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS) + 1;
}

function localDate(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Picks the card's deal. Per selected origin only the NEWEST week that the cron wrote counts (an older
 * week is never promoted when the newest one has no row for this city), then rows must be fresh
 * (priceTrust.isFreshDeal, 8 days) and not yet departed. Cheapest wins; a tie goes to the earlier flight.
 */
export function selectCardDeal(
  dest: { city: string; country: string },
  quiz: Pick<QuizAnswers, "airports" | "month"> & { duration?: number | null },
  deals: DropDeal[],
  now = Date.now(),
): CardDealPrice | null {
  const city = catalogCityFor(dest);
  if (!city) return null;
  const origins = new Set(quiz.airports);
  const matching = deals.filter((deal) => origins.has(deal.origin) && dealMatchesCity(deal, city));

  const latest = new Map<string, string>();
  for (const deal of matching) {
    const cur = latest.get(deal.origin);
    if (!cur || deal.week > cur) latest.set(deal.origin, deal.week);
  }

  let best: DropDeal | null = null;
  for (const deal of matching) {
    if (deal.week !== latest.get(deal.origin)) continue;
    if (!isFreshDeal(deal, now)) continue;
    const departure = Date.parse(deal.departure_at);
    if (!Number.isFinite(departure) || departure < now) continue;
    if (!/^\d{4}-\d{2}-\d{2}/.test(deal.return_at) || !Number.isFinite(Date.parse(deal.return_at))) continue;
    if (!best || deal.price < best.price
      || (deal.price === best.price && departure < Date.parse(best.departure_at))) best = deal;
  }
  if (!best) return null;

  const checkedAt = Date.parse(best.fetched_at);
  const departure = Date.parse(best.departure_at);
  const departDate = localDate(best.departure_at);
  return {
    source: "deal",
    origin: best.origin,
    destination: best.city_code,
    cityName: best.city_name,
    departDate,
    returnDate: localDate(best.return_at),
    price: best.price,
    checkedAt,
    expiresAt: Math.min(checkedAt + FRESH_DEAL_MAX_AGE_DAYS * DAY_MS, departure),
    outsideMonth: quiz.month != null && Number(departDate.slice(5, 7)) !== quiz.month,
    tripDays: tripDays(departDate, localDate(best.return_at)),
    quizDays: Number.isInteger(quiz.duration) && (quiz.duration as number) > 0 ? (quiz.duration as number) : null,
    deal: best,
  };
}

/** Extra lines under a deal-based amount. `seats` = travellers in the quiz (1 for solo). */
export function dealPriceNotes(quote: CardDealPrice, seats: number): string[] {
  const notes = [`Za 1 dorosłego, w obie strony · ${quote.origin} → ${quote.cityName}`];
  if (seats > 1) notes.push("To cena za jedną osobę. Dla całej grupy sprawdź ją w wyszukiwarce.");
  const longer = quote.quizDays !== null && Math.abs(quote.tripDays - quote.quizDays) >= 2;
  if (quote.outsideMonth) notes.push("To najbliższy weekend z tygodniowych okazji, nie wybrany w quizie miesiąc.");
  else notes.push("Z tygodniowych okazji, na najbliższy weekend.");
  if (longer) notes.push(`Ten lot to wyjazd na ${quote.tripDays} ${quote.tripDays === 1 ? "dzień" : "dni"}, w quizie wybrano ${quote.quizDays}.`);
  return notes;
}
