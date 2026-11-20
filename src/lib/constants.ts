export const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export const STYLE_LABELS: Record<string, string> = {
  nature: "natura i przyroda",
  history: "historia i kultura",
  architecture: "architektura i zabytki",
  food: "lokalna kuchnia i street food",
  beach: "plaże i relaks przy wodzie",
  nightlife: "życie nocne i rozrywka",
};

export const VIBE_LABELS: Record<string, string> = {
  chill: "relaksujący — powolne tempo, kawiarnie, dużo czasu dla siebie",
  intense: "intensywny — jak najwięcej atrakcji, każda godzina zaplanowana",
  social: "towarzyski — poznawanie ludzi, bary, hostelowe przygody, nocne życie",
  active: "aktywny — piesze trasy, sport, ruch na świeżym powietrzu",
};

export const PLACE_LABELS: Record<string, string> = {
  big_city: "duże miasto (metro, muzea, energia tłumu)",
  charming: "kameralne miejsce (małe uliczki, autentyczność, mniej turystów)",
  beach_sun: "słońce i woda (plaże, morze, relaks na zewnątrz)",
};

export const DESTINATION_CACHE_TTL_MS = 10 * 60 * 1000;
export const FLIGHT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const STRIPE_NEWSLETTER_COUPON_ID = "newsletter_10pct_yearly";
export const CHAT_MAX_OUTPUT_TOKENS = 512;

/** Budżet z quizu to kwota na osobę za cały wyjazd (z lotem). Te same progi pokazuje karta w quizie. */
export const BUDGET_CAPS_PLN = { low: 1500, medium: 3000 } as const;

export function budgetPromptLabel(budget: "low" | "medium" | null | undefined, travel: "lotem" | "dojazdem" = "lotem"): string {
  return budget === "low"
    ? `niski (backpacker, do ${BUDGET_CAPS_PLN.low} PLN na osobę za cały wyjazd, z ${travel})`
    : `średni (komfortowy, ${BUDGET_CAPS_PLN.low}–${BUDGET_CAPS_PLN.medium} PLN na osobę za cały wyjazd, z ${travel})`;
}
