import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("trips")
    .select("id, city, country, ai_plan_json, destination_data, flight_data, quiz_answers, is_public")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    city: data.city,
    country: data.country,
    plan: data.ai_plan_json,
    destination: data.destination_data,
    quizAnswers: data.quiz_answers,
    is_public: data.is_public ?? false,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Nieprawidłowy format." }, { status: 400 });
  }

  const { is_public, ai_plan_json } = body as { is_public?: boolean; ai_plan_json?: unknown };

  const updates: Record<string, unknown> = {};
  if (typeof is_public === "boolean") updates.is_public = is_public;
  if (ai_plan_json !== undefined) updates.ai_plan_json = ai_plan_json;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Brak pól do aktualizacji." }, { status: 400 });
  }

  const { error } = await supabase
    .from("trips")
    .update(updates)
    .eq("id", tripId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...updates });
}
