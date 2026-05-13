import type { QuizAnswers, DestinationRecommendation, TripPlan } from "@/types";
import { MONTH_NAMES } from "@/lib/mockFlights";

const STYLE_LABELS: Record<string, string> = {
  nature: "natura i przyroda",
  history: "historia i kultura",
  architecture: "architektura i zabytki",
  food: "lokalna kuchnia i street food",
  beach: "plaże i relaks przy wodzie",
  nightlife: "życie nocne i rozrywka",
};

export function buildPlanPrompt(
  destination: DestinationRecommendation,
  quiz: QuizAnswers
): string {
  const monthName = quiz.month ? MONTH_NAMES[quiz.month - 1] : "nieokreślony";
  const stylesList = quiz.styles.map((s) => STYLE_LABELS[s] ?? s).join(", ");
  const budgetLabel = quiz.budget === "low" ? "niski (backpacker)" : "średni (komfortowy)";
  const flightCost = destination.bestOffer.realCost;

  return `Jesteś ekspertem od budżetowych podróży solo po Europie. Stwórz SZCZEGÓŁOWY plan podróży do ${destination.city}, ${destination.country} na ${quiz.duration} dni w miesiącu ${monthName}.

PREFERENCJE PODRÓŻNIKA:
- Budżet: ${budgetLabel}
- Zainteresowania: ${stylesList}
- Czas trwania: ${quiz.duration} dni
- Koszt lotów: ~${flightCost} PLN (w obie strony)

WYMAGANIA PLANU:
1. Plan KAŻDEGO dnia od 08:00 do 22:00 (minimum 6 aktywności na dzień)
2. Skup się na atrakcjach pasujących do zainteresowań: ${stylesList}
3. Tanie miejsca do jedzenia (street food, lokalne bary, bazary)
4. Darmowe lub tanie atrakcje (priorytet!)
5. Praktyczne wskazówki budżetowe i triki oszczędnościowe
6. Informacje o bezpieczeństwie dla podróżujących solo
7. Szacunkowe koszty każdej aktywności w PLN

Odpowiedz WYŁĄCZNIE w formacie JSON (bez markdown, bez komentarzy):

{
  "city": "${destination.city}",
  "country": "${destination.country}",
  "duration": ${quiz.duration},
  "totalBudgetEstimate": "szacunkowy całkowity koszt np. '1200-1500 PLN'",
  "budgetBreakdown": {
    "flights": "${flightCost} PLN",
    "accommodation": "np. '300-400 PLN'",
    "food": "np. '200-250 PLN'",
    "attractions": "np. '100-150 PLN'"
  },
  "generalTips": [
    "tip1",
    "tip2",
    "tip3",
    "tip4",
    "tip5"
  ],
  "days": [
    {
      "day": 1,
      "date": "Dzień 1 – [dzień tygodnia]",
      "theme": "krótki motyw dnia np. 'Stare Miasto i pierwsze wrażenia'",
      "activities": [
        {
          "time": "08:00",
          "title": "Nazwa aktywności",
          "description": "2-3 zdania opisu z konkretnymi wskazówkami",
          "type": "attraction|food|transport|tip|accommodation",
          "cost": "Free lub '~15 PLN'",
          "location": "Nazwa miejsca lub adres (opcjonalne)",
          "emoji": "odpowiednie emoji"
        }
      ]
    }
  ]
}

Stwórz plan dla wszystkich ${quiz.duration} dni. Każdy dzień musi mieć minimum 6 aktywności rozłożonych przez cały dzień.`;
}

export function parsePlanResponse(raw: string): TripPlan {
  // Strip possible markdown code fences
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as TripPlan;
  return parsed;
}
