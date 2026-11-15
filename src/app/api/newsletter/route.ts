import { readJsonBody } from "@/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNewsletterConfirmation } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";
import { createNewsletterPromo, newVerificationToken, newsletterVerifyUrl } from "@/lib/newsletter";

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`newsletter:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj za godzinę." }, { status: 429 });
  }

  let email: string;
  try {
    const parsedBody = await readJsonBody(req, 2 * 1024);
    if (!parsedBody.ok) return parsedBody.response;
    const body = (parsedBody.body ?? {}) as { email?: unknown };
    email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Podaj prawidłowy adres e-mail." }, { status: 400 });
  }

  // Każdy istniejący adres dostaje tę samą odpowiedź co nowy ({ pending: true }), a kod rabatowy
  // wyłącznie w mailu: obcy adres nie ujawnia ani członkostwa, ani kodu.
  const emailLimit = checkRateLimit(`newsletter-email:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) return NextResponse.json({ pending: true });

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("discount_code, verified, verification_token, token_sent_at")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    let token = existing.verification_token as string | null;
    const sentAt = existing.token_sent_at ? new Date(existing.token_sent_at as string).getTime() : 0;
    const freshLink = !existing.verified && !!token && Date.now() - sentAt < RESEND_COOLDOWN_MS;

    // Świeżo wysłany link zostaje ważny: anonimowe zgłoszenie cudzego adresu nie może go unieważniać.
    if (freshLink) return NextResponse.json({ pending: true });

    if (!existing.verified || !token) {
      token = newVerificationToken();
      await supabase
        .from("newsletter_subscribers")
        .update({ verification_token: token, token_sent_at: new Date().toISOString() })
        .eq("email", email);
    }
    try {
      await sendNewsletterConfirmation(email, newsletterVerifyUrl(token));
    } catch {
      // Don't fail the request if resend is misconfigured
    }
    return NextResponse.json({ pending: true });
  }

  // New subscriber — create Stripe promo code + store with unverified token
  let promo: { code: string; stripePromoId: string };
  try {
    promo = await createNewsletterPromo();
  } catch {
    return NextResponse.json({ error: "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim." }, { status: 500 });
  }

  const token = newVerificationToken();

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email,
    discount_code: promo.code,
    stripe_promo_code_id: promo.stripePromoId,
    verified: false,
    verification_token: token,
    token_sent_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim." }, { status: 500 });

  try {
    await sendNewsletterConfirmation(email, newsletterVerifyUrl(token));
  } catch (err) {
    console.error("[newsletter] failed to send confirmation email:", err);
  }

  return NextResponse.json({ pending: true });
}
