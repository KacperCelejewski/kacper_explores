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
import { destinationMatchesTripType, destinationTripTypePrompt, filterDestinationsForTripType } from "@/lib/tripType";
import { effectiveRegions, isTripType, normalizeFoundation } from "@/lib/quizOptions";
import { filterByRegions, matchesRegions, MIN_CACHED_REGION_RESULTS, regionPromptLine, regionRetryLine } from "@/lib/regionFilter";
import { groundModes, reachablePlaces, usesFlights } from "@/lib/transport";
import { annotateTravel, groundDestinationPrompt, groundFallback, mixedPromptLine, NO_REACH_MESSAGE, reconcileGround } from "@/lib/transport/destinations";
import type { DestinationRecommendation, QuizAnswers, TravelStyle, TravelVibe, PlaceType, Region, TripType } from "@/types";

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

  const tripType = isTripType(body.tripType) ? body.tripType : null;
  const monthName = month ? monthYearLabel(month) : "dowolny";
  const budgetLabel = budgetPromptLabel(budget === "low" || budget === "high" ? budget : "medium");
  // Wybrane miasto z galerii wygrywa z regionem: quiz wtedy nie pyta o region, a stary wybór nie może po cichu zawężać reszty.
  const regions = preferredCity ? [] : effectiveRegions(normalizeFoundation(body));

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
${originExclusionPrompt(airports)}${regionPromptLine(regions) ? `\n${regionPromptLine(regions)}` : ""}${destinationTripTypePrompt(tripType, month) ? `\n${destinationTripTypePrompt(tripType, month).trim()}` : ""}${retryNote}

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
// Limity czasu uzupełnienia (maxDuration = 30 s): po TOP_UP_START_LIMIT_MS od startu już o nie nie prosimy,
// a rozpoczęte przerywamy po TOP_UP_HARD_LIMIT_MS, żeby odpowiedź zdążyła wyjść przed końcem funkcji.
const TOP_UP_START_LIMIT_MS = 8_000;
const TOP_UP_HARD_LIMIT_MS = 25_000;
const norm = (city: string) => city.trim().toLowerCase();

/**
 * Zostawia tylko kierunki z wybranych regionów. Gdy po odfiltrowaniu jest ich mniej niż 6, prosi o uzupełnienie
 * (raz) i znów filtruje; kierunek spoza regionu nigdy nie trafia do wyniku. `topUp` zwraca null, gdy uzupełnienia
 * nie dało się zrobić (czas, błąd): wtedy `checked` jest false i pusty wynik nie znaczy "w regionie nic nie ma".
 */
async function keepInRegions(
  candidates: DestinationRecommendation[],
  regions: readonly Region[],
  topUp: (rejectedCities: string[], keptCities: string[]) => Promise<DestinationRecommendation[] | null>,
): Promise<{ items: DestinationRecommendation[]; checked: boolean }> {
  const firstPass = filterByRegions(candidates, regions);
  if (firstPass.kept.length >= MAX_DESTINATIONS) return { items: firstPass.kept.slice(0, MAX_DESTINATIONS), checked: true };
  const extra = await topUp(firstPass.rejected.map((d) => d.city), firstPass.kept.map((d) => d.city));
  const seen = new Set(firstPass.kept.map((d) => norm(d.city)));
  const merged = [...firstPass.kept];
  for (const d of filterByRegions(extra ?? [], regions).kept) {
    if (seen.has(norm(d.city))) continue;
    seen.add(norm(d.city));
    merged.push(d);
  }
  return { items: merged.slice(0, MAX_DESTINATIONS), checked: extra !== null };
}

const TIMED_OUT = Symbol("timed-out");
const withTimeout = <T>(work: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(TIMED_OUT), Math.max(0, ms));
    work.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
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

  const preferredCity = (body as { preferredCity?: string }).preferredCity ?? null;
  const regions = preferredCity ? [] : effectiveRegions(normalizeFoundation(body as Record<string, unknown>));
  const originAirports = (body as { airports?: string[] }).airports ?? ["WRO"];
  const activeType = isTripType((body as { tripType?: unknown }).tripType) ? (body as { tripType: TripType }).tripType : null;
  const preferredLower = preferredCity ? preferredCity.trim().toLowerCase() : null;

  // Transport: sam samolot (i brak wyboru) działa jak dotąd; bez samolotu model wybiera z listy miejsc w zasięgu.
  // Region i rodzaj wyjazdu zawężają tę listę tak samo jak odpowiedź modelu przy lotach.
  const answers = body as unknown as QuizAnswers;
  const flying = usesFlights(answers);
  const candidates = groundModes(answers).length > 0
    ? reachablePlaces(answers, 24, (p) => matchesRegions(p.country, regions))
    : [];
  // Narty, góry i plaża wymagają potwierdzenia w opisie (nasza lista miejsc nie niesie danych o stokach):
  // wtedy zostają tylko miejsca, które model sam opisał jako pasujące, bez dopełniania listy.
  const strictType = activeType !== null && !destinationMatchesTripType({ city: "" }, activeType);
  if (!flying && candidates.length === 0) {
    return NextResponse.json({ destinations: [], note: NO_REACH_MESSAGE });
  }
  const mixedLine = flying ? mixedPromptLine(candidates) : "";
  const prompt = flying ? buildPrompt(body as Record<string, unknown>, mixedLine) : groundDestinationPrompt(answers, candidates);
  // Rodzaj wyjazdu to cel, nie ozdoba: dla nart zostają tylko miejsca z infrastrukturą narciarską.
  // Miasto wybrane przez użytkownika zostaje, bo to jego jawna decyzja.
  let droppedByType = 0;

  // Szybszy model najpierw — flash-lite wystarczy do polecenia destynacji
  const MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

  // Gdy model zwrócił kierunki, ale żaden nie pasuje do rodzaju wyjazdu (np. same miasta dla nart), próbujemy dalej.
  let sawMismatch = false;

  for (const modelName of MODELS) {
    try {
      console.log(`[destinations] trying model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });

      // Bez lotów: model wybiera z naszej listy, a odpowiedź uzgadniamy z nią po stronie serwera.
      if (!flying) {
        const text = (await model.generateContent(prompt)).response.text();
        console.log(`[destinations] raw response (first 300): ${text.slice(0, 300)}`);
        let parsed: { destinations?: Array<Record<string, unknown>> };
        try {
          parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim());
        } catch (parseErr) {
          console.error("[destinations] JSON parse error:", parseErr, "raw:", text.slice(0, 500));
          continue;
        }
        const groundList = reconcileGround(Array.isArray(parsed.destinations) ? parsed.destinations : [], candidates, MAX_DESTINATIONS, {
          topUp: !strictType,
          accept: (entry) => destinationMatchesTripType({
            city: String(entry.city),
            description: typeof entry.description === "string" ? entry.description : "",
            highlights: Array.isArray(entry.highlights) ? entry.highlights.filter((h): h is string => typeof h === "string") : [],
          }, activeType),
        });
        void logGeminiCall({ endpoint: "destinations", model: modelName, success: true });
        // Brak pasujących miejsc nie jest awarią i nie trafia do cache (jak przy lotach).
        if (groundList.length === 0) return NextResponse.json({ destinations: [] });
        destCache.set(key, { data: groundList, ts: Date.now() });
        return NextResponse.json({ destinations: groundList });
      }

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
        const notOrigin = excludeOriginCities(candidates, originAirports);
        const fitting = new Set(filterDestinationsForTripType(notOrigin, activeType));
        const byType = notOrigin.filter((d) => fitting.has(d) || (preferredLower !== null && d.city.toLowerCase() === preferredLower));
        droppedByType += notOrigin.length - byType.length;
        return byType;
      };

      const first = await ask(prompt);
      if (first === null) continue;
      if (first.length === 0 && droppedByType > 0 && regions.length === 0) {
        console.error("[destinations] no destination matches tripType", activeType);
        sawMismatch = true;
        void logGeminiCall({ endpoint: "destinations", model: modelName, success: false, error_code: "trip_type_mismatch" });
        continue;
      }
      void logGeminiCall({ endpoint: "destinations", model: modelName, success: true });

      let destinations = first;
      let checked = true;
      if (regions.length > 0) {
        const kept = await keepInRegions(first, regions, async (rejected, keptCities) => {
          // Uzupełnienie: jedno powtórne zapytanie z listą odrzuconych; jego błąd nie psuje tego, co już mamy.
          // Przy wolnej pierwszej odpowiedzi go pomijamy, a rozpoczęte przerywamy (limit czasu funkcji).
          const elapsed = Date.now() - startedAt;
          if (elapsed > TOP_UP_START_LIMIT_MS) return null;
          try {
            const more = await withTimeout(ask(buildPrompt(body as Record<string, unknown>, mixedLine + regionRetryLine(regions, rejected, keptCities))), TOP_UP_HARD_LIMIT_MS - elapsed);
            void logGeminiCall({ endpoint: "destinations", model: modelName, success: more !== TIMED_OUT && more !== null });
            return more === TIMED_OUT ? null : (more ?? []);
          } catch (err) {
            console.error("[destinations] region top-up failed:", err instanceof Error ? err.message : String(err));
            void logGeminiCall({ endpoint: "destinations", model: modelName, success: false, error_code: "error" });
            return null;
          }
        });
        destinations = kept.items;
        checked = kept.checked;
      }

      // Nic nie mieściło się w regionie: pusta lista (to nie błąd dostawcy), bez ponawiania drugim modelem
      // (limit czasu) i bez cache. Gdy uzupełnienia nie zdążyliśmy zrobić, to zwykły "tłok", nie brak kierunków.
      if (destinations.length === 0 && regions.length > 0) {
        return checked
          ? NextResponse.json({ destinations: [] })
          : NextResponse.json({ error: "Mamy teraz tłok. Spróbuj za minutę." }, { status: 503 });
      }
      // Obok samolotu wybrano też auto, pociąg lub bus albo rower: dopisujemy nasz szacunek dojazdu.
      destinations = annotateTravel(destinations, answers);
      // Za mało propozycji z regionu nie zostaje w cache, żeby kolejna próba mogła trafić lepiej.
      if (regions.length === 0 || destinations.length >= MIN_CACHED_REGION_RESULTS) destCache.set(key, { data: destinations, ts: Date.now() });
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

  // Bez lotów mamy własną listę z opisami: lepsza niż błąd, gdy model jest przeciążony.
  // Przy rodzaju wyjazdu, którego nie umiemy sprawdzić sami (narty, góry, plaża), uczciwy jest błąd, nie przypadkowa lista.
  if (!flying) {
    return strictType
      ? NextResponse.json({ error: "Mamy teraz tłok. Spróbuj za minutę." }, { status: 503 })
      : NextResponse.json({ destinations: groundFallback(candidates) });
  }

  // Model odpowiadał, ale nic nie pasowało do rodzaju wyjazdu: to pusta lista, nie awaria dostawcy.
  if (sawMismatch) return NextResponse.json({ destinations: [] });
  return NextResponse.json({ error: "Mamy teraz tłok. Spróbuj za minutę." }, { status: 503 });
}
