import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logGeminiCall } from "@/lib/geminiLog";

export const maxDuration = 60;
import { buildPlanPrompt, parseNdjsonStream, validateAndFixPlan } from "@/lib/gemini";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { validateQuizAnswers, validateDestination, getClientIp } from "@/lib/validate";
import { getUserProfile, canGenerate, isPro } from "@/lib/userProfile";
import { createServiceClient } from "@/lib/supabase/service";
import { FREE_PLANS_PER_MONTH, plansAvailable } from "@/lib/credits";
import type { QuizAnswers, DestinationRecommendation, FlightDetails } from "@/types";

export async function POST(req: NextRequest) {
  // 1. Auth — wymagane logowanie
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json(
      { error: "Zaloguj się, żeby ułożyć plan.", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // 2. IP rate limit per authenticated user (po auth, żeby anonimowi nie zużywali slotów)
  const ip = getClientIp(req);
  const rl = checkRateLimit(`generate:${ip}`, LIMITS.generate.limit, LIMITS.generate.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Za dużo naraz. Spróbuj za ${rl.resetInSeconds} s.` },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

  // 3. Sprawdź kredyty / subskrypcję
  if (!canGenerate(profile)) {
    return NextResponse.json(
      { error: "Plany na ten miesiąc się skończyły. Dokup Pack albo przejdź na Pro.", code: "NO_CREDITS" },
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

  const { destination, quizAnswers, flightDetails } = body as {
    destination: unknown;
    quizAnswers: unknown;
    flightDetails?: FlightDetails | null;
  };

  if (!validateDestination(destination) || !validateQuizAnswers(quizAnswers)) {
    return NextResponse.json({ error: "Nieprawidłowe dane wejściowe." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim." }, { status: 500 });
  }

  // Plan zajmujemy atomowo przed wywołaniem AI: równoległe żądania nie zużyją tego samego planu.
  // Pro nie zużywa niczego. Gdy generowanie się nie uda, plan wraca w catch poniżej.
  const supabase = createServiceClient();
  let planSource: string | null = null;
  if (!isPro(profile)) {
    const { data, error } = await supabase.rpc("consume_plan_credit", {
      p_user_id: profile.id,
      p_free_limit: FREE_PLANS_PER_MONTH,
    });
    if (error) {
      console.error("Generate: consume_plan_credit", error.message);
      return NextResponse.json({ error: "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim." }, { status: 500 });
    }
    planSource = data as string | null;
    if (!planSource) {
      return NextResponse.json(
        { error: "Plany na ten miesiąc się skończyły. Dokup Pack albo przejdź na Pro.", code: "NO_CREDITS" },
        { status: 402 }
      );
    }
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
        const details = (flightDetails ?? null) as FlightDetails | null;

        const prompt = buildPlanPrompt(dest, quiz, details);

        // Tylko szybkie, bezthinkingowe modele — gemini-2.5-flash z thinking: true
        // i thinkingBudget: 0 to sprzeczność, która dodaje latencję bez korzyści
        const MODELS = [
          "gemini-2.5-flash-lite",
          "gemini-2.5-flash",
          "gemini-flash-latest",
        ];

        function isQuotaError(err: unknown): boolean {
          const msg = err instanceof Error ? err.message : String(err);
          return msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("Too Many Requests");
        }

        const duration = quiz.duration ?? 3;
        let plan = null;
        let lastErr: unknown;
        let usedModel = MODELS[0];
        for (const name of MODELS) {
          try {
            // Bez responseMimeType — to właśnie powodowało buforowanie całej odpowiedzi.
            // Model streamuje tokeny natychmiast, parsujemy linie NDJSON na bieżąco.
            const m = genAI.getGenerativeModel({ model: name });

            send(controller, { status: "generating", total: duration });
            const streamResult = await m.generateContentStream(prompt);

            const { header, days } = await parseNdjsonStream(
              streamResult.stream,
              (day, current) => {
                // Każdy skończony dzień wysyłamy natychmiast do klienta
                send(controller, { status: "day", day, current, total: duration });
              }
            );

            const response = await streamResult.response;
            usedModel = name;
            void logGeminiCall({
              endpoint: "generate",
              model: name,
              success: true,
              input_tokens: response.usageMetadata?.promptTokenCount,
              output_tokens: response.usageMetadata?.candidatesTokenCount,
            });

            const rawPlan = { ...header, days };
            plan = validateAndFixPlan(rawPlan, duration);
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

        // Wyjazd zapisuje tylko klucz serwisowy. profile.id pochodzi z getUser() w kroku 1,
        // więc sesji nie sprawdzamy drugi raz.
        const { error: tripError } = await supabase.from("trips").insert({
          id: tripId,
          user_id: profile.id,
          city: (destination as DestinationRecommendation).city,
          country: (destination as DestinationRecommendation).country,
          flight_data: (destination as DestinationRecommendation).bestOffer,
          ai_plan_json: plan,
          quiz_answers: quizAnswers,
          destination_data: destination,
        });
        // Plan i tak trafia do użytkownika w odpowiedzi, więc plan nie wraca; błąd zostaje w logach
        if (tripError) console.error("Generate: zapis wyjazdu", tripError.message);
        planSource = null;

        send(controller, {
          done: true,
          tripId,
          plan,
          credits_remaining: isPro(profile) ? "unlimited" : Math.max(0, plansAvailable(profile) - 1),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Generate error:", message);
        if (planSource) {
          const { error } = await supabase.rpc("refund_plan_credit", { p_user_id: profile.id, p_source: planSource });
          if (error) console.error("Generate: refund_plan_credit", error.message);
        }
        if (message.includes("429") || message.includes("quota") || message.includes("Too Many Requests")) {
          send(controller, { error: "Na dziś wyczerpaliśmy limit planowania. Wróć za kilka minut albo jutro.", code: "QUOTA_EXCEEDED" });
        } else {
          send(controller, { error: "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.", detail: message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
