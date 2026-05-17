import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import type { DayActivity, TripPlan } from "@/types";

export const maxDuration = 30;

const activitySchema: Schema = {
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

  const { tripId, dayIndex, activityIndex } = body as {
    tripId: string;
    dayIndex: number;
    activityIndex: number;
  };

  if (!tripId || typeof dayIndex !== "number" || typeof activityIndex !== "number") {
    return NextResponse.json({ error: "Brak wymaganych pól." }, { status: 400 });
  }

  const { data: trip, error } = await supabase
    .from("trips")
    .select("ai_plan_json, city, country")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !trip) return NextResponse.json({ error: "Wycieczka nie znaleziona." }, { status: 404 });

  const plan = trip.ai_plan_json as TripPlan;
  const day = plan.days[dayIndex];
  if (!day) return NextResponse.json({ error: "Nieprawidłowy indeks dnia." }, { status: 400 });

  const current = day.activities[activityIndex] as DayActivity | undefined;
  if (!current) return NextResponse.json({ error: "Nieprawidłowy indeks aktywności." }, { status: 400 });

  const otherTitles = day.activities
    .map((a) => a.title)
    .filter((_, i) => i !== activityIndex)
    .join(", ");

  const prompt = `Jesteś ekspertem od budżetowych podróży.
Zaproponuj JEDNĄ alternatywną aktywność zastępującą "${current.title}" w ${trip.city}, ${trip.country}.

Wymagania:
- Typ aktywności: "${current.type}" (zachowaj ten sam typ)
- Godzina: "${current.time}" (zachowaj dokładnie tę godzinę)
- Nie powtarzaj żadnej z pozostałych aktywności tego dnia: ${otherTitles}
- Zaproponuj coś ZUPEŁNIE INNEGO od "${current.title}"
- Budżetowy charakter — tanie lub darmowe opcje preferowane
- Wypełnij pole "location" z dokładną lokalizacją w ${trip.city}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key missing" }, { status: 500 });

  const MODELS = [
    { name: "gemini-2.5-flash", thinking: true },
    { name: "gemini-2.0-flash", thinking: false },
    { name: "gemini-2.5-flash-lite", thinking: false },
  ];

  const genAI = new GoogleGenerativeAI(apiKey);
  let newActivity: DayActivity | null = null;
  let lastErr: unknown;

  for (const { name, thinking } of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: name,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: activitySchema,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(thinking ? ({ thinkingConfig: { thinkingBudget: 0 } } as any) : {}),
        },
      });
      const result = await model.generateContent(prompt);
      newActivity = JSON.parse(result.response.text()) as DayActivity;
      break;
    } catch (err) {
      lastErr = err;
      if (isQuotaError(err)) continue;
      throw err;
    }
  }

  if (!newActivity) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Persist
  const updatedActivities = [...day.activities];
  updatedActivities[activityIndex] = newActivity;
  const updatedDays = [...plan.days];
  updatedDays[dayIndex] = { ...day, activities: updatedActivities };
  const updatedPlan = { ...plan, days: updatedDays };

  await supabase
    .from("trips")
    .update({ ai_plan_json: updatedPlan })
    .eq("id", tripId)
    .eq("user_id", user.id);

  return NextResponse.json({ activity: newActivity });
}
