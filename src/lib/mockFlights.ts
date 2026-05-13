import type { DestinationRecommendation, FlightOffer } from "@/types";

const WRO: FlightOffer["origin"] = { code: "WRO", city: "Wrocław", country: "PL" };
const BER: FlightOffer["origin"] = { code: "BER", city: "Berlin", country: "DE" };

const BER_TRANSFER_COST = 100; // PLN dojazd Wrocław → Berlin

function wroFlight(
  id: string,
  destCode: string,
  destCity: string,
  destCountry: string,
  price: number,
  durationMinutes: number,
  airline: string,
  dep: string,
  arr: string
): FlightOffer {
  return {
    id: `wro-${id}`,
    origin: WRO,
    destination: { code: destCode, city: destCity, country: destCountry },
    price,
    realCost: price,
    durationMinutes,
    airline,
    departureTime: dep,
    arrivalTime: arr,
    isBerlinAlternative: false,
    savingsVsWro: null,
  };
}

function berFlight(
  id: string,
  destCode: string,
  destCity: string,
  destCountry: string,
  price: number,
  wroPrice: number,
  durationMinutes: number,
  airline: string,
  dep: string,
  arr: string
): FlightOffer {
  const realCost = price + BER_TRANSFER_COST;
  return {
    id: `ber-${id}`,
    origin: BER,
    destination: { code: destCode, city: destCity, country: destCountry },
    price,
    realCost,
    durationMinutes,
    airline,
    departureTime: dep,
    arrivalTime: arr,
    isBerlinAlternative: true,
    savingsVsWro: wroPrice - realCost,
  };
}

export const MOCK_DESTINATIONS: DestinationRecommendation[] = [
  {
    city: "Lizbona",
    country: "Portugalia",
    countryFlag: "🇵🇹",
    tags: ["history", "architecture", "food", "beach"],
    budgetLevel: "low",
    coverImage: "🏛️",
    description: "Miasto tramwajów, pastéis de nata i niesamowitych widoków za grosze.",
    flightWro: wroFlight("lis", "LIS", "Lizbona", "PT", 390, 215, "Ryanair", "06:10", "09:45"),
    flightBer: berFlight("lis", "LIS", "Lizbona", "PT", 210, 390, 210, "easyJet", "07:30", "11:00"),
    get bestOffer() {
      const ber = this.flightBer!;
      const wro = this.flightWro!;
      return ber.realCost < wro.realCost - 150 ? ber : wro;
    },
  },
  {
    city: "Barcelona",
    country: "Hiszpania",
    countryFlag: "🇪🇸",
    tags: ["architecture", "beach", "food", "nightlife"],
    budgetLevel: "medium",
    coverImage: "🏗️",
    description: "Gaudí, tapas, plaże i tętniące życiem Ramblas — klasyk z powodu.",
    flightWro: wroFlight("bcn", "BCN", "Barcelona", "ES", 420, 195, "Wizz Air", "05:55", "08:30"),
    flightBer: berFlight("bcn", "BCN", "Barcelona", "ES", 190, 420, 185, "Ryanair", "06:45", "09:10"),
    get bestOffer() {
      const ber = this.flightBer!;
      const wro = this.flightWro!;
      return ber.realCost < wro.realCost - 150 ? ber : wro;
    },
  },
  {
    city: "Ateny",
    country: "Grecja",
    countryFlag: "🇬🇷",
    tags: ["history", "architecture", "food"],
    budgetLevel: "low",
    coverImage: "🏺",
    description: "Akropol, souvlaki za 3€ i klimat śródziemnomorski przez cały rok.",
    flightWro: wroFlight("ath", "ATH", "Ateny", "GR", 360, 205, "Ryanair", "06:20", "09:45"),
    flightBer: berFlight("ath", "ATH", "Ateny", "GR", 170, 360, 195, "easyJet", "07:10", "10:25"),
    get bestOffer() {
      const ber = this.flightBer!;
      const wro = this.flightWro!;
      return ber.realCost < wro.realCost - 150 ? ber : wro;
    },
  },
  {
    city: "Rzym",
    country: "Włochy",
    countryFlag: "🇮🇹",
    tags: ["history", "architecture", "food"],
    budgetLevel: "medium",
    coverImage: "🏟️",
    description: "Koloseum, pizza al taglio i fontanny — wieczne miasto nie bez powodu.",
    flightWro: wroFlight("fco", "FCO", "Rzym", "IT", 310, 150, "Ryanair", "07:00", "09:30"),
    flightBer: berFlight("fco", "FCO", "Rzym", "IT", 130, 310, 145, "easyJet", "06:30", "08:55"),
    get bestOffer() {
      const ber = this.flightBer!;
      const wro = this.flightWro!;
      return ber.realCost < wro.realCost - 150 ? ber : wro;
    },
  },
  {
    city: "Porto",
    country: "Portugalia",
    countryFlag: "🇵🇹",
    tags: ["history", "food", "architecture", "nature"],
    budgetLevel: "low",
    coverImage: "🍷",
    description: "Wino porto, azulejos, kuchnia i strome uliczki nad rzeką Douro.",
    flightWro: wroFlight("opo", "OPO", "Porto", "PT", 370, 210, "Ryanair", "06:00", "09:30"),
    flightBer: berFlight("opo", "OPO", "Porto", "PT", 185, 370, 205, "Wizz Air", "07:20", "10:45"),
    get bestOffer() {
      const ber = this.flightBer!;
      const wro = this.flightWro!;
      return ber.realCost < wro.realCost - 150 ? ber : wro;
    },
  },
  {
    city: "Madryt",
    country: "Hiszpania",
    countryFlag: "🇪🇸",
    tags: ["history", "food", "nightlife", "architecture"],
    budgetLevel: "medium",
    coverImage: "🎨",
    description: "Prado, churros z czekoladą, tapas bary i kultura do późna w nocy.",
    flightWro: wroFlight("mad", "MAD", "Madryt", "ES", 440, 200, "Wizz Air", "06:15", "09:35"),
    flightBer: berFlight("mad", "MAD", "Madryt", "ES", 220, 440, 195, "Ryanair", "05:55", "09:10"),
    get bestOffer() {
      const ber = this.flightBer!;
      const wro = this.flightWro!;
      return ber.realCost < wro.realCost - 150 ? ber : wro;
    },
  },
  {
    city: "Praga",
    country: "Czechy",
    countryFlag: "🇨🇿",
    tags: ["history", "architecture", "nightlife", "food"],
    budgetLevel: "low",
    coverImage: "🏰",
    description: "Złota Praha — jeden z najpiękniejszych starych miast Europy za ułamek ceny.",
    flightWro: wroFlight("prg", "PRG", "Praga", "CZ", 180, 70, "Ryanair", "07:30", "08:40"),
    flightBer: null,
    get bestOffer() {
      return this.flightWro!;
    },
  },
  {
    city: "Palma de Mallorca",
    country: "Hiszpania",
    countryFlag: "🇪🇸",
    tags: ["beach", "nature", "food"],
    budgetLevel: "medium",
    coverImage: "🏖️",
    description: "Turkusowe wody, skały i party na plaży — rajska wyspa w sercu Morza Śródziemnego.",
    flightWro: wroFlight("pmi", "PMI", "Palma", "ES", 380, 170, "Ryanair", "06:30", "09:20"),
    flightBer: berFlight("pmi", "PMI", "Palma", "ES", 160, 380, 160, "easyJet", "07:00", "09:40"),
    get bestOffer() {
      const ber = this.flightBer!;
      const wro = this.flightWro!;
      return ber.realCost < wro.realCost - 150 ? ber : wro;
    },
  },
  {
    city: "Dubrownik",
    country: "Chorwacja",
    countryFlag: "🇭🇷",
    tags: ["history", "beach", "architecture", "nature"],
    budgetLevel: "medium",
    coverImage: "🌊",
    description: "Perła Adriatyku — mury miejskie, Game of Thrones i krystaliczna woda.",
    flightWro: wroFlight("dbv", "DBV", "Dubrownik", "HR", 290, 115, "Ryanair", "07:45", "09:40"),
    flightBer: berFlight("dbv", "DBV", "Dubrownik", "HR", 165, 290, 105, "easyJet", "06:50", "08:35"),
    get bestOffer() {
      const ber = this.flightBer!;
      const wro = this.flightWro!;
      return ber.realCost < wro.realCost - 150 ? ber : wro;
    },
  },
  {
    city: "Teneryfa",
    country: "Hiszpania",
    countryFlag: "🇪🇸",
    tags: ["beach", "nature", "food"],
    budgetLevel: "medium",
    coverImage: "🌋",
    description: "Wulkan Teide, wieczne słońce i oceana do szaleństwa — idealne na reset.",
    flightWro: wroFlight("tfs", "TFS", "Teneryfa", "ES", 520, 290, "Wizz Air", "05:30", "10:00"),
    flightBer: berFlight("tfs", "TFS", "Teneryfa", "ES", 310, 520, 275, "Ryanair", "06:15", "10:30"),
    get bestOffer() {
      const ber = this.flightBer!;
      const wro = this.flightWro!;
      return ber.realCost < wro.realCost - 150 ? ber : wro;
    },
  },
];

export function getRecommendations(
  styles: string[],
  budget: string,
  includeBerlin: boolean,
  count = 3
): DestinationRecommendation[] {
  const scored = MOCK_DESTINATIONS.map((dest) => {
    const styleMatch = styles.filter((s) => dest.tags.includes(s as never)).length;
    const budgetMatch = dest.budgetLevel === budget ? 2 : 1;
    const hasBerSavings =
      includeBerlin &&
      dest.flightBer &&
      dest.flightBer.savingsVsWro !== null &&
      dest.flightBer.savingsVsWro > 150
        ? 1
        : 0;
    return { dest, score: styleMatch * 2 + budgetMatch + hasBerSavings };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.dest);
}

export const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
