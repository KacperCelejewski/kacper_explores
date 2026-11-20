import { readJsonBody } from "@/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { validateQuizAnswers, getClientIp } from "@/lib/validate";
import { logGeminiCall } from "@/lib/geminiLog";
import { budgetPromptLabel, VIBE_LABELS, PLACE_LABELS, DESTINATION_CACHE_TTL_MS } from "@/lib/constants";
import { destinationCacheKey } from "@/lib/destinationCacheKey";
import { excludeOriginCities, originExclusionPrompt } from "@/lib/originCities";
import { monthYearLabel } from "@/lib/tripMonth";
import { effectiveRegions, normalizeFoundation } from "@/lib/quizOptions";
import { filterByRegions, regionPromptLine, regionRetryLine } from "@/lib/regionFilter";
import type { DestinationRecommendation, TravelStyle, TravelVibe, PlaceType, Region } from "@/types";

export const maxDuration = 30;

// Cache w pamięci: te same preferencje quiz → te same destynacje przez 10 minut
// Unika powtórnych wywołań Gemini (~10–20s) przy odświeżeniu lub retry
const destCache = new Map<string, { data: DestinationRecommendation[]; ts: number }>();

function cacheKey(body: Record<string, unknown>): string {
  return destinationCacheKey(body);
}

function buildPrompt(body: Record<string, unknown>, retryNote = ""): string {
  const styles = (body.styles as string[]) ?? [];
  const budget = (body.budget as string) ?? "low";
  const vibe = (body.vibe as string | null) ?? null;
  const placeType = (body.placeType as string | null) ?? null;
  const month = (body.month as number | null) ?? null;
  const duration = (body.duration as number | null) ?? null;
  const airports = (body.airports as string[]) ?? ["WRO"];
  const preferredCity = (body.preferredCity as string | undefined) ?? null;

  const monthName = month ? monthYearLabel(month) : "dowolny";
  const budgetLabel = budgetPromptLabel(budget === "low" || budget === "high" ? budget : "medium");
  const regions = effectiveRegions(normalizeFoundation(body));

  const originDesc = airports.length === 1
    ? `lotnisko wylotu: ${airports[0]}`
    : `lotniska wylotu (dowolne z): ${airports.join(", ")}`;

  return `Jesteś ekspertem od budżetowych podróży z Polski. Zaproponuj DOKŁADNIE 6 destynacji pasujących do profilu.
${preferredCity ? `\nWAŻNE: Użytkownik wybrał miasto ${preferredCity} — MUSI ono być pierwszą rekomendacją na liście.\n` : ""}
PROFIL:
- Budżet: ${budgetLabel}
- Zainteresowania: ${styles.join(", ") || "różnorodne"}
- Energia: ${vibe ? VIBE_LABELS[vibe] : "dowolna"}
- Typ miejsca: ${placeType ? PLACE_LABELS[placeType] : "dowolny"}
- Miesiąc: ${monthName}
- Długość: ${duration ? `${duration} dni` : "nieokreślona"}
- ${originDesc}
${originExclusionPrompt(airports)}${regionPromptLine(regions) ? `\n${regionPromptLine(regions)}` : ""}${retryNote}

Zwróć tablicę JSON "destinations" z dokładnie 6 obiektami. Każdy obiekt MUSI mieć te pola:
- city (string): nazwa miasta
- country (string): nazwa kraju po polsku
- countryFlag (string): flaga emoji
- coverImage (string): jeden emoji reprezentujący miejsce
- description (string): 1-2 zdania dlaczego warto
- tags (array of strings): max 3, wybierz z: nature, history, architecture, food, beach, nightlife
- budgetLevel (string): ${budget === "high" ? '"low", "medium" lub "high" (high dla dalekich wypraw powyżej 3000 PLN)' : '"low" lub "medium"'}
- highlights (array of strings): dokładnie 3 konkretne powody

Format odpowiedzi (wyłącznie JSON, bez markdown):
{
  "destinations": [
    {
      "city": "...",
      "country": "...",
      "countryFlag": "...",
      "coverImage": "...",
      "description": "...",
      "tags": ["..."],
      "budgetLevel": "low",
      "highlights": ["...", "...", "..."]
    }
  ]
}`;
}

const MAX_DESTINATIONS = 6;
const norm = (city: string) => city.trim().toLowerCase();

/**
 * Zostawia tylko kierunki z wybranych regionów. Gdy po odfiltrowaniu jest ich mniej niż 6, prosi o uzupełnienie
 * (raz) i znów filtruje; kierunek spoza regionu nigdy nie trafia do wyniku.
 */
async function keepInRegions(
  candidates: DestinationRecommendation[],
  regions: readonly Region[],
  preferredCity: string | null,
  topUp: (rejectedCities: string[], keptCities: string[]) => Promise<DestinationRecommendation[]>,
): Promise<DestinationRecommendation[]> {
  const firstPass = filterByRegions(candidates, regions, preferredCity);
  if (firstPass.kept.length >= MAX_DESTINATIONS) return firstPass.kept.slice(0, MAX_DESTINATIONS);
  const extra = await topUp(firstPass.rejected.map((d) => d.city), firstPass.kept.map((d) => d.city));
  const seen = new Set(firstPass.kept.map((d) => norm(d.city)));
  const merged = [...firstPass.kept];
  for (const d of filterByRegions(extra, regions, preferredCity).kept) {
    if (seen.has(norm(d.city))) continue;
    seen.add(norm(d.city));
    merged.push(d);
  }
  return merged.slice(0, MAX_DESTINATIONS);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`destinations:${ip}`, LIMITS.flights.limit, LIMITS.flights.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Za dużo naraz. Spróbuj za ${rl.resetInSeconds} s.` },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

  const parsedBody = await readJsonBody(req, 16 * 1024);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.body;

  if (!validateQuizAnswers(body)) {
    console.error("[destinations] validateQuizAnswers failed");
    return NextResponse.json({ error: "Nieprawidłowe dane wejściowe.", detail: "validation_failed" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[destinations] GEMINI_API_KEY not set");
    return NextResponse.json({ error: "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim." }, { status: 500 });
  }

  // Sprawdź cache przed wywołaniem Gemini
  const key = cacheKey(body as Record<string, unknown>);
  const cached = destCache.get(key);
  if (cached && Date.now() - cached.ts < DESTINATION_CACHE_TTL_MS) {
    console.log("[destinations] cache hit");
    return NextResponse.json({ destinations: cached.data });
  }

  const prompt = buildPrompt(body as Record<string, unknown>);
  const regions = effectiveRegions(normalizeFoundation(body as Record<string, unknown>));
  const preferredCity = (body as { preferredCity?: string }).preferredCity ?? null;
  const originAirports = (body as { airports?: string[] }).airports ?? ["WRO"];

  // Szybszy model najpierw — flash-lite wystarczy do polecenia destynacji
  const MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
  let answeredEmpty = false;

  for (const modelName of MODELS) {
    try {
      console.log(`[destinations] trying model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });

      // Jedno zapytanie do modelu: surowa odpowiedź -> kandydaci bez miast wylotu (null, gdy nie da się jej odczytać).
      const ask = async (text: string): Promise<DestinationRecommendation[] | null> => {
        const result = await model.generateContent(text);
        const raw = result.response.text();
        console.log(`[destinations] raw response (first 300): ${raw.slice(0, 300)}`);
        let parsed: { destinations?: Array<Record<string, unknown>> };
        try {
          const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          parsed = JSON.parse(cleaned);
        } catch (parseErr) {
          console.error("[destinations] JSON parse error:", parseErr, "raw:", raw.slice(0, 500));
          return null;
        }
        const list = Array.isArray(parsed.destinations) ? parsed.destinations : [];
        console.log(`[destinations] parsed ${list.length} destinations`);
        const candidates: DestinationRecommendation[] = list
          .filter((d) => d && typeof d === "object" && d.city && d.country)
          .map((d) => ({
            city: String(d.city),
            country: String(d.country),
            countryFlag: String(d.countryFlag ?? "🌍"),
            coverImage: String(d.coverImage ?? "🗺️"),
            description: String(d.description ?? ""),
            tags: ((d.tags ?? []) as string[]).filter(Boolean) as TravelStyle[],
            budgetLevel: (d.budgetLevel === "medium" || d.budgetLevel === "high" ? d.budgetLevel : "low") as DestinationRecommendation["budgetLevel"],
            highlights: ((d.highlights ?? []) as string[]).filter(Boolean),
            vibes: ((d.vibes ?? []) as string[]) as TravelVibe[],
            placeTypes: ((d.placeTypes ?? []) as string[]) as PlaceType[],
          }));
        // Prompt prosi o pominięcie miast wylotu, ale model bywa nieposłuszny, więc filtrujemy też odpowiedź.
        return excludeOriginCities(candidates, originAirports);
      };

      const first = await ask(prompt);
      if (first === null) continue;
      void logGeminiCall({ endpoint: "destinations", model: modelName, success: true });

      let destinations = first;
      if (regions.length > 0) destinations = await keepInRegions(first, regions, preferredCity, async (rejected, kept) => {
        // Uzupełnienie: jedno powtórne zapytanie z listą odrzuconych; jego błąd nie psuje tego, co już mamy.
        try {
          const more = await ask(buildPrompt(body as Record<string, unknown>, regionRetryLine(regions, rejected, kept)));
          void logGeminiCall({ endpoint: "destinations", model: modelName, success: more !== null });
          return more ?? [];
        } catch (err) {
          console.error("[destinations] region top-up failed:", err instanceof Error ? err.message : String(err));
          void logGeminiCall({ endpoint: "destinations", model: modelName, success: false, error_code: "error" });
          return [];
        }
      });

      if (destinations.length === 0 && regions.length > 0) { answeredEmpty = true; continue; }
      destCache.set(key, { data: destinations, ts: Date.now() });
      return NextResponse.json({ destinations });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes("429") || msg.includes("503") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("high demand") || msg.toLowerCase().includes("service unavailable") || msg.toLowerCase().includes("overloaded");
      console.error(`[destinations] model ${modelName} error (retryable=${isRetryable}):`, msg);
      void logGeminiCall({ endpoint: "destinations", model: modelName, success: false, error_code: isRetryable ? "quota_503" : "error" });
      if (!isRetryable) {
        return NextResponse.json({ error: "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim." }, { status: 500 });
      }
      // retryable (quota / 503) → try next model
    }
  }

  // Model odpowiedział, ale nic nie mieściło się w wybranym regionie: pusta lista (nie błąd dostawcy), bez cache.
  if (answeredEmpty) return NextResponse.json({ destinations: [] });
  return NextResponse.json({ error: "Mamy teraz tłok. Spróbuj za minutę." }, { status: 503 });
}
