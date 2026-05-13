import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

// Service role client — bypasses RLS for webhook updates
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    const planKey = session.metadata?.plan_key as PlanKey | undefined;

    if (!userId || !planKey || !PLANS[planKey]) {
      console.error("Webhook: missing metadata", session.id);
      return NextResponse.json({ ok: true });
    }

    const plan = PLANS[planKey];

    // Log payment
    await supabase.from("payments").insert({
      user_id: userId,
      stripe_session_id: session.id,
      stripe_price_id: plan.priceId,
      amount_cents: session.amount_total,
      currency: session.currency,
      credits_added: plan.credits,
      plan_type: planKey,
    });

    if (planKey === "pack_5") {
      // Add credits
      await supabase.rpc("add_credits", {
        p_user_id: userId,
        p_credits: plan.credits,
      });
    } else if (planKey === "pro_monthly") {
      // Activate Pro subscription (expires 35 days from now for safety margin)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 35);
      await supabase
        .from("user_profiles")
        .update({
          subscription_tier: "pro",
          subscription_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }
  }

  // Extend Pro subscription on renewal
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile && invoice.billing_reason === "subscription_cycle") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 35);
      await supabase
        .from("user_profiles")
        .update({
          subscription_tier: "pro",
          subscription_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    }
  }

  // Handle subscription cancellation
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile) {
      await supabase
        .from("user_profiles")
        .update({
          subscription_tier: "free",
          subscription_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    }
  }

  return NextResponse.json({ ok: true });
}

// Wymagane: Stripe wysyła raw body — nie parsuj JSON automatycznie
export const runtime = "nodejs";
