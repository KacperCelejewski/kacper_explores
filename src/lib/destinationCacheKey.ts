import type { QuizAnswers } from "@/types";
import { normalizeFoundation } from "@/lib/quizOptions";

type KeyInput = Partial<Pick<QuizAnswers, "styles" | "budget" | "vibe" | "placeType" | "month" | "duration" | "airports" | "preferredCity" | "regions" | "tripType" | "transport">>;

/**
 * Klucz cache rekomendacji kierunków. Używają go klient (cache w store) i serwer (cache w pamięci),
 * żeby oba rozróżniały te same odpowiedzi. Nowe pola (region, rodzaj wyjazdu, transport) są dopisane
 * na końcu i pomijane, gdy ich nie ma: stary quiz daje dokładnie ten sam ciąg co przed ich dodaniem.
 * Listy są normalizowane (bez powtórzeń, stała kolejność), więc kolejność klikania nie zmienia klucza.
 */
export function destinationCacheKey(a: KeyInput): string {
  const { styles, budget, vibe, placeType, month, duration, airports, preferredCity } = a;
  return JSON.stringify({ styles, budget, vibe, placeType, month, duration, airports, preferredCity, ...normalizeFoundation(a) });
}
