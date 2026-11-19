import { CATALOG } from "@/lib/destinations/catalog";
import type { DestinationRecommendation, QuizAnswers } from "@/types";
import type { FlightCachePair } from "./card-price";
import { candidateDates } from "./rapidapi";

/**
 * Exact cache pairs a destination card may be priced from: catalog city x selected origins x the
 * same bounded date window as the month search. A city outside the catalog has no pairs, so it
 * can never carry a price (the card then says "Sprawdź w wyszukiwarce").
 * One entry per destination, in the order given.
 */
export function cardSearchPairs(
  destinations: Pick<DestinationRecommendation, "city" | "country">[],
  quiz: Pick<QuizAnswers, "month" | "duration" | "airports">,
  now = new Date(),
): FlightCachePair[][] {
  const dates = candidateDates(quiz.month!, quiz.duration!, now).slice(0, 3);
  return destinations.map((dest) => {
    const city = CATALOG.find((entry) => entry.city.toLocaleLowerCase("pl") === dest.city.toLocaleLowerCase("pl")
      && entry.country.toLocaleLowerCase("pl") === dest.country.toLocaleLowerCase("pl"));
    return city ? [...new Set(quiz.airports)].flatMap((origin) => dates.map((date) => ({
      origin, destination: origin === "BER" ? city.iataBer ?? city.iataWro : city.iataWro, ...date,
    }))) : [];
  });
}

/** Cache entries that match one of the card's exact route/date pairs. */
export function cachedForPairs<T extends FlightCachePair>(cached: T[], pairs: FlightCachePair[]): T[] {
  return cached.filter((entry) => pairs.some((pair) =>
    pair.origin === entry.origin && pair.destination === entry.destination
      && pair.departDate === entry.departDate && pair.returnDate === entry.returnDate,
  ));
}
