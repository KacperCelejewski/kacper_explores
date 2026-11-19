import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import type Stripe from "stripe";
import { sendSlack } from "@/lib/slack";
import { handleStripeRefund, isMissingPaymentColumns, stripeId } from "@/lib/stripe-refunds";

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

  if (event.type === "charge.refunded") {
    const ok = await handleStripeRefund(event);
    return ok ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Refund processing failed" }, { status: 500 });
  }

  const supabase = createServiceClient();

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    // Sesja może być ukończona, a nadal niezapłacona (metody z opóźnionym rozliczeniem).
    // Wtedy czekamy na async_payment_succeeded.
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json({ ok: true });
    }

    const userId = session.metadata?.supabase_user_id;
    const planKey = session.metadata?.plan_key as PlanKey | undefined;

    if (!userId || !planKey || !PLANS[planKey]) {
      console.error("Webhook: missing metadata", session.id);
      return NextResponse.json({ ok: true });
    }

    const plan = PLANS[planKey];

    // UNIQUE sesji chroni insert; RPC idempotentnie kończy także pending grant
    // po przerwaniu procesu między insertem a przyznaniem kredytów.
    const payment = {
      user_id: userId,
      stripe_session_id: session.id,
      stripe_price_id: plan.priceId,
      amount_cents: session.amount_total,
      currency: session.currency,
      credits_added: plan.credits,
      plan_type: planKey,
    };
    const paymentIntentId = stripeId(session.payment_intent);
    let legacySchema = false;
    let { error: insertError } = await supabase.from("payments").insert({
      ...payment,
      stripe_payment_intent_id: paymentIntentId,
      grant_status: planKey === "pack_5" ? "pending" : null,
    });
    if (insertError && isMissingPaymentColumns(insertError)) {
      legacySchema = true;
      console.warn("Webhook: refund migration missing; legacy checkout", session.id);
      ({ error: insertError } = await supabase.from("payments").insert(payment));
    }
    const duplicate = insertError?.code === "23505";
    if (insertError) {
      if (duplicate && (legacySchema || planKey !== "pack_5")) return NextResponse.json({ ok: true });
      if (!duplicate) {
        console.error("Webhook: payment insert failed", session.id, insertError.message);
        return NextResponse.json({ error: "Payment log failed" }, { status: 500 });
      }
    }

    let grantError: { message: string } | null = null;
    if (planKey === "pack_5") {
      const { data, error } = legacySchema
        ? await supabase.rpc("add_credits", { p_user_id: userId, p_credits: plan.credits })
        : await supabase.rpc("grant_credit_pack", {
          p_session_id: session.id, p_payment_intent_id: paymentIntentId,
        });
      grantError = error ?? (!legacySchema && data !== "applied" && data !== "ignored"
        ? { message: "Invalid pack grant result" } : null);
      if (!error && !legacySchema && data === "ignored") return NextResponse.json({ ok: true });
    } else if (planKey === "pro_monthly" || planKey === "pro_yearly") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (planKey === "pro_monthly" ? 35 : 370));
      const { error } = await supabase
        .from("user_profiles")
        .update({
          subscription_tier: "pro",
          subscription_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      grantError = error;
    }

    if (grantError) {
      // Cofamy wpis płatności, żeby ponowienie ze strony Stripe mogło przyznać dostęp.
      console.error("Webhook: grant failed", session.id, grantError.message);
      if (!duplicate) {
        const rollback = supabase.from("payments").delete().eq("stripe_session_id", session.id);
        // Nie usuwaj grantu zatwierdzonego przez RPC, jeżeli zaginęła odpowiedź HTTP.
        await (planKey === "pack_5" && !legacySchema ? rollback.eq("grant_status", "pending") : rollback);
      }
      return NextResponse.json({ error: "Grant failed" }, { status: 500 });
    }

    const amountStr = session.amount_total ? `${(session.amount_total / 100).toFixed(2)} ${(session.currency ?? "pln").toUpperCase()}` : "?";
    void sendSlack(
      `💰 *Nowa płatność!*\nPlan: \`${planKey}\`\nKwota: *${amountStr}*\nUser: \`${userId.slice(0, 8)}...\``
    );
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.warn("Webhook: async payment failed", session.id);
  }

  // Extend Pro subscription on renewal
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    if (invoice.billing_reason !== "subscription_cycle") {
      return NextResponse.json({ ok: true });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile) {
      // Use Stripe's period end + 5-day buffer — works for both monthly and yearly
      const periodEnd = invoice.lines?.data?.[0]?.period?.end;
      const expiresAt = periodEnd
        ? new Date((periodEnd + 5 * 86400) * 1000)
        : (() => { const d = new Date(); d.setDate(d.getDate() + 35); return d; })();

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
