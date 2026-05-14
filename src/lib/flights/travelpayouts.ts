import type { DestinationRecommendation, FlightOffer } from "@/types";
import { MOCK_DESTINATIONS } from "@/lib/mockFlights";
import { CATALOG } from "@/lib/destinations/catalog";

const BASE = "https://api.travelpayouts.com";
const BER_TRANSFER_COST = 100;

const AIRLINE_NAMES: Record<string, string> = {
  FR: "Ryanair", W6: "Wizz Air", U2: "easyJet", LO: "LOT",
  VY: "Vueling", IB: "Iberia", TP: "TAP Air Portugal",
  OS: "Austrian", LH: "Lufthansa", KL: "KLM", AF: "Air France",
};

interface TpOffer {
  price: number;
  airline: string;
  departure_at: string;
  return_at: string;
  number_of_changes?: number;
  duration_to?: number;
  duration_back?: number;
}

type TpApiResponse = {
  data: Record<string, Record<string, TpOffer>>;
};

const cache = new Map<string, { data: Record<string, TpOffer>; expiresAt: number }>();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3h

// Build IATA → mock destination map from the full catalog (both WRO and BER codes)
const DEST_BY_IATA = new Map<string, DestinationRecommendation>();
for (const dest of MOCK_DESTINATIONS) {
  const wroCode = dest.flightWro?.destination.code;
  const berCode = dest.flightBer?.destination.code;
  if (wroCode) DEST_BY_IATA.set(wroCode, dest);
  if (berCode && berCode !== wroCode) DEST_BY_IATA.set(berCode, dest);
}

// Quick lookup: IATA → catalog entry for iata/berlin codes
const CATALOG_BY_WRO_IATA = new Map(CATALOG.map((e) => [e.iataWro, e]));

function targetYearMonth(month: number): { year: number; monthStr: string } {
  const now = new Date();
  const year = month < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
  return { year, monthStr: `${year}-${String(month).padStart(2, "0")}` };
}

async function fetchCheapFlights(
  origin: string,
  month: number
): Promise<Record<string, TpOffer>> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) throw new Error("TRAVELPAYOUTS_TOKEN not set");

  const { monthStr } = targetYearMonth(month);
  const cacheKey = `${origin}-${monthStr}`;

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const url = new URL(`${BASE}/v1/prices/cheap`);
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", "-");
  url.searchParams.set("depart_date", monthStr);
  url.searchParams.set("return_date", monthStr);
  url.searchParams.set("currency", "pln");
  url.searchParams.set("token", token);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Travelpayouts ${origin}: HTTP ${res.status}`);

  const json = await res.json() as TpApiResponse;
  const raw = json.data ?? {};

  const data: Record<string, TpOffer> = {};
  for (const [iata, offers] of Object.entries(raw)) {
    const best = Object.values(offers)[0];
    if (best) data[iata] = best;
  }

  cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function buildBuyLink(
  origin: string,
  destCode: string,
  airlineCode: string,
  departureIso: string,
  returnIso: string
): string {
  const dep = formatDate(departureIso);
  const ret = formatDate(returnIso);
  const depFlat = dep.replace(/-/g, "");
  const retFlat = ret.replace(/-/g, "");

  if (airlineCode === "FR") {
    return `https://www.ryanair.com/en/gb/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${dep}&dateIn=${ret}&isConnectedFlight=false&isReturn=true&discount=0&originIata=${origin}&destinationIata=${destCode}`;
  }
  if (airlineCode === "W6") {
    return `https://wizzair.com/en-gb/booking/select-flight/${origin}/${destCode}/${depFlat}/${retFlat}/1/0/0`;
  }
  return `https://www.skyscanner.pl/transport/flights/${origin.toLowerCase()}/${destCode.toLowerCase()}/${depFlat}/${retFlat}/?adults=1&rtn=1`;
}

function enrichFlightOffer(
  base: FlightOffer,
  offer: TpOffer,
  origin: "WRO" | "BER"
): FlightOffer {
  const airlineName = AIRLINE_NAMES[offer.airline] ?? offer.airline;
  const dep = new Date(offer.departure_at);
  const ret = new Date(offer.return_at);
  const depTime = `${String(dep.getUTCHours()).padStart(2, "0")}:${String(dep.getUTCMinutes()).padStart(2, "0")}`;
  const arrTime = `${String(ret.getUTCHours()).padStart(2, "0")}:${String(ret.getUTCMinutes()).padStart(2, "0")}`;
  const realCost = origin === "BER" ? offer.price + BER_TRANSFER_COST : offer.price;

  return {
    ...base,
    price: offer.price,
    realCost,
    durationMinutes: offer.duration_to ?? base.durationMinutes,
    airline: airlineName,
    departureTime: depTime,
    arrivalTime: arrTime,
    departureDate: formatDate(offer.departure_at),
    returnDate: formatDate(offer.return_at),
    affiliateUrl: buildBuyLink(origin, base.destination.code, offer.airline, offer.departure_at, offer.return_at),
    savingsVsWro: origin === "BER" ? null : base.savingsVsWro,
  };
}

export async function getRealRecommendations(
  month: number,
  includeBerlin: boolean
): Promise<DestinationRecommendation[]> {
  const [wroPrices, berPrices] = await Promise.all([
    fetchCheapFlights("WRO", month),
    includeBerlin ? fetchCheapFlights("BER", month) : Promise.resolve({} as Record<string, TpOffer>),
  ]);

  const enriched: DestinationRecommendation[] = [];

  // Go through every IATA code returned by WRO API
  for (const [iata, wroOffer] of Object.entries(wroPrices)) {
    const mockDest = DEST_BY_IATA.get(iata);
    if (!mockDest) continue; // not in our catalog, skip

    const updated: DestinationRecommendation = { ...mockDest };

    // Enrich WRO flight with real data
    if (mockDest.flightWro) {
      updated.flightWro = enrichFlightOffer(mockDest.flightWro, wroOffer, "WRO");
    }

    // Enrich BER flight if available
    const berIata = CATALOG_BY_WRO_IATA.get(iata)?.iataBer ?? iata;
    const berOffer = berPrices[berIata];
    if (berOffer && mockDest.flightBer) {
      const berFlight = enrichFlightOffer(mockDest.flightBer, berOffer, "BER");
      const wroReal = updated.flightWro?.realCost ?? 9999;
      berFlight.savingsVsWro = wroReal - berFlight.realCost;
      updated.flightBer = berFlight;
    }

    // Recalculate bestOffer with real prices
    const wroReal = updated.flightWro?.realCost ?? Infinity;
    const berReal = updated.flightBer?.realCost ?? Infinity;
    updated.bestOffer =
      updated.flightBer && berReal < wroReal - 150
        ? updated.flightBer
        : updated.flightWro ?? updated.flightBer!;

    enriched.push(updated);
  }

  // Fall back to full mock catalog if real API returned too few results
  return enriched.length >= 5 ? enriched : MOCK_DESTINATIONS;
}
