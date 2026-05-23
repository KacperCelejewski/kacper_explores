import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseServer } from "@/lib/supabase/server";
import { logGeminiCall } from "@/lib/geminiLog";

export const maxDuration = 30;

export interface Restaurant {
  name: string;
  cuisine: string;
  priceRange: "€" | "€€" | "€€€";
  description: string;
  address: string;
  highlight: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Nieprawidłowy format." }, { status: 400 });
  }

  const { city, country } = body as { city: string; country: string };
  if (!city || !country) return NextResponse.json({ error: "Brak danych destynacji." }, { status: 400 });

  const prompt = `Jesteś lokalnym przewodnikiem kulinarnym. Podaj 5 naprawdę istniejących, sprawdzonych restauracji w mieście ${city}, ${country}.
Wybierz różnorodne miejsca: lokalna kuchnia, street food, kawiarnia, coś wyjątkowego.
Używaj TYLKO prawdziwych, znanych restauracji które naprawdę istnieją w tym mieście.

Zwróć JSON array:
[
  {
    "name": "Dokładna nazwa restauracji",
    "cuisine": "Rodzaj kuchni po polsku (np. 'katalońska', 'tapas', 'owoce morza')",
    "priceRange": "€" lub "€€" lub "€€€",
    "description": "1-2 zdania o klimacie i specjalności. Konkretnie i zachęcająco.",
    "address": "Nazwa ulicy lub dzielnicy",
    "highlight": "Jedno must-try danie lub powód dla którego warto tu wpaść"
  }
]

Tylko JSON, bez komentarzy.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key missing" }, { status: 500 });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ thinkingConfig: { thinkingBudget: 0 } } as any),
      },
    });

    const result = await model.generateContent(prompt);
    void logGeminiCall({
      endpoint: "restaurants",
      model: "gemini-2.5-flash",
      success: true,
      input_tokens: result.response.usageMetadata?.promptTokenCount,
      output_tokens: result.response.usageMetadata?.candidatesTokenCount,
    });

    const restaurants = JSON.parse(result.response.text()) as Restaurant[];
    return NextResponse.json({ restaurants });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    void logGeminiCall({
      endpoint: "restaurants",
      model: "gemini-2.5-flash",
      success: false,
      error_code: msg.includes("429") ? "quota" : "error",
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
