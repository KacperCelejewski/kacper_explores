import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { validateQuizAnswers, getClientIp } from "@/lib/validate";
import { logGeminiCall } from "@/lib/geminiLog";
import type { DestinationRecommendation, TravelStyle, TravelVibe, PlaceType } from "@/types";

export const maxDuration = 30;

const MONTH_NAMES = [
  "styczeń","luty","marzec","kwiecień","maj","czerwiec",
  "lipiec","sierpień","wrzesień","październik","listopad","grudzień",
];

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    destinations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          city:                 { type: SchemaType.STRING },
          country:              { type: SchemaType.STRING },
          countryFlag:          { type: SchemaType.STRING },
          coverImage:           { type: SchemaType.STRING },
          description:          { type: SchemaType.STRING },
          tags:                 { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          budgetLevel:          { type: SchemaType.STRING },
          estimatedFlightCost:  { type: SchemaType.STRING },
          highlights:           { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          vibes:                { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          placeTypes:           { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["city","country","countryFlag","coverImage","description","tags","budgetLevel","estimatedFlightCost","highlights"],
      },
    },
  },
  required: ["destinations"],
};

function buildPrompt(body: Record<string, unknown>): string {
  const styles = (body.styles as string[]) ?? [];
  const budget = body.budget as string ?? "low";
  const vibe = body.vibe as string | null ?? null;
  const placeType = body.placeType as string | null ?? null;
  const month = body.month as number | null ?? null;
  const duration = body.duration as number | null ?? null;
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

  return `Jesteś ekspertem od budżetowych podróży z Polski. Zaproponuj DOKŁADNIE 6 destynacji pasujących do poniższego profilu.

PROFIL PODRÓŻNIKA:
- Budżet: ${budgetLabel}
- Zainteresowania: ${styles.join(", ") || "różnorodne"}
- Energia wyjazdu: ${vibe ? vibeMap[vibe] : "dowolna"}
- Typ miejsca: ${placeType ? placeMap[placeType] : "dowolny"}
- Miesiąc: ${monthName}
- Długość wyjazdu: ${duration ? `${duration} dni` : "nieokreślona"}
- ${originDesc}

ZASADY:
- Propozycje MUSZĄ pasować do podanego budżetu i preferencji
- Priorytet: destynacje dostępne tanimi lotami z podanych lotnisk (Ryanair, Wizz Air, easyJet)
- estimatedFlightCost: realny koszt lotu w obie strony z podanych lotnisk, format "XXX–YYY PLN"
- highlights: 3 konkretne powody dlaczego TO miejsce, nie ogólniki
- tags: wybierz z: nature, history, architecture, food, beach, nightlife
- budgetLevel: "low" jeśli lot < 400 PLN i nocleg < 80 PLN/noc, else "medium"
- coverImage: jeden emoji reprezentujący miasto/kraj
- Nie powtarzaj destynacji z tego samego kraju

Odpowiedz wyłącznie w formacie JSON.`;
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
    return NextResponse.json({ error: "Nieprawidłowe dane wejściowe." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
  }

  const prompt = buildPrompt(body as Record<string, unknown>);
  const start = Date.now();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as { destinations: Array<Record<string, unknown>> };

    void logGeminiCall({ endpoint: "destinations", model: "gemini-2.5-flash", success: true });

    const raw = Array.isArray(parsed.destinations) ? parsed.destinations : [];
    const destinations: DestinationRecommendation[] = raw.map((d) => ({
      city: String(d.city ?? ""),
      country: String(d.country ?? ""),
      countryFlag: String(d.countryFlag ?? "🌍"),
      coverImage: String(d.coverImage ?? "🗺️"),
      description: String(d.description ?? ""),
      tags: ((d.tags ?? []) as string[]).filter(Boolean) as TravelStyle[],
      budgetLevel: (d.budgetLevel === "medium" ? "medium" : "low") as "low" | "medium",
      estimatedFlightCost: String(d.estimatedFlightCost ?? ""),
      highlights: ((d.highlights ?? []) as string[]).filter(Boolean),
      vibes: ((d.vibes ?? []) as string[]) as TravelVibe[],
      placeTypes: ((d.placeTypes ?? []) as string[]) as PlaceType[],
    })).filter((d) => d.city && d.country);

    return NextResponse.json({ destinations });
  } catch (err) {
    void logGeminiCall({ endpoint: "destinations", model: "gemini-2.5-flash", success: false, error_code: "error" });
    console.error("Destinations AI error:", err);
    return NextResponse.json({ error: "Błąd generowania rekomendacji." }, { status: 500 });
  }
}
