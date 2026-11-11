import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";
import { computeSettingsUpdate } from "@/lib/drop/signup";

export const maxDuration = 60;

const GENERIC_ERROR = "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`drop-settings:${getClientIp(req)}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj za godzinę." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object") throw new Error("bad body");
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Ten link jest nieaktualny." }, { status: 404 });

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("newsletter_subscribers")
    .select("verified, drop_disabled_reason")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Ten link jest nieaktualny." }, { status: 404 });

  const result = computeSettingsUpdate(row, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update(result.update)
    .eq("unsubscribe_token", token);
  if (error) {
    console.error("[drop] settings update failed:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
