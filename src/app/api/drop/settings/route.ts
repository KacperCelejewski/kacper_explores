import { readJsonBody } from "@/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";
import { computeSettingsUpdate } from "@/lib/drop/signup";
import { logDropEvents } from "@/lib/drop/events";

export const maxDuration = 60;

const GENERIC_ERROR = "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.";

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`drop-settings:${getClientIp(req)}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj za godzinę." }, { status: 429 });
  }

  const parsedBody = await readJsonBody(req, 8 * 1024);
  if (!parsedBody.ok) return parsedBody.response;
  if (!parsedBody.body || typeof parsedBody.body !== "object") {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  const body = parsedBody.body as Record<string, unknown>;

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Ten link jest nieaktualny." }, { status: 404 });

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("newsletter_subscribers")
    .select("id, verified, drop_disabled_reason")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Ten link jest nieaktualny." }, { status: 404 });

  const result = computeSettingsUpdate(row, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  let query = supabase
    .from("newsletter_subscribers")
    .update(result.update)
    .eq("unsubscribe_token", token);
  // zmiana powodu wyłączenia nie może nadpisać skargi ani odbicia, które wpadły po odczycie wiersza
  if ("drop_disabled_reason" in result.update) {
    query = query.or("drop_disabled_reason.is.null,drop_disabled_reason.not.in.(complaint,bounce)");
  }
  const { error } = await query;
  if (error) {
    console.error("[drop] settings update failed:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
  if (result.update.drop_enabled === true || result.update.drop_enabled === false) {
    await logDropEvents(supabase, [{
      event: result.update.drop_enabled ? "consent_given" : "settings_disabled",
      subscriber_id: row.id as string,
      detail: { source: "settings" },
    }]);
  }
  return NextResponse.json({ ok: true });
}
