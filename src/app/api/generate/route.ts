import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { logGeminiCall } from "@/lib/geminiLog";

export const maxDuration = 60;
import { buildPlanPrompt, parsePlanResponse, validateAndFixPlan } from "@/lib/gemini";
import { searchCheapestFlight } from "@/lib/flights/rapidapi";
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
  // 1. Auth — wymagane logowanie
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json(
      { error: "Musisz być zalogowany aby generować plany.", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // 2. IP rate limit per authenticated user (po auth, żeby anonimowi nie zużywali slotów)
  const ip = getClientIp(req);
  const rl = checkRateLimit(`generate:${ip}`, LIMITS.generate.limit, LIMITS.generate.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Zbyt wiele requestów. Spróbuj ponownie za ${rl.resetInSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
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

  const { destination, quizAnswers, selectedFlight } = body as {
    destination: unknown;
    quizAnswers: unknown;
    selectedFlight?: import("@/lib/flights/rapidapi").RealFlight | null;
  };

  if (!validateDestination(destination) || !validateQuizAnswers(quizAnswers)) {
    return NextResponse.json({ error: "Nieprawidłowe dane wejściowe." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, obj: object) => {
    try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch { /* stream closed */ }
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        send(controller, { status: "thinking" });

        const genAI = new GoogleGenerativeAI(apiKey);
        const dest = destination as DestinationRecommendation;
        const quiz = quizAnswers as QuizAnswers;

        const realFlight: import("@/lib/flights/rapidapi").RealFlight | null =
          selectedFlight !== undefined
            ? (selectedFlight ?? null)
            : quiz.month
            ? await searchCheapestFlight(
                dest.bestOffer.origin.code,
                dest.bestOffer.destination.code,
                quiz.month,
                quiz.duration ?? 3
              ).catch(() => null)
            : null;

        const prompt = buildPlanPrompt(dest, quiz, realFlight);

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

        let plan = null;
        let lastErr: unknown;
        let usedModel = MODELS[0].name;
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
            usedModel = name;
            void logGeminiCall({
              endpoint: "generate",
              model: name,
              success: true,
              input_tokens: result.response.usageMetadata?.promptTokenCount,
              output_tokens: result.response.usageMetadata?.candidatesTokenCount,
            });
            const text = result.response.text();
            const rawPlan = parsePlanResponse(text);
            plan = validateAndFixPlan(rawPlan, quiz.duration ?? 3);
            break;
          } catch (err) {
            lastErr = err;
            if (isQuotaError(err)) {
              void logGeminiCall({ endpoint: "generate", model: name, success: false, error_code: "quota" });
              continue;
            }
            if (err instanceof SyntaxError) { continue; }
            void logGeminiCall({ endpoint: "generate", model: name, success: false, error_code: "parse_error" });
            throw err;
          }
        }
        if (!plan) {
          void logGeminiCall({ endpoint: "generate", model: usedModel, success: false, error_code: "all_models_failed" });
          throw lastErr;
        }

        const tripId = `${(destination as DestinationRecommendation).city.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

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
        if (user) {
          await supabase.from("trips").insert({
            id: tripId,
            user_id: user.id,
            city: (destination as DestinationRecommendation).city,
            country: (destination as DestinationRecommendation).country,
            flight_data: (destination as DestinationRecommendation).bestOffer,
            ai_plan_json: plan,
            quiz_answers: quizAnswers,
            destination_data: destination,
          });
        }

        send(controller, {
          done: true,
          tripId,
          plan,
          credits_remaining: isPro(profile) ? "unlimited" : Math.max(0, profile.credits_remaining - 1),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Generate error:", message);
        if (message.includes("429") || message.includes("quota") || message.includes("Too Many Requests")) {
          send(controller, { error: "Limit zapytań AI wyczerpany. Spróbuj ponownie za kilka minut lub jutro.", code: "QUOTA_EXCEEDED" });
        } else {
          send(controller, { error: "Błąd generowania planu. Spróbuj ponownie.", detail: message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
