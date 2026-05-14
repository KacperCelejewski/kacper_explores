import type { DestinationRecommendation, FlightOffer } from "@/types";
import { MOCK_DESTINATIONS } from "@/lib/mockFlights";

const BASE = "https://api.travelpayouts.com";
const BER_TRANSFER_COST = 100;

// Airline IATA codes → names
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

// API returns data[IATA][index] where index is "0", "1", etc.
type TpApiResponse = {
  data: Record<string, Record<string, TpOffer>>;
};

// In-memory cache: cacheKey → { data, expiresAt }
const cache = new Map<string, { data: Record<string, TpOffer>; expiresAt: number }>();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3h

// Build IATA → mock destination map
const DEST_BY_IATA = new Map<string, DestinationRecommendation>(
  MOCK_DESTINATIONS.flatMap((d) => {
    const code = d.flightWro?.destination.code ?? d.flightBer?.destination.code;
    return code ? [[code, d]] : [];
  })
);

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

  // Flatten: pick cheapest offer per destination (first key "0", "1", …)
  const data: Record<string, TpOffer> = {};
  for (const [iata, offers] of Object.entries(raw)) {
    const best = Object.values(offers)[0];
    if (best) data[iata] = best;
  }

  cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

function buildFlightOffer(
  base: FlightOffer,
  offer: TpOffer,
  origin: "WRO" | "BER"
): FlightOffer {
  const airlineName = AIRLINE_NAMES[offer.airline] ?? offer.airline;
  const dep = new Date(offer.departure_at);
  const ret = new Date(offer.return_at);
  const depTime = `${String(dep.getUTCHours()).padStart(2, "0")}:${String(dep.getUTCMinutes()).padStart(2, "0")}`;
  const retTime = `${String(ret.getUTCHours()).padStart(2, "0")}:${String(ret.getUTCMinutes()).padStart(2, "0")}`;
  const realCost = origin === "BER" ? offer.price + BER_TRANSFER_COST : offer.price;

  return {
    ...base,
    price: offer.price,
    realCost,
    durationMinutes: offer.duration_to ?? base.durationMinutes,
    airline: airlineName,
    departureTime: depTime,
    arrivalTime: retTime,
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

  for (const dest of MOCK_DESTINATIONS) {
    const iata = dest.flightWro?.destination.code ?? dest.flightBer?.destination.code;
    if (!iata) continue;

    const wroOffer = wroPrices[iata];
    const berOffer = berPrices[iata];

    // Skip if no data from either airport
    if (!wroOffer && !berOffer) continue;

    const updated: DestinationRecommendation = { ...dest };

    if (wroOffer && dest.flightWro) {
      updated.flightWro = buildFlightOffer(dest.flightWro, wroOffer, "WRO");
    }

    if (berOffer && dest.flightBer) {
      const berFlight = buildFlightOffer(dest.flightBer, berOffer, "BER");
      const wroReal = updated.flightWro?.realCost ?? 9999;
      berFlight.savingsVsWro = wroReal - berFlight.realCost;
      updated.flightBer = berFlight;
    }

    // Recalculate bestOffer with real prices (spread evaluates the getter with mock prices)
    const wroReal = updated.flightWro?.realCost ?? Infinity;
    const berReal = updated.flightBer?.realCost ?? Infinity;
    updated.bestOffer =
      updated.flightBer && berReal < wroReal - 150
        ? updated.flightBer
        : updated.flightWro ?? updated.flightBer!;

    enriched.push(updated);
  }

  return enriched.length >= 3 ? enriched : MOCK_DESTINATIONS;
}
