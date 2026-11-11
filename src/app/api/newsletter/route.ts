import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendNewsletterConfirmation } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";
import { createNewsletterPromo, newVerificationToken, newsletterVerifyUrl } from "@/lib/newsletter";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`newsletter:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj za godzinę." }, { status: 429 });
  }

  let email: string;
  try {
    const body = await req.json();
    email = (body.email ?? "").toString().trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Podaj prawidłowy adres e-mail." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // If already subscribed and verified — resend email with existing code
  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("discount_code, verified, verification_token")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.verified) {
      // Already done — just return code directly (they own this email)
      return NextResponse.json({ code: existing.discount_code, alreadySubscribed: true });
    }
    // Not yet verified — generate fresh token so expiry window resets
    const newToken = newVerificationToken();
    await supabase
      .from("newsletter_subscribers")
      .update({ verification_token: newToken, token_sent_at: new Date().toISOString() })
      .eq("email", email);
    try {
      await sendNewsletterConfirmation(email, newsletterVerifyUrl(newToken));
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
