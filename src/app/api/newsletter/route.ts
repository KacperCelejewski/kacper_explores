import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";

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

  // Return existing code if already subscribed
  const { data: existing } = await supabase
    .from("newsletter_subscribers")
    .select("discount_code")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ code: existing.discount_code, alreadySubscribed: true });
  }

  // Create Stripe coupon (idempotent) + unique promo code
  try {
    await ensureCoupon();
  } catch {
    return NextResponse.json({ error: "Błąd konfiguracji zniżki." }, { status: 500 });
  }

  const code = randomCode();
  let stripePromoId: string | null = null;

  try {
    const promo = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: COUPON_ID },
      code,
      max_redemptions: 1,
    });
    stripePromoId = promo.id;
  } catch {
    // Stripe promo code creation failed (e.g. code collision) — retry once with new code
    const code2 = randomCode();
    try {
      const promo2 = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: COUPON_ID },
        code: code2,
        max_redemptions: 1,
      });
      stripePromoId = promo2.id;
      const { error } = await supabase.from("newsletter_subscribers").insert({
        email,
        discount_code: code2,
        stripe_promo_code_id: stripePromoId,
      });
      if (error) return NextResponse.json({ error: "Błąd zapisu." }, { status: 500 });
      return NextResponse.json({ code: code2 });
    } catch {
      return NextResponse.json({ error: "Nie udało się wygenerować kodu. Spróbuj ponownie." }, { status: 500 });
    }
  }

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email,
    discount_code: code,
    stripe_promo_code_id: stripePromoId,
  });

  if (error) return NextResponse.json({ error: "Błąd zapisu." }, { status: 500 });

  return NextResponse.json({ code });
}
