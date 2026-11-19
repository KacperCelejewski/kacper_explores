import { NextRequest, NextResponse } from "next/server";
import { groupFromCompanion, toFlightPassengers } from "@/lib/group";
import { readJsonBody } from "@/lib/http";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { getClientIp, validateDestination, validateQuizAnswers } from "@/lib/validate";
import { readCachedFlightPairs } from "@/lib/flights/rapidapi";
import { cachedForPairs, cardSearchPairs } from "@/lib/flights/card-pairs";
import { selectCardFlightPrice } from "@/lib/flights/card-price";
import type { Companion, DestinationRecommendation, QuizAnswers } from "@/types";

const headers = { "Cache-Control": "no-store" };
const companions: (Companion | null)[] = [null, "solo", "couple", "friends", "family"];

function isInput(value: unknown): value is { destinations: DestinationRecommendation[]; quizAnswers: QuizAnswers } {
  if (!value || typeof value !== "object") return false;
  const { destinations, quizAnswers } = value as Record<string, unknown>;
  if (!Array.isArray(destinations) || destinations.length < 1 || destinations.length > 6
    || !destinations.every(validateDestination) || !validateQuizAnswers(quizAnswers)) return false;
  const quiz = quizAnswers as QuizAnswers;
  return Number.isInteger(quiz.month) && Number.isInteger(quiz.duration)
    && Array.isArray(quiz.airports) && quiz.airports.length > 0
    && (quiz.companion === undefined || companions.includes(quiz.companion));
}

export async function POST(req: NextRequest) {
  // Separate bucket: reading cache must not spend the paid real-flights allowance.
  const rl = checkRateLimit(`destination-flight-prices:${getClientIp(req)}`, LIMITS.flights.limit, LIMITS.flights.windowMs);
  if (!rl.allowed) return NextResponse.json(
    { error: `Za dużo naraz. Spróbuj za ${rl.resetInSeconds} s.` },
    { status: 429, headers: { ...headers, "Retry-After": String(rl.resetInSeconds) } },
  );
  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return parsed.response;
  if (!isInput(parsed.body)) return NextResponse.json({ error: "Nieprawidłowe dane wejściowe." }, { status: 400, headers });

  const { destinations, quizAnswers: quiz } = parsed.body;
  const passengers = toFlightPassengers(groupFromCompanion(quiz.companion ?? null, quiz.group));
  const searches = cardSearchPairs(destinations, quiz);
  const cached = await readCachedFlightPairs(searches.flat(), passengers);
  const prices = searches.map((pairs) => selectCardFlightPrice(cachedForPairs(cached, pairs), passengers));
  return NextResponse.json({ prices }, { headers });
}
