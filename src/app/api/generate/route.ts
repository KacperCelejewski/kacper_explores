import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { buildPlanPrompt, parsePlanResponse } from "@/lib/gemini";
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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const prompt = buildPlanPrompt(
      destination as DestinationRecommendation,
      quizAnswers as QuizAnswers
    );
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const plan = parsePlanResponse(text);

    const dest = destination as DestinationRecommendation;
    const quiz = quizAnswers as QuizAnswers;
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
      });
    }

    return NextResponse.json({
      tripId,
      plan,
      credits_remaining: isPro(profile) ? "unlimited" : Math.max(0, profile.credits_remaining - 1),
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: "Błąd generowania planu. Spróbuj ponownie." }, { status: 500 });
  }
}
