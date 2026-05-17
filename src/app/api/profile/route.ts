import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getUserProfile, canGenerate, isPro } from "@/lib/userProfile";
import { createClient } from "@/lib/supabase/server";
import { validateQuizAnswers } from "@/lib/validate";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = await getUserProfile();
  if (!profile || !user) {
    return NextResponse.json({ authenticated: false });
  }

  // Fetch last 5 trips
  const { data: trips } = await supabase
    .from("trips")
    .select("id, city, country, created_at, quiz_answers")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    authenticated: true,
    email: user.email,
    credits_remaining: profile.credits_remaining,
    subscription_tier: profile.subscription_tier,
    is_pro: isPro(profile),
    can_generate: canGenerate(profile),
    quiz_preferences: profile.quiz_preferences ?? null,
    trips: trips ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { quiz_preferences } = body as Record<string, unknown>;

  if (!validateQuizAnswers(quiz_preferences)) {
    return NextResponse.json({ error: "Invalid quiz_preferences" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ quiz_preferences, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete user-owned data (trips cascade-delete related rows via FK)
  await supabase.from("trips").delete().eq("user_id", user.id);
  await supabase.from("payments").delete().eq("user_id", user.id);
  await supabase.from("user_profiles").delete().eq("id", user.id);

  // Delete the auth user — requires service role
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
