import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { sendNewsletterConfirmation } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";
import { randomBytes } from "crypto";

const COUPON_ID = "newsletter_10pct";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `PACK10-${s}`;
}

async function ensureCoupon() {
  try {
    await stripe.coupons.retrieve(COUPON_ID);
  } catch {
    await stripe.coupons.create({
      id: COUPON_ID,
      percent_off: 10,
      duration: "once",
      name: "Newsletter — 10% na Pack",
    });
  }
}

async function createStripePromoCode(code: string): Promise<string> {
  const promo = await stripe.promotionCodes.create({
    coupon: COUPON_ID,
    code,
    max_redemptions: 1,
  });
  return promo.id;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`newsletter:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Zbyt wiele prób. Spróbuj za godzinę." }, { status: 429 });
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
    const newToken = randomBytes(32).toString("hex");
    await supabase
      .from("newsletter_subscribers")
      .update({ verification_token: newToken, token_sent_at: new Date().toISOString() })
      .eq("email", email);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${appUrl}/api/newsletter/verify?token=${newToken}`;
    try {
      await sendNewsletterConfirmation(email, verifyUrl);
    } catch {
      // Don't fail the request if resend is misconfigured
    }
    return NextResponse.json({ pending: true });
  }

  // New subscriber — create Stripe promo code + store with unverified token
  try {
    await ensureCoupon();
  } catch {
    return NextResponse.json({ error: "Błąd konfiguracji zniżki." }, { status: 500 });
  }

  const code = randomCode();
  let stripePromoId: string | null = null;
  let finalCode = code;

  try {
    stripePromoId = await createStripePromoCode(code);
  } catch {
    // Retry with a different code on collision
    const code2 = randomCode();
    try {
      stripePromoId = await createStripePromoCode(code2);
      finalCode = code2;
    } catch {
      return NextResponse.json({ error: "Nie udało się wygenerować kodu. Spróbuj ponownie." }, { status: 500 });
    }
  }

  const token = randomBytes(32).toString("hex");

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email,
    discount_code: finalCode,
    stripe_promo_code_id: stripePromoId,
    verified: false,
    verification_token: token,
    token_sent_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: "Błąd zapisu." }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/newsletter/verify?token=${token}`;

  try {
    await sendNewsletterConfirmation(email, verifyUrl);
  } catch {
    // Don't fail — user can request resend
  }

  return NextResponse.json({ pending: true });
}
