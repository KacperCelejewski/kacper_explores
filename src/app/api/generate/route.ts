import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

export const maxDuration = 60;
import { buildPlanPrompt, parsePlanResponse, validateAndFixPlan } from "@/lib/gemini";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { validateQuizAnswers, validateDestination, getClientIp } from "@/lib/validate";
import { getUserProfile, canGenerate, isPro } from "@/lib/userProfile";
import { createClient } from "@/lib/supabase/server";
import type { QuizAnswers, DestinationRecommendation } from "@/types";

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    city: { type: SchemaType.STRING },
    country: { type: SchemaType.STRING },
    duration: { type: SchemaType.NUMBER },
    totalBudgetEstimate: { type: SchemaType.STRING },
    budgetBreakdown: {
      type: SchemaType.OBJECT,
      properties: {
        flights: { type: SchemaType.STRING },
        accommodation: { type: SchemaType.STRING },
        food: { type: SchemaType.STRING },
        attractions: { type: SchemaType.STRING },
      },
      required: ["flights", "accommodation", "food", "attractions"],
    },
    generalTips: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    days: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.NUMBER },
          date: { type: SchemaType.STRING },
          theme: { type: SchemaType.STRING },
          activities: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                time: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING },
                cost: { type: SchemaType.STRING },
                location: { type: SchemaType.STRING },
                emoji: { type: SchemaType.STRING },
              },
              required: ["time", "title", "description", "type", "cost", "emoji"],
            },
          },
        },
        required: ["day", "date", "theme", "activities"],
      },
    },
  },
  required: ["city", "country", "duration", "totalBudgetEstimate", "budgetBreakdown", "generalTips", "days"],
};

export async function POST(req: NextRequest) {
  // 1. IP rate limit (ostatnia linia obrony przed botami)
  const ip = getClientIp(req);
  const rl = checkRateLimit(`generate:${ip}`, LIMITS.generate.limit, LIMITS.generate.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele requestów. Spróbuj ponownie za ${rl.resetInSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

  // 2. Auth — wymagane logowanie
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json(
      { error: "Musisz być zalogowany aby generować plany.", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // 3. Sprawdź kredyty / subskrypcję
  if (!canGenerate(profile)) {
    return NextResponse.json(
      { error: "Brak kredytów. Kup pack lub subskrypcję Pro.", code: "NO_CREDITS" },
      { status: 402 }
    );
  }

  // 4. Walidacja inputu
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format żądania." }, { status: 400 });
  }

  const { destination, quizAnswers } = body as {
    destination: unknown;
    quizAnswers: unknown;
  };

  if (!validateDestination(destination) || !validateQuizAnswers(quizAnswers)) {
    return NextResponse.json({ error: "Nieprawidłowe dane wejściowe." }, { status: 400 });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = buildPlanPrompt(
      destination as DestinationRecommendation,
      quizAnswers as QuizAnswers
    );

    // Model fallback chain: best quality first, lighter models as quota backup
    const MODELS = [
      { name: "gemini-2.5-flash", thinking: true },
      { name: "gemini-2.0-flash", thinking: false },
      { name: "gemini-2.5-flash-lite", thinking: false },
      { name: "gemini-flash-latest", thinking: false },
    ];

    function isQuotaError(err: unknown): boolean {
      const msg = err instanceof Error ? err.message : String(err);
      return msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("Too Many Requests");
    }

    let text = "";
    let lastErr: unknown;
    for (const { name, thinking } of MODELS) {
      try {
        const m = genAI.getGenerativeModel({
          model: name,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(thinking ? { thinkingConfig: { thinkingBudget: 0 } } as any : {}),
          },
        });
        const result = await m.generateContent(prompt);
        text = result.response.text();
        break;
      } catch (err) {
        lastErr = err;
        if (isQuotaError(err)) continue; // try next model
        throw err; // non-quota error → bubble up immediately
      }
    }
    if (!text) throw lastErr;

    const dest = destination as DestinationRecommendation;
    const quiz = quizAnswers as QuizAnswers;

    const rawPlan = parsePlanResponse(text);
    const plan = validateAndFixPlan(rawPlan, quiz.duration ?? 3);
    const tripId = `${dest.city.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    // 5. Dekrementuj kredyty (tylko jeśli nie Pro unlimited)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !isPro(profile)) {
      await supabase
        .from("user_profiles")
        .update({
          credits_remaining: Math.max(0, profile.credits_remaining - 1),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    // 6. Zapisz trip w Supabase
    if (user) {
      await supabase.from("trips").insert({
        id: tripId,
        user_id: user.id,
        city: dest.city,
        country: dest.country,
        flight_data: dest.bestOffer,
        ai_plan_json: plan,
        quiz_answers: quiz,
        destination_data: dest,
      });
    }

    return NextResponse.json({
      tripId,
      plan,
      credits_remaining: isPro(profile) ? "unlimited" : Math.max(0, profile.credits_remaining - 1),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Generate error:", message);

    if (message.includes("429") || message.includes("quota") || message.includes("Too Many Requests")) {
      return NextResponse.json(
        { error: "Limit zapytań AI wyczerpany. Spróbuj ponownie za kilka minut lub jutro.", code: "QUOTA_EXCEEDED" },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: "Błąd generowania planu. Spróbuj ponownie.", detail: message }, { status: 500 });
  }
}
