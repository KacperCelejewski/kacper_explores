import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { logGeminiCall } from "@/lib/geminiLog";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";
import type { TripPlan } from "@/types";

export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = checkRateLimit(`chat:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: `Zbyt wiele pytań. Spróbuj za ${rl.resetInSeconds}s.` }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Nieprawidłowy format." }, { status: 400 });
  }

  const { tripId, messages } = body as { tripId: string; messages: ChatMessage[] };
  if (!tripId || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Brak wymaganych pól." }, { status: 400 });
  }
  if (messages.length > 50) {
    return NextResponse.json({ error: "Historia rozmowy jest zbyt długa." }, { status: 400 });
  }
  const lastText = messages[messages.length - 1]?.parts?.[0]?.text ?? "";
  if (lastText.length > 2000) {
    return NextResponse.json({ error: "Wiadomość jest zbyt długa (max 2000 znaków)." }, { status: 400 });
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("ai_plan_json, city, country")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!trip) return NextResponse.json({ error: "Wycieczka nie znaleziona." }, { status: 404 });

  const plan = trip.ai_plan_json as TripPlan;
  const planSummary = JSON.stringify({
    city: plan.city,
    country: plan.country,
    duration: plan.duration,
    totalBudget: plan.totalBudgetEstimate,
    budgetBreakdown: plan.budgetBreakdown,
    generalTips: plan.generalTips,
    days: plan.days.map((d) => ({
      day: d.day,
      date: d.date,
      theme: d.theme,
      activities: d.activities.map((a) => ({
        time: a.time,
        title: a.title,
        type: a.type,
        cost: a.cost,
        location: a.location,
      })),
    })),
  });

  const systemInstruction = `Jesteś pomocnym asystentem podróżniczym dla Włóczykij.
Użytkownik pyta o swój plan wyjazdu do ${trip.city}, ${trip.country}.
Masz dostęp do pełnego planu podróży: ${planSummary}
Odpowiadaj po polsku, konkretnie i krótko (max 3-4 zdania).
Bazuj na planie, ale możesz uzupełniać szczegółami. Nie wychodzisz poza temat podróży.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key missing" }, { status: 500 });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      generationConfig: {
        maxOutputTokens: 512,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ thinkingConfig: { thinkingBudget: 0 } } as any),
      },
    });

    // All messages except the last form the history
    const history: ChatMessage[] = messages.slice(0, -1);
    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    void logGeminiCall({
      endpoint: "chat",
      model: "gemini-2.5-flash",
      success: true,
      input_tokens: result.response.usageMetadata?.promptTokenCount,
      output_tokens: result.response.usageMetadata?.candidatesTokenCount,
    });
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    void logGeminiCall({ endpoint: "chat", model: "gemini-2.5-flash", success: false, error_code: msg.includes("429") ? "quota" : "error" });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
