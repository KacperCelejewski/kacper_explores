import type { QuizAnswers, DestinationRecommendation, TripPlan } from "@/types";
import { MONTH_NAMES } from "@/lib/mockFlights";
import { calcTripSchedule, formatScheduleForPrompt } from "@/lib/tripSchedule";

const STYLE_LABELS: Record<string, string> = {
  nature: "natura i przyroda",
  history: "historia i kultura",
  architecture: "architektura i zabytki",
  food: "lokalna kuchnia i street food",
  beach: "plaże i relaks przy wodzie",
  nightlife: "życie nocne i rozrywka",
};

const VIBE_LABELS: Record<string, string> = {
  chill: "relaksujący — powolne tempo, kawiarnie, dużo czasu dla siebie",
  intense: "intensywny — jak najwięcej atrakcji, każda godzina zaplanowana",
  social: "towarzyski — poznawanie ludzi, bary, hostelowe przygody, nocne życie",
  active: "aktywny — piesze trasy, sport, ruch na świeżym powietrzu",
};

const PLACE_LABELS: Record<string, string> = {
  big_city: "duże miasto (metro, muzea, energia tłumu)",
  charming: "kameralne miejsce (małe uliczki, autentyczność, mniej turystów)",
  beach_sun: "słońce i woda (plaże, morze, relaks na zewnątrz)",
};

export function buildPlanPrompt(
  destination: DestinationRecommendation,
  quiz: QuizAnswers
): string {
  const monthName = quiz.month ? MONTH_NAMES[quiz.month - 1] : "nieokreślony";
  const stylesList = quiz.styles.map((s) => STYLE_LABELS[s] ?? s).join(", ");
  const budgetLabel = quiz.budget === "low" ? "niski (backpacker)" : "średni (komfortowy)";
  const vibeLabel = quiz.vibe ? VIBE_LABELS[quiz.vibe] : null;
  const placeLabel = quiz.placeType ? PLACE_LABELS[quiz.placeType] : null;
  const flightCost = destination.bestOffer.realCost;
  const duration = quiz.duration ?? 3;

  const vibeInstruction = vibeLabel ? `- Energia wyjazdu: ${vibeLabel}` : "";
  const placeInstruction = placeLabel ? `- Preferowany typ miejsca: ${placeLabel}` : "";

  const vibeGuide = quiz.vibe === "chill"
    ? "Spokojne tempo — ranki na kawie, popołudnia na spacerach, wieczory w lokalnych barach. Bez pośpiechu."
    : quiz.vibe === "intense"
    ? "Zapakuj każdy pełny dzień po brzegi — dużo atrakcji, mało przerw, maksymalne wykorzystanie czasu."
    : quiz.vibe === "social"
    ? "Uwzględnij miejsca gdzie łatwo poznać ludzi — hostelowe bary, wspólne wycieczki, food markety, wieczorne bary."
    : quiz.vibe === "active"
    ? "Uwzględnij aktywności fizyczne — piesze trasy, rowery miejskie, pływanie, sport. Mniej muzeów, więcej ruchu."
    : "Zbalansowane tempo — mix atrakcji i odpoczynku.";

  // Calculate real schedule based on flight times
  const schedule = calcTripSchedule(destination.bestOffer, duration);
  const schedulePrompt = formatScheduleForPrompt(schedule);

  return `Jesteś ekspertem od budżetowych podróży solo po Europie. Stwórz szczegółowy plan podróży do ${destination.city}, ${destination.country}.

PROFIL PODRÓŻNIKA:
- Budżet: ${budgetLabel}
- Zainteresowania: ${stylesList}
${vibeInstruction}
${placeInstruction}
- Miesiąc: ${monthName}
- Koszt lotów: ~${flightCost} PLN (w obie strony)

HARMONOGRAM LOTÓW I DZIENNY PLAN:
Poniżej masz DOKŁADNE instrukcje dla każdego z ${duration} dni. Przestrzegaj ich bezwzględnie — godziny wynikają z rzeczywistych czasów lotów.

${schedulePrompt}

STYL PLANOWANIA:
${vibeGuide}

ZASADY DLA WSZYSTKICH DNI:
- Tanie miejsca do jedzenia (street food, lokalne bary, bazary)
- Darmowe lub tanie atrakcje (priorytet!)
- Praktyczne wskazówki budżetowe
- Porady dla podróżujących solo — gdzie poznać ludzi, bezpieczeństwo
- Szacunkowe koszty każdej aktywności w PLN
- Pole "location" wypełnij dla każdej aktywności z fizyczną lokalizacją (nie dla transportu i wskazówek)

KRYTYCZNE WYMAGANIA DOTYCZĄCE LICZBY DNI:
- Tablica "days" MUSI zawierać DOKŁADNIE ${duration} elementów (od day:1 do day:${duration})
- Wygenerowanie mniejszej liczby dni jest błędem i spowoduje odrzucenie odpowiedzi
- Każdy dzień musi istnieć nawet jeśli ma mało aktywności (np. dzień przylotu wieczorem)

Odpowiedz WYŁĄCZNIE w formacie JSON:

{
  "city": "${destination.city}",
  "country": "${destination.country}",
  "duration": ${duration},
  "totalBudgetEstimate": "np. '1200-1500 PLN'",
  "budgetBreakdown": {
    "flights": "${flightCost} PLN",
    "accommodation": "np. '300-400 PLN'",
    "food": "np. '200-250 PLN'",
    "attractions": "np. '100-150 PLN'"
  },
  "generalTips": ["tip1","tip2","tip3","tip4","tip5"],
  "days": [
    {
      "day": 1,
      "date": "Dzień 1 – [dzień tygodnia jeśli znany]",
      "theme": "krótki motyw dnia",
      "activities": [
        {
          "time": "10:00",
          "title": "Nazwa aktywności",
          "description": "2-3 zdania z konkretnymi wskazówkami",
          "type": "attraction|food|transport|tip|accommodation",
          "cost": "Free lub '~15 PLN'",
          "location": "Nazwa miejsca lub adres",
          "emoji": "emoji"
        }
      ]
    }
  ]
}`;
}

export function parsePlanResponse(raw: string): TripPlan {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned) as TripPlan;
}

// Validates and fixes day count after generation
export function validateAndFixPlan(plan: TripPlan, expectedDuration: number): TripPlan {
  if (plan.days.length === expectedDuration) return plan;

  // Too many days — trim
  if (plan.days.length > expectedDuration) {
    return { ...plan, days: plan.days.slice(0, expectedDuration), duration: expectedDuration };
  }

  // Too few days — pad with stub days
  const fixed = { ...plan, days: [...plan.days], duration: expectedDuration };
  while (fixed.days.length < expectedDuration) {
    const dayNum = fixed.days.length + 1;
    fixed.days.push({
      day: dayNum,
      date: `Dzień ${dayNum}`,
      theme: "Czas wolny",
      activities: [
        {
          time: "09:00",
          title: "Dzień wolny",
          description: "Odkryj miasto na własną rękę — spacer, kawiarnia, lokalny rynek.",
          type: "tip",
          cost: "Free",
          emoji: "🗺️",
        },
      ],
    });
  }

  return fixed;
}
