import type { DestinationRecommendation, FlightOffer } from "@/types";
import { MOCK_DESTINATIONS } from "@/lib/mockFlights";
import { CATALOG } from "@/lib/destinations/catalog";
import { AIRPORT_BY_CODE, DEFAULT_AIRPORTS } from "@/lib/airports";

const BASE = "https://api.travelpayouts.com";

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
}

type TpApiResponse = { data: Record<string, Record<string, TpOffer>> };

const cache = new Map<string, { data: Record<string, TpOffer>; expiresAt: number }>();
const CACHE_TTL = 3 * 60 * 60 * 1000;

// IATA → mock destination (keyed by WRO destination IATA)
const DEST_BY_IATA = new Map<string, DestinationRecommendation>();
for (const dest of MOCK_DESTINATIONS) {
  const iata = dest.flightWro?.destination.code ?? dest.flightBer?.destination.code;
  if (iata) DEST_BY_IATA.set(iata, dest);
}

// WRO IATA → catalog entry (for iataBer lookup)
const CATALOG_BY_WRO_IATA = new Map(CATALOG.map((e) => [e.iataWro, e]));

function targetYearMonth(month: number) {
  const now = new Date();
  const year = month < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-${String(month).padStart(2, "0")}`;
}

async function fetchCheapFlights(origin: string, month: number): Promise<Record<string, TpOffer>> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) throw new Error("TRAVELPAYOUTS_TOKEN not set");

  const monthStr = targetYearMonth(month);
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
  const data: Record<string, TpOffer> = {};
  for (const [iata, offers] of Object.entries(json.data ?? {})) {
    const best = Object.values(offers)[0];
    if (best) data[iata] = best;
  }

  cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

function formatDate(iso: string) { return iso.slice(0, 10); }

function buildBuyLink(origin: string, dest: string, airlineCode: string, depIso: string, retIso: string): string {
  const dep = formatDate(depIso);
  const ret = formatDate(retIso);
  const df = dep.replace(/-/g, "");
  const rf = ret.replace(/-/g, "");
  if (airlineCode === "FR") return `https://www.ryanair.com/en/gb/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${dep}&dateIn=${ret}&isConnectedFlight=false&isReturn=true&discount=0&originIata=${origin}&destinationIata=${dest}`;
  if (airlineCode === "W6") return `https://wizzair.com/en-gb/booking/select-flight/${origin}/${dest}/${df}/${rf}/1/0/0`;
  return `https://www.skyscanner.pl/transport/flights/${origin.toLowerCase()}/${dest.toLowerCase()}/${df}/${rf}/?adults=1&rtn=1`;
}

function enrichFlight(base: FlightOffer, offer: TpOffer, originCode: string): FlightOffer {
  const ap = AIRPORT_BY_CODE.get(originCode);
  const transferCost = ap?.transferCost ?? 0;
  const airlineName = AIRLINE_NAMES[offer.airline] ?? offer.airline;
  const dep = new Date(offer.departure_at);
  const ret = new Date(offer.return_at);
  const depTime = `${String(dep.getUTCHours()).padStart(2, "0")}:${String(dep.getUTCMinutes()).padStart(2, "0")}`;
  const arrTime = `${String(ret.getUTCHours()).padStart(2, "0")}:${String(ret.getUTCMinutes()).padStart(2, "0")}`;
  const realCost = offer.price + transferCost;

  return {
    ...base,
    id: `${originCode.toLowerCase()}-${base.destination.code.toLowerCase()}`,
    origin: { code: originCode, city: ap?.city ?? originCode, country: ap?.country ?? "PL" },
    price: offer.price,
    realCost,
    durationMinutes: offer.duration_to ?? base.durationMinutes,
    airline: airlineName,
    departureTime: depTime,
    arrivalTime: arrTime,
    departureDate: formatDate(offer.departure_at),
    returnDate: formatDate(offer.return_at),
    affiliateUrl: buildBuyLink(originCode, base.destination.code, offer.airline, offer.departure_at, offer.return_at),
    isBerlinAlternative: originCode === "BER",
    savingsVsWro: null, // recalculated below
  };
}

export async function getRealRecommendations(
  month: number,
  airports: string[] = DEFAULT_AIRPORTS
): Promise<DestinationRecommendation[]> {
  // Fetch from all selected airports in parallel
  const results = await Promise.allSettled(
    airports.map((code) => fetchCheapFlights(code, month).then((data) => ({ code, data })))
  );

  // Build map: originCode → priceMap
  const pricesByOrigin: Record<string, Record<string, TpOffer>> = {};
  for (const r of results) {
    if (r.status === "fulfilled") pricesByOrigin[r.value.code] = r.value.data;
  }

  if (Object.keys(pricesByOrigin).length === 0) return MOCK_DESTINATIONS;

  const enriched: DestinationRecommendation[] = [];

  // Use WRO prices as the canonical IATA source (or first available origin)
  const canonicalPrices = pricesByOrigin["WRO"] ?? Object.values(pricesByOrigin)[0];

  for (const [iata, _wroOffer] of Object.entries(canonicalPrices)) {
    const mockDest = DEST_BY_IATA.get(iata);
    if (!mockDest) continue;

    const updated: DestinationRecommendation = { ...mockDest };
    const newFlights: Record<string, FlightOffer> = { ...(mockDest.flights ?? {}) };

    let wroRealCost = Infinity;

    // Enrich each available origin
    for (const [originCode, priceMap] of Object.entries(pricesByOrigin)) {
      // For BER, use the iataBer mapping from catalog if different
      const lookupIata = originCode === "BER"
        ? (CATALOG_BY_WRO_IATA.get(iata)?.iataBer ?? iata)
        : iata;

      const offer = priceMap[lookupIata];
      if (!offer) continue;

      const baseFlightForOrigin =
        originCode === "BER" ? mockDest.flightBer : mockDest.flightWro;
      if (!baseFlightForOrigin) continue;

      const enriched_ = enrichFlight(baseFlightForOrigin, offer, originCode);
      newFlights[originCode] = enriched_;

      if (originCode === "WRO") wroRealCost = enriched_.realCost;
    }

    // Recalculate savingsVsWro for BER
    if (newFlights["BER"] && wroRealCost < Infinity) {
      newFlights["BER"] = { ...newFlights["BER"], savingsVsWro: wroRealCost - newFlights["BER"].realCost };
    }

    // bestOffer = cheapest among selected airports with real data
    const candidates = airports.map((c) => newFlights[c]).filter((f): f is FlightOffer => !!f);
    if (candidates.length === 0) continue;

    updated.flights = newFlights;
    updated.flightWro = newFlights["WRO"] ?? mockDest.flightWro;
    updated.flightBer = newFlights["BER"] ?? mockDest.flightBer;
    updated.bestOffer = candidates.reduce((best, f) => f.realCost < best.realCost ? f : best);

    enriched.push(updated);
  }

  return enriched.length >= 5 ? enriched : MOCK_DESTINATIONS;
}
