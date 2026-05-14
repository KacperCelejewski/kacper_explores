export interface AirportDef {
  code: string;
  city: string;
  country: string;
  flag: string;
  /** Multiplier applied to WRO base price for mock data */
  mockPriceFactor: number;
  /** Extra cost to reach the airport (PLN) — added to realCost */
  transferCost: number;
}

export const AIRPORTS: AirportDef[] = [
  { code: "WRO", city: "Wrocław",    country: "PL", flag: "🇵🇱", mockPriceFactor: 1.00, transferCost: 0 },
  { code: "KTW", city: "Katowice",   country: "PL", flag: "🇵🇱", mockPriceFactor: 0.94, transferCost: 0 },
  { code: "KRK", city: "Kraków",     country: "PL", flag: "🇵🇱", mockPriceFactor: 0.98, transferCost: 0 },
  { code: "WAW", city: "Warszawa",   country: "PL", flag: "🇵🇱", mockPriceFactor: 0.90, transferCost: 0 },
  { code: "WMI", city: "Modlin",     country: "PL", flag: "🇵🇱", mockPriceFactor: 0.86, transferCost: 0 },
  { code: "POZ", city: "Poznań",     country: "PL", flag: "🇵🇱", mockPriceFactor: 1.04, transferCost: 0 },
  { code: "GDN", city: "Gdańsk",     country: "PL", flag: "🇵🇱", mockPriceFactor: 1.08, transferCost: 0 },
  { code: "BER", city: "Berlin",     country: "DE", flag: "🇩🇪", mockPriceFactor: 0.65, transferCost: 100 },
];

export const AIRPORT_BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export const DEFAULT_AIRPORTS = ["WRO"];
