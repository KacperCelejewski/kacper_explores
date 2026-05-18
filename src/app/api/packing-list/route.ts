import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { logGeminiCall } from "@/lib/geminiLog";
import type { QuizAnswers } from "@/types";

export const maxDuration = 30;

const MONTH_NAMES = ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    categories: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          emoji: { type: SchemaType.STRING },
          items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["name", "emoji", "items"],
      },
    },
  },
  required: ["categories"],
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Nieprawidłowy format." }, { status: 400 });
  }

  const { city, country, quizAnswers } = body as {
    city: string;
    country: string;
    quizAnswers: QuizAnswers;
  };

  if (!city || !country) return NextResponse.json({ error: "Brak danych destynacji." }, { status: 400 });

  const duration = quizAnswers?.duration ?? 3;
  const month = quizAnswers?.month ? MONTH_NAMES[quizAnswers.month - 1] : "nieznany";
  const budget = quizAnswers?.budget === "low" ? "backpacker (bardzo oszczędny)" : "komfortowy";

  const prompt = `Wygeneruj listę rzeczy do spakowania na ${duration}-dniowy wyjazd do ${city}, ${country}.
Miesiąc: ${month}. Budżet: ${budget}.
Uwzględnij klimat i charakter destynacji. Bądź praktyczny i konkretny.
Zwróć JSON z kategoriami: Dokumenty, Ubrania, Elektronika, Toaleta, Apteczka, Inne.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key missing" }, { status: 500 });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ thinkingConfig: { thinkingBudget: 0 } } as any),
      },
    });

    const result = await model.generateContent(prompt);
    void logGeminiCall({
      endpoint: "packing-list",
      model: "gemini-2.5-flash",
      success: true,
      input_tokens: result.response.usageMetadata?.promptTokenCount,
      output_tokens: result.response.usageMetadata?.candidatesTokenCount,
    });
    const data = JSON.parse(result.response.text());
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    void logGeminiCall({ endpoint: "packing-list", model: "gemini-2.5-flash", success: false, error_code: msg.includes("429") ? "quota" : "error" });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
