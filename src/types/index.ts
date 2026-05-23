export type BudgetLevel = "low" | "medium";

export type TravelStyle =
  | "nature"
  | "history"
  | "architecture"
  | "food"
  | "beach"
  | "nightlife";

export type TravelVibe = "chill" | "intense" | "social" | "active";

export type PlaceType = "big_city" | "charming" | "beach_sun";

export type TripDuration = number; // 2–21 dni

export interface QuizAnswers {
  budget: BudgetLevel | null;
  vibe: TravelVibe | null;
  styles: TravelStyle[];
  placeType: PlaceType | null;
  month: number | null; // 1-12
  duration: TripDuration | null;
  /** Selected departure airport codes, e.g. ["WRO", "KTW", "BER"] */
  airports: string[];
  /** Pre-selected city from homepage gallery (e.g. "Barcelona") */
  preferredCity?: string;
}

export interface Airport {
  code: string;
  city: string;
  country: string;
}

export interface TransitToHub {
  mode: "bus" | "flight" | "train";
  carrier: string;
  costPln: number;
  durationH: number;
}

export interface FlightOffer {
  id: string;
  origin: Airport;
  destination: Airport;
  price: number; // PLN
  realCost: number; // PLN (lot + dojazd do hubu)
  durationMinutes: number;
  airline: string;
  departureTime: string; // "06:30"
  arrivalTime: string;   // "08:45"
  departureDate?: string; // "2026-06-17"
  returnDate?: string;    // "2026-06-24"
  affiliateUrl?: string;
  isBerlinAlternative: boolean;
  savingsVsWro: number | null; // PLN oszczędności vs WRO (null jeśli WRO)
  transitToHub?: TransitToHub; // jak dotrzeć do hubu z Polski
}

export interface DestinationRecommendation {
  city: string;
  country: string;
  countryFlag: string;
  tags: TravelStyle[];
  budgetLevel: BudgetLevel;
  coverImage: string; // emoji reprezentujące miasto
  description: string;
  vibes?: TravelVibe[];
  placeTypes?: PlaceType[];
  /** Estimated flight cost range from AI (e.g. "350–600 PLN") */
  estimatedFlightCost?: string;
  /** Pre-built Google Flights / Skyscanner search URL */
  flightSearchUrl?: string;
  /** Legacy flight offer fields — kept for backward compat with saved trips */
  flightWro?: FlightOffer | null;
  flightBer?: FlightOffer | null;
  bestOffer?: FlightOffer;
  flights?: Record<string, FlightOffer>;
}

/** Manually entered flight details by the user */
export interface FlightDetails {
  arrivalDate: string;   // "2026-06-12"
  arrivalTime: string;   // "14:30" — local time at destination
  returnDate: string;    // "2026-06-19"
  returnTime: string;    // "06:00" — departure time from destination
}

export interface DayActivity {
  time: string;        // "09:00"
  title: string;
  description: string;
  type: "attraction" | "food" | "transport" | "tip" | "accommodation";
  cost: string;        // "Free" / "~15 PLN"
  location?: string;
  emoji: string;
}

export interface DayPlan {
  day: number;
  date: string;        // "Dzień 1 – Poniedziałek"
  theme: string;       // "Stare Miasto i historia"
  activities: DayActivity[];
}

export interface TripPlan {
  city: string;
  country: string;
  duration: number;
  totalBudgetEstimate: string;
  budgetBreakdown: {
    flights: string;
    accommodation: string;
    food: string;
    attractions: string;
  };
  generalTips: string[];
  days: DayPlan[];
}

export interface Trip {
  id: string;
  destination: DestinationRecommendation;
  quizAnswers: QuizAnswers;
  plan: TripPlan | null;
  createdAt: string;
}
