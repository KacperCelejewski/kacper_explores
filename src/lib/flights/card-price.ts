import { FLIGHT_CACHE_TTL_MS } from "@/lib/constants";
import type { FlightPassengers } from "@/lib/group";
import type { RealFlight } from "./rapidapi";

export interface FlightCachePair {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
}

export interface CachedFlightPair extends FlightCachePair {
  flights: RealFlight[];
  expiresAt: number;
}

export interface CardFlightPrice extends FlightCachePair {
  price: number;
  checkedAt: number;
  expiresAt: number;
}

/** Only the exact route/date/passenger cache entries supplied by the reader qualify. */
export function selectCardFlightPrice(
  entries: CachedFlightPair[],
  passengers: FlightPassengers,
  now = Date.now(),
): CardFlightPrice | null {
  let best: CardFlightPrice | null = null;
  for (const entry of entries) {
    const checkedAt = entry.expiresAt - FLIGHT_CACHE_TTL_MS;
    if (!Number.isFinite(checkedAt) || checkedAt > now || entry.expiresAt <= now) continue;
    if (entry.departDate <= new Date(now).toISOString().slice(0, 10)) continue;
    for (const flight of entry.flights) {
      if (!Number.isFinite(flight.price) || flight.price < 1) continue;
      if (flight.departureDate !== entry.departDate || flight.returnDate !== entry.returnDate) continue;
      if (flight.passengers?.adults !== passengers.adults
        || flight.passengers?.children !== passengers.children
        || flight.passengers?.infants !== passengers.infants) continue;
      if (!best || flight.price < best.price || (flight.price === best.price && checkedAt > best.checkedAt)) {
        best = {
          origin: entry.origin, destination: entry.destination,
          departDate: entry.departDate, returnDate: entry.returnDate,
          price: flight.price, checkedAt, expiresAt: entry.expiresAt,
        };
      }
    }
  }
  return best;
}

export function formatFlightPLN(price: number): string {
  return `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(price)} zł`;
}

const checkedDate = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit", month: "2-digit", timeZone: "Europe/Warsaw",
});

/** The selector and the client expiry timer remove stale quotes before presentation. */
export const CARD_FLIGHT_SCOPE = "Sam lot, bez noclegu i wydatków na miejscu";

export function cardFlightPriceCopy(quote: Pick<CardFlightPrice, "price" | "checkedAt"> | null) {
  if (!quote) {
    return { amount: "Sprawdź w wyszukiwarce", note: "Bez aktualnej ceny", scope: CARD_FLIGHT_SCOPE };
  }
  return {
    amount: `od ${formatFlightPLN(quote.price)}`,
    note: `sprawdzone ${checkedDate.format(quote.checkedAt)}`,
    scope: CARD_FLIGHT_SCOPE,
  };
}
