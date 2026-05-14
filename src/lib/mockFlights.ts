import type { DestinationRecommendation, FlightOffer } from "@/types";
import { CATALOG, type CatalogEntry } from "@/lib/destinations/catalog";
import { AIRPORTS, AIRPORT_BY_CODE, DEFAULT_AIRPORTS } from "@/lib/airports";
import type { AirportDef } from "@/lib/airports";

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

function buildFlightForAirport(
  e: CatalogEntry,
  airportCode: string,
): FlightOffer | null {
  const airport: AirportDef | undefined = AIRPORT_BY_CODE.get(airportCode);
  if (!airport) return null;

  const isHub = airport.isHub ?? false;

  // For BER, use iataBer if available; for other hubs and Polish airports use iataWro
  const destIata = airportCode === "BER" ? (e.iataBer ?? e.iataWro) : e.iataWro;
  const destAirport = { code: destIata, city: e.city, country: e.countryFlag };

  if (airportCode === "BER") {
    const basePrice = e.berPrice !== null
      ? e.berPrice
      : Math.round(e.wroPrice * airport.mockPriceFactor);
    const realCost = basePrice + airport.transferCost;
    return {
      id: `ber-${destIata.toLowerCase()}`,
      origin: { code: "BER", city: "Berlin", country: "DE" },
      destination: destAirport,
      price: basePrice,
      realCost,
      durationMinutes: e.berDurationMin ?? Math.round(e.wroDurationMin * 1.05),
      airline: e.berAirline ?? e.wroAirline,
      departureTime: e.berDep ?? e.wroDep,
      arrivalTime: e.berArr ?? e.wroArr,
      isBerlinAlternative: true,
      savingsVsWro: e.wroPrice - realCost,
      affiliateUrl: airlineLink("BER", destIata, e.berAirline ?? e.wroAirline),
      transitToHub: airport.transit,
    };
  }

  // Other hub airports (IST, AMS, BUD, VIE, LGW)
  if (isHub) {
    const price = Math.round(e.wroPrice * airport.mockPriceFactor);
    const realCost = price + airport.transferCost;
    return {
      id: `${airportCode.toLowerCase()}-${destIata.toLowerCase()}`,
      origin: { code: airportCode, city: airport.city, country: airport.country },
      destination: destAirport,
      price,
      realCost,
      durationMinutes: e.wroDurationMin,
      airline: e.wroAirline,
      departureTime: e.wroDep,
      arrivalTime: e.wroArr,
      isBerlinAlternative: false,
      savingsVsWro: e.wroPrice - realCost,
      affiliateUrl: airlineLink(airportCode, destIata, e.wroAirline),
      transitToHub: airport.transit,
    };
  }

  // Polish airports: scale WRO price by mockPriceFactor
  const price = Math.round(e.wroPrice * airport.mockPriceFactor);
  return {
    id: `${airportCode.toLowerCase()}-${destIata.toLowerCase()}`,
    origin: { code: airportCode, city: airport.city, country: "PL" },
    destination: destAirport,
    price,
    realCost: price + airport.transferCost,
    durationMinutes: e.wroDurationMin,
    airline: e.wroAirline,
    departureTime: e.wroDep,
    arrivalTime: e.wroArr,
    isBerlinAlternative: false,
    savingsVsWro: null,
    affiliateUrl: airlineLink(airportCode, destIata, e.wroAirline),
  };
}

function buildDestination(e: CatalogEntry): DestinationRecommendation {
  // Build flights map for all airports
  const flights: Record<string, FlightOffer> = {};
  for (const ap of AIRPORTS) {
    const f = buildFlightForAirport(e, ap.code);
    if (f) flights[ap.code] = f;
  }

  const flightWro = flights["WRO"] ?? null;
  const flightBer = flights["BER"] ?? null;

  // Default bestOffer = WRO (will be overridden per-user in getRecommendations)
  const bestOffer = flightWro ?? flightBer!;

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
    flights,
  };
}

export const MOCK_DESTINATIONS: DestinationRecommendation[] = CATALOG.map(buildDestination);

function pickBestOffer(
  dest: DestinationRecommendation,
  airports: string[]
): FlightOffer | null {
  const flightsMap = dest.flights ?? {};
  const candidates = airports
    .map((code) => flightsMap[code])
    .filter((f): f is FlightOffer => !!f);

  if (candidates.length === 0) return null;
  return candidates.reduce((best, f) => f.realCost < best.realCost ? f : best);
}

export function getRecommendations(
  styles: string[],
  budget: string,
  airports: string[] = DEFAULT_AIRPORTS,
  vibe: string | null = null,
  placeType: string | null = null,
  count = 999,
  pool: DestinationRecommendation[] = MOCK_DESTINATIONS
): DestinationRecommendation[] {
  const scored = pool
    .map((dest) => {
      const best = pickBestOffer(dest, airports);
      if (!best) return null; // no flight from any selected airport

      const styleMatch = styles.filter((s) => dest.tags.includes(s as never)).length;
      const budgetMatch = dest.budgetLevel === budget ? 2 : 1;
      const vibeMatch = vibe && dest.vibes?.includes(vibe as never) ? 3 : 0;
      const placeMatch = placeType && dest.placeTypes?.includes(placeType as never) ? 3 : 0;
      const score = styleMatch * 2 + budgetMatch + vibeMatch + placeMatch;

      return { dest: { ...dest, bestOffer: best }, score };
    })
    .filter((x): x is { dest: DestinationRecommendation; score: number } => x !== null);

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.dest);
}

export const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
