export type BudgetLevel = "low" | "medium";

export type TravelStyle =
  | "nature"
  | "history"
  | "architecture"
  | "food"
  | "beach"
  | "nightlife";

export type TripDuration = 3 | 5 | 7 | 10;

export interface QuizAnswers {
  budget: BudgetLevel | null;
  styles: TravelStyle[];
  month: number | null; // 1-12
  duration: TripDuration | null;
  includeBerlin: boolean;
}

export interface Airport {
  code: string;
  city: string;
  country: string;
}

export interface FlightOffer {
  id: string;
  origin: Airport;
  destination: Airport;
  price: number; // PLN
  realCost: number; // PLN (po doliczeniu dojazdu do BER)
  durationMinutes: number;
  airline: string;
  departureTime: string; // "06:30"
  arrivalTime: string;   // "08:45"
  isBerlinAlternative: boolean;
  savingsVsWro: number | null; // PLN oszczędności vs WRO (null jeśli WRO)
}

export interface DestinationRecommendation {
  city: string;
  country: string;
  countryFlag: string;
  tags: TravelStyle[];
  budgetLevel: BudgetLevel;
  coverImage: string; // emoji reprezentujące miasto
  flightWro: FlightOffer | null;
  flightBer: FlightOffer | null;
  bestOffer: FlightOffer;
  description: string;
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
