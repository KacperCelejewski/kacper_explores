import { randomBytes } from "crypto";
import { stripe } from "@/lib/stripe";
import { STRIPE_NEWSLETTER_COUPON_ID } from "@/lib/constants";

const PROMO_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePromoCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += PROMO_CODE_CHARS[Math.floor(Math.random() * PROMO_CODE_CHARS.length)];
  return `PACK10-${s}`;
}

async function ensureCoupon() {
  try {
    await stripe.coupons.retrieve(STRIPE_NEWSLETTER_COUPON_ID);
  } catch {
    await stripe.coupons.create({
      id: STRIPE_NEWSLETTER_COUPON_ID,
      percent_off: 10,
      duration: "once",
      name: "Newsletter — 10% na Pro Roczny",
    });
  }
}

async function createStripePromoCode(code: string): Promise<string> {
  const promo = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: STRIPE_NEWSLETTER_COUPON_ID },
    code,
    max_redemptions: 1,
  });
  return promo.id;
}

/** Kod 10% w Stripe dla nowego adresu. Rzuca, gdy Stripe nie odpowiada. */
export async function createNewsletterPromo(): Promise<{ code: string; stripePromoId: string }> {
  await ensureCoupon();
  const code = generatePromoCode();
  try {
    return { code, stripePromoId: await createStripePromoCode(code) };
  } catch {
    // Kolizja kodu — drugie podejście z innym kodem
    const code2 = generatePromoCode();
    return { code: code2, stripePromoId: await createStripePromoCode(code2) };
  }
}

export function newVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

export function newsletterVerifyUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/newsletter/verify?token=${token}`;
}
