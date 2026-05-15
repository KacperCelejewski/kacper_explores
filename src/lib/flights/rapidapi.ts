import { SKY_IDS } from "./sky-ids";

export interface RealFlight {
  price: number;
  airline: string;
  departureDate: string;       // YYYY-MM-DD
  departureTime: string;       // HH:MM local at origin
  arrivalTime: string;         // HH:MM local at destination
  returnDate: string;          // YYYY-MM-DD
  returnDepartureTime: string; // HH:MM local at destination
  returnArrivalTime: string;   // HH:MM local at origin
  durationMinutes: number;
}

interface RapidLeg {
  departure: string;
  arrival: string;
  durationInMinutes: number;
  carriers: { marketing: Array<{ name: string }> };
}

interface RapidItinerary {
  price: { raw: number };
  legs: RapidLeg[];
}

interface RapidResponse {
  status: boolean;
  data?: { itineraries?: RapidItinerary[] };
}

const cache = new Map<string, { data: RealFlight; expiresAt: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000;

function pickDates(month: number, duration: number): { depart: string; ret: string } {
  const now = new Date();
  const year = month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  // Pick the 15th as a neutral mid-month departure
  const depart = `${year}-${pad(month)}-15`;
  const retDate = new Date(depart);
  retDate.setUTCDate(retDate.getUTCDate() + duration);
  return { depart, ret: retDate.toISOString().slice(0, 10) };
}

function hhmm(isoTimestamp: string): string {
  // "2026-06-15T06:10:00" → "06:10"
  return isoTimestamp.slice(11, 16);
}

export async function searchCheapestFlight(
  originCode: string,
  destCode: string,
  month: number,
  duration: number
): Promise<RealFlight | null> {
  const token = process.env.RAPIDAPI_KEY;
  if (!token) return null;

  const origin = SKY_IDS[originCode];
  const dest = SKY_IDS[destCode];
  if (!origin || !dest) return null;

  const { depart, ret } = pickDates(month, duration);
  const cacheKey = `${originCode}-${destCode}-${depart.slice(0, 7)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const url = new URL("https://flights-sky.p.rapidapi.com/flights/search-roundtrip");
    url.searchParams.set("fromEntityId", origin.entityId);
    url.searchParams.set("toEntityId", dest.entityId);
    url.searchParams.set("departDate", depart);
    url.searchParams.set("returnDate", ret);
    url.searchParams.set("adults", "1");
    url.searchParams.set("currency", "PLN");
    url.searchParams.set("locale", "pl-PL");

    const res = await fetch(url.toString(), {
      headers: {
        "X-RapidAPI-Key": token,
        "X-RapidAPI-Host": "flights-sky.p.rapidapi.com",
      },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as RapidResponse;
    const itinerary = json.data?.itineraries?.[0];
    if (!itinerary || itinerary.legs.length < 2) return null;

    const outbound = itinerary.legs[0];
    const inbound = itinerary.legs[1];

    const result: RealFlight = {
      price: itinerary.price.raw,
      airline: outbound.carriers.marketing[0]?.name ?? "Linie lotnicze",
      departureDate: outbound.departure.slice(0, 10),
      departureTime: hhmm(outbound.departure),
      arrivalTime: hhmm(outbound.arrival),
      returnDate: inbound.departure.slice(0, 10),
      returnDepartureTime: hhmm(inbound.departure),
      returnArrivalTime: hhmm(inbound.arrival),
      durationMinutes: outbound.durationInMinutes,
    };

    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL });
    return result;
  } catch {
    return null;
  }
}
