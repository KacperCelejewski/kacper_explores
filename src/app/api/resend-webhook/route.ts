import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";
import { disableReasonFor } from "@/lib/drop/signup";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] brak RESEND_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event;
  try {
    // verify sprawdza tylko podpis, klucz API nie jest używany, ale konstruktor go wymaga
    const resend = new Resend(process.env.RESEND_API_KEY ?? "re_unused");
    event = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const reason = disableReasonFor(event.type);
  if (!reason) return NextResponse.json({ ok: true });

  const to = (event.data as { to?: unknown }).to;
  const email = Array.isArray(to) && typeof to[0] === "string" ? to[0].trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ ok: true });

  // Skargi nie nadpisujemy odbiciem
  let query = createServiceClient()
    .from("newsletter_subscribers")
    .update({ drop_enabled: false, drop_disabled_reason: reason })
    .eq("email", email);
  if (reason === "bounce") {
    query = query.or("drop_disabled_reason.is.null,drop_disabled_reason.neq.complaint");
  }
  const { error } = await query;
  if (error) {
    console.error("[resend-webhook] update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
