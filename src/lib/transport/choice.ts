import type { DestinationRecommendation, QuizAnswers, Transport, TravelEstimate } from "@/types";
import { effectiveTransport } from "@/lib/quizOptions";
import { groundModes, usesFlights } from "./index";

// Co pokazać przy kierunku i jaki środek ma plan, gdy w quizie wybrano kilka.

export interface CardTransport {
  /** Karta lotu, cena, linki Aviasales i okazje: tylko gdy wybrano samolot */
  showFlight: boolean;
  /** Dojazd lądowy w wybranych środkach (w zasięgu) */
  travel: TravelEstimate[];
}

export function cardTransport(quiz: Pick<QuizAnswers, "transport">, dest: Pick<DestinationRecommendation, "travel">): CardTransport {
  const wanted = new Set<Transport>(groundModes(quiz));
  return { showFlight: usesFlights(quiz), travel: (dest.travel ?? []).filter((t) => wanted.has(t.mode)) };
}

/** Środki, którymi da się dojechać do tego miejsca: samolot (jeśli wybrany), potem lądowe w zasięgu. */
export function planChoices(quiz: Pick<QuizAnswers, "transport">, dest: Pick<DestinationRecommendation, "travel">): Transport[] {
  const { showFlight, travel } = cardTransport(quiz, dest);
  const choices: Transport[] = showFlight ? ["samolot"] : [];
  for (const t of travel) choices.push(t.mode);
  // Zabezpieczenie: gdy żaden nie pasuje (miejsce spoza listy), plan zostaje przy pierwszym wybranym środku.
  return choices.length ? choices : [effectiveTransport(quiz)[0]];
}

/**
 * Odpowiedzi quizu z jednym środkiem planu. Samolot bez jawnego wyboru zostaje bez zmian (brak pola = samolot),
 * dzięki czemu dotychczasowe wywołania i zapisane wyjazdy wyglądają jak dawniej.
 */
export function withPlanTransport(quiz: QuizAnswers, mode: Transport): QuizAnswers {
  const current = effectiveTransport(quiz);
  if (current.length === 1 && current[0] === mode) return quiz;
  return { ...quiz, transport: [mode] };
}
