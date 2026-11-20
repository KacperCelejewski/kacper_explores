import type { DestinationRecommendation, QuizAnswers, TravelStyle } from "@/types";
import { budgetPromptLabel, VIBE_LABELS, PLACE_LABELS } from "@/lib/constants";
import { monthYearLabel } from "@/lib/tripMonth";
import { originCityName, travelDuration, travelFor, travelModeName, type GroundCandidate } from "./index";
import { findGroundPlace } from "./places";

// Kierunki dla auta, pociągu lub busa i roweru: model wybiera TYLKO z listy miejsc w zasięgu, którą liczymy sami
// (patrz `reachablePlaces`). Odległość i czas dopisujemy po stronie serwera, nie bierzemy ich z odpowiedzi modelu.

type DestinationAnswers = Pick<QuizAnswers, "styles" | "budget" | "vibe" | "placeType" | "month" | "duration" | "airports" | "preferredCity" | "transport">;

const STYLES: ReadonlySet<string> = new Set<TravelStyle>(["nature", "history", "architecture", "food", "beach", "nightlife"]);

function candidateLine({ place, travel }: GroundCandidate): string {
  const how = travel.map((t) => `${travelModeName(t.mode).toLowerCase()} ${travelDuration(t)}`).join("; ");
  return `- ${place.city} (${place.country}): ${how}; tagi: ${place.tags.join(", ")}`;
}

/** Prompt dla wyjazdu bez lotu: wybór dokładnie 6 miejsc z gotowej listy. */
export function groundDestinationPrompt(body: Partial<DestinationAnswers>, candidates: readonly GroundCandidate[]): string {
  const budgetLabel = budgetPromptLabel(body.budget === "medium" ? "medium" : "low", "dojazdem");
  const origin = originCityName(body.airports) ?? "miasta startu";
  const modes = [...new Set(candidates.flatMap((c) => c.travel.map((t) => travelModeName(t.mode).toLowerCase())))].join(", ");
  const count = Math.min(6, candidates.length);
  return `Jesteś ekspertem od budżetowych podróży z Polski. Zaproponuj DOKŁADNIE ${count} destynacji pasujących do profilu, do których da się dojechać bez samolotu.
${body.preferredCity ? `\nWAŻNE: Użytkownik wybrał miasto ${body.preferredCity}: jeśli jest na liście poniżej, MUSI być pierwszą rekomendacją.\n` : ""}
PROFIL:
- Budżet: ${budgetLabel}
- Zainteresowania: ${(body.styles ?? []).join(", ") || "różnorodne"}
- Energia: ${body.vibe ? VIBE_LABELS[body.vibe] : "dowolna"}
- Typ miejsca: ${body.placeType ? PLACE_LABELS[body.placeType] : "dowolny"}
- Miesiąc: ${body.month ? monthYearLabel(body.month) : "dowolny"}
- Długość: ${body.duration ? `${body.duration} dni` : "nieokreślona"}
- Start: ${origin}, środek transportu: ${modes}

WYBIERZ WYŁĄCZNIE Z TEJ LISTY (odległości policzyliśmy sami, nie zmieniaj ich i nie dopisuj własnych miejsc):
${candidates.map(candidateLine).join("\n")}

Zwróć tablicę JSON "destinations" z dokładnie ${count} obiektami. Każdy obiekt MUSI mieć te pola:
- city (string): nazwa miasta DOKŁADNIE tak, jak na liście
- description (string): 1-2 zdania dlaczego warto jechać tam właśnie w tym miesiącu i tym środkiem transportu
- tags (array of strings): max 3, wybierz z: nature, history, architecture, food, beach, nightlife
- budgetLevel (string): "low" lub "medium"
- highlights (array of strings): dokładnie 3 konkretne powody

Format odpowiedzi (wyłącznie JSON, bez markdown):
{
  "destinations": [
    { "city": "...", "description": "...", "tags": ["..."], "budgetLevel": "low", "highlights": ["...", "...", "..."] }
  ]
}`;
}

/** Dopisek do zwykłego promptu, gdy obok samolotu wybrano środek lądowy: część propozycji w zasięgu bez lotu. */
export function mixedPromptLine(candidates: readonly GroundCandidate[]): string {
  if (candidates.length === 0) return "";
  return `\n- Użytkownik dopuszcza też dojazd bez samolotu. Co najmniej 2 z 6 destynacji wybierz spośród tych miejsc w zasięgu (nazwy dokładnie jak niżej, reszta dowolna):\n${candidates.slice(0, 12).map(candidateLine).join("\n")}`;
}

function fromCandidate(candidate: GroundCandidate, over: Record<string, unknown> = {}): DestinationRecommendation {
  const { place, travel } = candidate;
  const tags = Array.isArray(over.tags) ? (over.tags as unknown[]).filter((t): t is TravelStyle => typeof t === "string" && STYLES.has(t)).slice(0, 3) : [];
  const highlights = Array.isArray(over.highlights) ? (over.highlights as unknown[]).filter((h): h is string => typeof h === "string" && h.length > 0).slice(0, 3) : [];
  return {
    city: place.city,
    country: place.country,
    countryFlag: place.countryFlag,
    coverImage: place.coverImage,
    description: typeof over.description === "string" && over.description.trim() ? over.description : place.description,
    tags: tags.length ? tags : place.tags.slice(0, 3),
    budgetLevel: over.budgetLevel === "medium" ? "medium" : over.budgetLevel === "low" ? "low" : place.budgetLevel,
    ...(highlights.length ? { highlights } : {}),
    travel,
  } as DestinationRecommendation;
}

/** Odpowiedź modelu zawężona do listy kandydatów (nazwy bez polskich znaków i angielskie też), uzupełniona do `limit`. */
export function reconcileGround(raw: ReadonlyArray<Record<string, unknown>>, candidates: readonly GroundCandidate[], limit = 6): DestinationRecommendation[] {
  const byCity = new Map(candidates.map((c) => [c.place.city, c]));
  const picked = new Map<string, DestinationRecommendation>();
  for (const entry of raw) {
    if (!entry || typeof entry.city !== "string") continue;
    const place = findGroundPlace(entry.city);
    const candidate = place ? byCity.get(place.city) : undefined;
    if (!candidate || picked.has(candidate.place.city)) continue;
    picked.set(candidate.place.city, fromCandidate(candidate, entry));
    if (picked.size >= limit) break;
  }
  for (const candidate of candidates) {
    if (picked.size >= limit) break;
    if (!picked.has(candidate.place.city)) picked.set(candidate.place.city, fromCandidate(candidate));
  }
  return [...picked.values()];
}

/** Gdy model zawiedzie: pierwsze miejsca z listy, z naszymi opisami (lepsze niż błąd 503). */
export const groundFallback = (candidates: readonly GroundCandidate[], limit = 6): DestinationRecommendation[] =>
  candidates.slice(0, limit).map((candidate) => fromCandidate(candidate));

/** Dojazd lądowy dopisany do propozycji z lotami (gdy obok samolotu wybrano auto, pociąg lub bus albo rower). */
export function annotateTravel(destinations: DestinationRecommendation[], answers: Pick<QuizAnswers, "transport" | "airports" | "duration">): DestinationRecommendation[] {
  return destinations.map((d) => {
    const travel = travelFor(answers, d.city);
    return travel.length ? { ...d, travel } : d;
  });
}

export const NO_REACH_MESSAGE =
  "W zasięgu wybranych środków transportu nie znaleźliśmy miejsc. Dodaj samolot, zmień miasto startu albo wydłuż wyjazd.";
