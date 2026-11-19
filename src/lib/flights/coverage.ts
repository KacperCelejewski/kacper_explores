import { POLISH_AIRPORTS } from "@/lib/airports";
import { upcomingDeals } from "@/lib/drop/read";
import { isFreshDeal } from "@/lib/priceTrust";
import { cityFromDealName, weekendCities } from "@/lib/seo/cities";
import type { DropDeal } from "@/lib/drop/types";
import type { FlightPassengers } from "@/lib/group";
import type { DestinationRecommendation, QuizAnswers } from "@/types";
import { cachedForPairs, cardSearchPairs } from "./card-pairs";
import { selectCardFlightPrice, type CachedFlightPair } from "./card-price";

export interface Coverage {
  eligible: number;
  priced: number;
  /** priced / eligible, or null when nothing qualifies (never 0 or 100 by default). */
  ratio: number | null;
}

const coverage = (eligible: number, priced: number): Coverage => ({
  eligible, priced, ratio: eligible === 0 ? null : priced / eligible,
});

export interface CardCoverage extends Coverage {
  /** Cards for cities outside the catalog: they cannot be priced at all, so they are not "eligible". */
  notEligible: string[];
  /** Eligible cards without a fresh matching cache quote: they show "Bez aktualnej ceny". */
  withoutPrice: string[];
}

/** Destination cards: cards with a fresh cache quote / cards that can qualify. Cache is passed in, no network. */
export function cardPriceCoverage(input: {
  destinations: Pick<DestinationRecommendation, "city" | "country">[];
  quiz: Pick<QuizAnswers, "month" | "duration" | "airports">;
  cache: CachedFlightPair[];
  passengers: FlightPassengers;
  now: number;
}): CardCoverage {
  const searches = cardSearchPairs(input.destinations, input.quiz, new Date(input.now));
  const notEligible: string[] = [];
  const withoutPrice: string[] = [];
  let eligible = 0;
  let priced = 0;
  input.destinations.forEach((dest, i) => {
    const pairs = searches[i];
    if (pairs.length === 0) { notEligible.push(dest.city); return; }
    eligible++;
    if (selectCardFlightPrice(cachedForPairs(input.cache, pairs), input.passengers, input.now)) priced++;
    else withoutPrice.push(dest.city);
  });
  return { ...coverage(eligible, priced), notEligible, withoutPrice };
}

export interface DealsCoverage {
  /** Polish airports with at least one fresh upcoming deal / all Polish airports. */
  origins: Coverage;
  /** Weekend-list cities with at least one fresh upcoming deal / all weekend-list cities. */
  cities: Coverage;
  /** Fresh upcoming deal rows / all upcoming deal rows (a stale row still shows, with a warning). */
  rows: Coverage;
  originsWithoutDeals: string[];
}

/** Deal cards (okazje, city pages): coverage and freshness from the supplied drop_deals rows. */
export function dealsCoverage(deals: DropDeal[], now: number): DealsCoverage {
  const upcoming = upcomingDeals(deals, new Date(now));
  const fresh = upcoming.filter((d) => isFreshDeal(d, now));
  const freshOrigins = new Set(fresh.map((d) => d.origin));
  const freshCities = new Set(fresh.map((d) => cityFromDealName(d.city_name)?.city).filter(Boolean));
  const origins = POLISH_AIRPORTS.map((a) => a.code);
  return {
    origins: coverage(origins.length, origins.filter((o) => freshOrigins.has(o)).length),
    cities: coverage(weekendCities().length, freshCities.size),
    rows: coverage(upcoming.length, fresh.length),
    originsWithoutDeals: origins.filter((o) => !freshOrigins.has(o)),
  };
}

export const formatRatio = (c: Coverage): string =>
  c.ratio === null ? "brak kwalifikujących się" : `${c.priced}/${c.eligible} (${Math.round(c.ratio * 100)}%)`;
