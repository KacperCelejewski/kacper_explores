import type { DestinationRecommendation, FlightOffer } from "@/types";
import { CATALOG, type CatalogEntry } from "@/lib/destinations/catalog";

const WRO_ORIGIN: FlightOffer["origin"] = { code: "WRO", city: "Wrocław", country: "PL" };
const BER_ORIGIN: FlightOffer["origin"] = { code: "BER", city: "Berlin", country: "DE" };
const BER_TRANSFER_COST = 100;

function airlineLink(origin: string, dest: string, airline: string): string {
  if (airline === "Ryanair") {
    return `https://www.ryanair.com/en/gb/trip/flights/select?adults=1&teens=0&children=0&infants=0&isConnectedFlight=false&isReturn=true&discount=0&originIata=${origin}&destinationIata=${dest}`;
  }
  if (airline === "Wizz Air") {
    return `https://wizzair.com/en-gb/booking/select-flight/${origin}/${dest}////1/0/0`;
  }
  if (airline === "easyJet") {
    return `https://www.easyjet.com/en/cheap-flights/${origin.toLowerCase()}/${dest.toLowerCase()}`;
  }
  return `https://www.skyscanner.pl/transport/flights/${origin.toLowerCase()}/${dest.toLowerCase()}/?adults=1&rtn=1`;
}

function buildDestination(e: CatalogEntry): DestinationRecommendation {
  const destAirport = { code: e.iataWro, city: e.city, country: e.countryFlag };

  const flightWro: FlightOffer = {
    id: `wro-${e.iataWro.toLowerCase()}`,
    origin: WRO_ORIGIN,
    destination: destAirport,
    price: e.wroPrice,
    realCost: e.wroPrice,
    durationMinutes: e.wroDurationMin,
    airline: e.wroAirline,
    departureTime: e.wroDep,
    arrivalTime: e.wroArr,
    isBerlinAlternative: false,
    savingsVsWro: null,
    affiliateUrl: airlineLink(WRO_ORIGIN.code, e.iataWro, e.wroAirline),
  };

  let flightBer: FlightOffer | null = null;
  if (e.iataBer && e.berPrice !== null && e.berDurationMin !== null && e.berAirline && e.berDep && e.berArr) {
    const berRealCost = e.berPrice + BER_TRANSFER_COST;
    flightBer = {
      id: `ber-${e.iataBer.toLowerCase()}`,
      origin: BER_ORIGIN,
      destination: { code: e.iataBer, city: e.city, country: e.countryFlag },
      price: e.berPrice,
      realCost: berRealCost,
      durationMinutes: e.berDurationMin,
      airline: e.berAirline,
      departureTime: e.berDep,
      arrivalTime: e.berArr,
      isBerlinAlternative: true,
      savingsVsWro: e.wroPrice - berRealCost,
      affiliateUrl: airlineLink(BER_ORIGIN.code, e.iataBer, e.berAirline),
    };
  }

  const bestOffer =
    flightBer && flightBer.realCost < flightWro.realCost - 150 ? flightBer : flightWro;

  return {
    city: e.city,
    country: e.country,
    countryFlag: e.countryFlag,
    tags: e.tags,
    budgetLevel: e.budgetLevel,
    coverImage: e.coverImage,
    description: e.description,
    flightWro,
    flightBer,
    bestOffer,
    vibes: e.vibes,
    placeTypes: e.placeTypes,
  };
}

export const MOCK_DESTINATIONS: DestinationRecommendation[] = CATALOG.map(buildDestination);

export function getRecommendations(
  styles: string[],
  budget: string,
  includeBerlin: boolean,
  vibe: string | null = null,
  placeType: string | null = null,
  count = 999,
  pool: DestinationRecommendation[] = MOCK_DESTINATIONS
): DestinationRecommendation[] {
  const scored = pool.map((dest) => {
    const styleMatch = styles.filter((s) => dest.tags.includes(s as never)).length;
    const budgetMatch = dest.budgetLevel === budget ? 2 : 1;
    const hasBerSavings =
      includeBerlin &&
      dest.flightBer &&
      dest.flightBer.savingsVsWro !== null &&
      dest.flightBer.savingsVsWro > 150
        ? 1
        : 0;
    const vibeMatch = vibe && dest.vibes?.includes(vibe as never) ? 3 : 0;
    const placeMatch = placeType && dest.placeTypes?.includes(placeType as never) ? 3 : 0;

    return { dest, score: styleMatch * 2 + budgetMatch + hasBerSavings + vibeMatch + placeMatch };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.dest);
}

export const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
