import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import type { DayPlan, TripPlan } from "@/types";

export const maxDuration = 45;

const daySchema: Schema = {
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
};

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.toLowerCase().includes("quota");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Nieprawidłowy format." }, { status: 400 });
  }

  const { tripId, dayIndex } = body as { tripId: string; dayIndex: number };
  if (!tripId || typeof dayIndex !== "number") {
    return NextResponse.json({ error: "Brak wymaganych pól." }, { status: 400 });
  }

  const { data: trip, error } = await supabase
    .from("trips")
    .select("ai_plan_json, city, country, quiz_answers, destination_data")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !trip) return NextResponse.json({ error: "Wycieczka nie znaleziona." }, { status: 404 });

  const plan = trip.ai_plan_json as TripPlan;
  const existingDay = plan.days[dayIndex] as DayPlan | undefined;
  if (!existingDay) return NextResponse.json({ error: "Nieprawidłowy indeks dnia." }, { status: 400 });

  const existingTheme = existingDay.theme;
  const existingActivities = existingDay.activities.map((a) => a.title).join(", ");

  const prompt = `Jesteś ekspertem od budżetowych podróży po Europie.
Wygeneruj ALTERNATYWNY plan dla dnia ${existingDay.day} (${existingDay.date}) wyjazdu do ${trip.city}, ${trip.country}.

Poprzedni plan tego dnia miał motyw: "${existingTheme}" z aktywnościami: ${existingActivities}.
Zaproponuj ZUPEŁNIE INNY motyw i inne aktywności — nie powtarzaj żadnej z powyższych.

Uwzględnij budżetowy charakter wyjazdu (tanie opcje, street food, darmowe atrakcje).
Pole "location" wypełnij dla każdej aktywności z fizyczną lokalizacją.
Godziny aktywności powinny tworzyć sensowny plan całego dnia.

Zachowaj pole "day": ${existingDay.day} i "date": "${existingDay.date}" bez zmian.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key missing" }, { status: 500 });

  const MODELS = [
    { name: "gemini-2.5-flash", thinking: true },
    { name: "gemini-2.0-flash", thinking: false },
    { name: "gemini-2.5-flash-lite", thinking: false },
  ];

  const genAI = new GoogleGenerativeAI(apiKey);
  let newDay: DayPlan | null = null;
  let lastErr: unknown;

  for (const { name, thinking } of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: name,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: daySchema,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(thinking ? ({ thinkingConfig: { thinkingBudget: 0 } } as any) : {}),
        },
      });
      const result = await model.generateContent(prompt);
      newDay = JSON.parse(result.response.text()) as DayPlan;
      break;
    } catch (err) {
      lastErr = err;
      if (isQuotaError(err)) continue;
      throw err;
    }
  }

  if (!newDay) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Persist updated day in Supabase
  const updatedDays = [...plan.days];
  updatedDays[dayIndex] = newDay;
  const updatedPlan = { ...plan, days: updatedDays };

  await supabase
    .from("trips")
    .update({ ai_plan_json: updatedPlan })
    .eq("id", tripId)
    .eq("user_id", user.id);

  return NextResponse.json({ day: newDay });
}
