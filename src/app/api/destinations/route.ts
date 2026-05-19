import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { validateQuizAnswers, getClientIp } from "@/lib/validate";
import { logGeminiCall } from "@/lib/geminiLog";
import type { DestinationRecommendation, TravelStyle, TravelVibe, PlaceType } from "@/types";

export const maxDuration = 30;

const MONTH_NAMES = [
  "styczeń","luty","marzec","kwiecień","maj","czerwiec",
  "lipiec","sierpień","wrzesień","październik","listopad","grudzień",
];

function buildPrompt(body: Record<string, unknown>): string {
  const styles = (body.styles as string[]) ?? [];
  const budget = (body.budget as string) ?? "low";
  const vibe = (body.vibe as string | null) ?? null;
  const placeType = (body.placeType as string | null) ?? null;
  const month = (body.month as number | null) ?? null;
  const duration = (body.duration as number | null) ?? null;
  const airports = (body.airports as string[]) ?? ["WRO"];

  const monthName = month ? MONTH_NAMES[month - 1] : "dowolny";
  const budgetLabel = budget === "low" ? "niski (backpacker, do 1500 PLN łącznie)" : "średni (komfortowy, do 2500 PLN łącznie)";
  const vibeMap: Record<string, string> = {
    chill: "relaksujący",
    intense: "intensywny — max atrakcji",
    social: "towarzyski — bary, ludzie",
    active: "aktywny — sport, trasy",
  };
  const placeMap: Record<string, string> = {
    big_city: "duże miasto (metro, muzea)",
    charming: "kameralne miejsce (małe uliczki)",
    beach_sun: "plaża i słońce",
  };

  const originDesc = airports.length === 1
    ? `lotnisko wylotu: ${airports[0]}`
    : `lotniska wylotu (dowolne z): ${airports.join(", ")}`;

  return `Jesteś ekspertem od budżetowych podróży z Polski. Zaproponuj DOKŁADNIE 6 destynacji pasujących do profilu.

PROFIL:
- Budżet: ${budgetLabel}
- Zainteresowania: ${styles.join(", ") || "różnorodne"}
- Energia: ${vibe ? vibeMap[vibe] : "dowolna"}
- Typ miejsca: ${placeType ? placeMap[placeType] : "dowolny"}
- Miesiąc: ${monthName}
- Długość: ${duration ? `${duration} dni` : "nieokreślona"}
- ${originDesc}

Zwróć tablicę JSON "destinations" z dokładnie 6 obiektami. Każdy obiekt MUSI mieć te pola:
- city (string): nazwa miasta
- country (string): nazwa kraju po polsku
- countryFlag (string): flaga emoji
- coverImage (string): jeden emoji reprezentujący miejsce
- description (string): 1-2 zdania dlaczego warto
- tags (array of strings): max 3, wybierz z: nature, history, architecture, food, beach, nightlife
- budgetLevel (string): "low" lub "medium"
- estimatedFlightCost (string): szacowany koszt lotu w obie strony, np. "350–550 PLN"
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
      "estimatedFlightCost": "...",
      "highlights": ["...", "...", "..."]
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`destinations:${ip}`, LIMITS.flights.limit, LIMITS.flights.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele requestów. Spróbuj ponownie za ${rl.resetInSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format żądania." }, { status: 400 });
  }

  if (!validateQuizAnswers(body)) {
    console.error("[destinations] validateQuizAnswers failed:", JSON.stringify(body));
    return NextResponse.json({ error: "Nieprawidłowe dane wejściowe.", detail: "validation_failed" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[destinations] GEMINI_API_KEY not set");
    return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
  }

  const prompt = buildPrompt(body as Record<string, unknown>);

  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];

  for (const modelName of MODELS) {
    try {
      console.log(`[destinations] trying model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`[destinations] raw response (first 300): ${text.slice(0, 300)}`);

      let parsed: { destinations?: Array<Record<string, unknown>> };
      try {
        const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error("[destinations] JSON parse error:", parseErr, "raw:", text.slice(0, 500));
        continue;
      }

      const raw = Array.isArray(parsed.destinations) ? parsed.destinations : [];
      console.log(`[destinations] parsed ${raw.length} destinations`);

      const destinations: DestinationRecommendation[] = raw
        .filter((d) => d && typeof d === "object" && d.city && d.country)
        .map((d) => ({
          city: String(d.city),
          country: String(d.country),
          countryFlag: String(d.countryFlag ?? "🌍"),
          coverImage: String(d.coverImage ?? "🗺️"),
          description: String(d.description ?? ""),
          tags: ((d.tags ?? []) as string[]).filter(Boolean) as TravelStyle[],
          budgetLevel: (d.budgetLevel === "medium" ? "medium" : "low") as "low" | "medium",
          estimatedFlightCost: String(d.estimatedFlightCost ?? ""),
          highlights: ((d.highlights ?? []) as string[]).filter(Boolean),
          vibes: ((d.vibes ?? []) as string[]) as TravelVibe[],
          placeTypes: ((d.placeTypes ?? []) as string[]) as PlaceType[],
        }));

      void logGeminiCall({ endpoint: "destinations", model: modelName, success: true });
      return NextResponse.json({ destinations });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes("429") || msg.includes("503") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("high demand") || msg.toLowerCase().includes("service unavailable") || msg.toLowerCase().includes("overloaded");
      console.error(`[destinations] model ${modelName} error (retryable=${isRetryable}):`, msg);
      void logGeminiCall({ endpoint: "destinations", model: modelName, success: false, error_code: isRetryable ? "quota_503" : "error" });
      if (!isRetryable) {
        return NextResponse.json({ error: `Błąd AI: ${msg}` }, { status: 500 });
      }
      // retryable (quota / 503) → try next model
    }
  }

  return NextResponse.json({ error: "Wszystkie modele AI przeciążone. Spróbuj za chwilę." }, { status: 503 });
}
