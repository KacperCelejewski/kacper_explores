import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/validate";

export async function POST(req: NextRequest) {
  // Rate limit: max 10 checkout attempts per hour per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`checkout:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Zbyt wiele prób." }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Musisz być zalogowany." }, { status: 401 });
  }

  const { planKey }: { planKey: PlanKey } = await req.json();
  const plan = PLANS[planKey];
  if (!plan) {
    return NextResponse.json({ error: "Nieprawidłowy plan." }, { status: 400 });
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("user_profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: plan.type === "subscription" ? "subscription" : "payment",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    allow_promotion_codes: true,
    metadata: {
      supabase_user_id: user.id,
      plan_key: planKey,
    },
    locale: "pl",
  });

  return NextResponse.json({ url: session.url });
}
