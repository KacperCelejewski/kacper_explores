export interface TransitInfo {
  mode: "bus" | "flight" | "train";
  carrier: string;
  costPln: number;
  durationH: number;
}

export interface AirportDef {
  code: string;
  city: string;
  country: string;
  flag: string;
  /** Multiplier applied to WRO base price for mock data */
  mockPriceFactor: number;
  /** Extra cost to reach the airport (PLN) — added to realCost */
  transferCost: number;
  /** True for non-Polish European hubs (BER, IST, AMS, …) */
  isHub?: boolean;
  /** How to get here from Poland */
  transit?: TransitInfo;
}

export const AIRPORTS: AirportDef[] = [
  // ── Polish departure airports ──────────────────────────────────────────────
  { code: "WRO", city: "Wrocław",  country: "PL", flag: "🇵🇱", mockPriceFactor: 1.00, transferCost: 0 },
  { code: "KTW", city: "Katowice", country: "PL", flag: "🇵🇱", mockPriceFactor: 0.94, transferCost: 0 },
  { code: "KRK", city: "Kraków",   country: "PL", flag: "🇵🇱", mockPriceFactor: 0.98, transferCost: 0 },
  { code: "WAW", city: "Warszawa", country: "PL", flag: "🇵🇱", mockPriceFactor: 0.90, transferCost: 0 },
  { code: "WMI", city: "Modlin",   country: "PL", flag: "🇵🇱", mockPriceFactor: 0.86, transferCost: 0 },
  { code: "POZ", city: "Poznań",   country: "PL", flag: "🇵🇱", mockPriceFactor: 1.04, transferCost: 0 },
  { code: "GDN", city: "Gdańsk",   country: "PL", flag: "🇵🇱", mockPriceFactor: 1.08, transferCost: 0 },

  // ── European hubs ──────────────────────────────────────────────────────────
  {
    code: "BER", city: "Berlin", country: "DE", flag: "🇩🇪",
    mockPriceFactor: 0.65, transferCost: 100, isHub: true,
    transit: { mode: "bus", carrier: "FlixBus", costPln: 100, durationH: 5 },
  },
  {
    code: "BUD", city: "Budapeszt", country: "HU", flag: "🇭🇺",
    mockPriceFactor: 0.70, transferCost: 90, isHub: true,
    transit: { mode: "bus", carrier: "FlixBus", costPln: 90, durationH: 8 },
  },
  {
    code: "VIE", city: "Wiedeń", country: "AT", flag: "🇦🇹",
    mockPriceFactor: 0.72, transferCost: 85, isHub: true,
    transit: { mode: "bus", carrier: "RegioJet", costPln: 85, durationH: 6 },
  },
  {
    code: "AMS", city: "Amsterdam", country: "NL", flag: "🇳🇱",
    mockPriceFactor: 0.52, transferCost: 220, isHub: true,
    transit: { mode: "flight", carrier: "Ryanair/KLM", costPln: 220, durationH: 2 },
  },
  {
    code: "LGW", city: "Londyn", country: "GB", flag: "🇬🇧",
    mockPriceFactor: 0.58, transferCost: 250, isHub: true,
    transit: { mode: "flight", carrier: "Ryanair/Wizz Air", costPln: 250, durationH: 2.5 },
  },
  {
    code: "IST", city: "Stambuł", country: "TR", flag: "🇹🇷",
    mockPriceFactor: 0.42, transferCost: 200, isHub: true,
    transit: { mode: "flight", carrier: "Wizz Air", costPln: 200, durationH: 2.5 },
  },
];

export const AIRPORT_BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export const DEFAULT_AIRPORTS = ["WRO"];

export const HUB_AIRPORTS = AIRPORTS.filter((a) => a.isHub);
export const POLISH_AIRPORTS = AIRPORTS.filter((a) => !a.isHub);
