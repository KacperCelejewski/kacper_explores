import type { FlightPassengers } from "@/lib/group";

/** low: do 1500 zł, medium: 1500–3000 zł, high: powyżej 3000 zł (tylko po wyborze dalekiego regionu), na osobę */
export type BudgetLevel = "low" | "medium" | "high";

export type Companion = "solo" | "couple" | "family" | "friends";

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

/** Dokąd na świecie. Klucze techniczne (ASCII); polskie etykiety: `src/lib/quizOptions.ts`. */
export type Region =
  | "europa"
  | "ameryka_poludniowa"
  | "ameryka_polnocna"
  | "azja"
  | "afryka"
  | "bliski_wschod"
  | "oceania";

/** Rodzaj wyjazdu. Brak odpowiedzi znaczy "zwiedzanie", jak przed dodaniem tego pola. */
export type TripType =
  | "zwiedzanie"
  | "wypoczynek"
  | "narty"
  | "gory"
  | "plaza"
  | "aktywny"
  | "wieczory";

/** Czym się dostajemy na miejsce. Brak odpowiedzi znaczy "samolot", jak przed dodaniem tego pola. */
export type Transport = "samolot" | "auto" | "pociag_bus" | "rower";

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
  /** Who's traveling */
  companion: Companion | null;
  /** Skład grupy; gdy brak, wynika z `companion` */
  group?: GroupComposition;
  /** Wybrane regiony świata; puste lub brak = obojętnie */
  regions?: Region[];
  /** Rodzaj wyjazdu; brak = zwiedzanie */
  tripType?: TripType;
  /** Środki transportu; brak = samolot */
  transport?: Transport[];
}

/** Skład grupy: dorośli i wiek każdego dziecka (w latach) */
export interface GroupComposition {
  adults: number;
  childrenAges: number[];
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
  price: number; // PLN za osobę
  totalPrice?: number; // PLN za całą grupę
  soloPrice?: number | null; // PLN za jedną osobę, te same daty (porównanie z grupą)
  passengers?: FlightPassengers;
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
  arrivalTime?: string;  // "14:30" — local time at destination; brak = godzina nieznana
  returnDate: string;    // "2026-06-19"
  returnTime?: string;   // "06:00" — departure time from destination; brak = godzina nieznana
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
    /** Transport na miejscu (komunikacja, taksówki). Starsze plany go nie mają: kwota była tylko w sumie. */
    transport?: string;
  };
  generalTips: string[];
  days: DayPlan[];
  /** Calendar date of day 1 ("2026-11-27"): saved only when the traveller chose a date range. */
  startDate?: string;
  /** Rodzaj wyjazdu, pod który ułożono plan; brak = zwiedzanie (plany sprzed tego pola). */
  tripType?: TripType;
  /** Założenia, które dostał model przy liczeniu kosztów (noce, osoby, standard). Brak = plan sprzed ich zapisywania. */
  costBasis?: { nights: number; seats: number; standard: "low" | "medium" | null };
}

export interface Trip {
  id: string;
  destination: DestinationRecommendation;
  quizAnswers: QuizAnswers;
  plan: TripPlan | null;
  createdAt: string;
}
