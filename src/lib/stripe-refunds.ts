import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export function stripeId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function isMissingRpc(error: { code?: string; message: string }, name: string): boolean {
  return (error.code === "PGRST202" || error.code === "42883") && error.message.includes(name);
}

export function isMissingPaymentColumns(error: { code?: string; message: string }): boolean {
  return (error.code === "PGRST204" || error.code === "42703")
    && /stripe_payment_intent_id|grant_status/.test(error.message);
}

export async function handleStripeRefund(event: Stripe.ChargeRefundedEvent): Promise<boolean> {
  const charge = event.data.object;
  const paymentIntentId = stripeId(charge.payment_intent);
  const record = {
    event_id: event.id,
    event_created: event.created,
    livemode: event.livemode,
    charge_id: charge.id,
    payment_intent_id: paymentIntentId,
    customer_id: stripeId(charge.customer),
    amount_cents: charge.amount,
    amount_refunded_cents: charge.amount_refunded,
    currency: charge.currency,
    refund_scope: charge.amount > 0 && charge.amount_refunded === charge.amount ? "full" : "partial",
  };
  const manualReview = (reason: string, status = "manual_review") => {
    console.warn("Webhook: refund requires manual review", JSON.stringify({
      ...record, status, reason, automatic_entitlement_change: false,
    }));
  };

  try {
    // Powiązanie wyłącznie przez PI/Checkout, nigdy przez sam Customer ani metadata Charge.
    // InvoicePayment obejmuje też odnowienia Pro bez osobnego wpisu w payments.
    const sessions = paymentIntentId
      ? await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 }) : null;
    const session = sessions?.data[0];
    const invoicePayments = paymentIntentId && !session
      ? await stripe.invoicePayments.list({
        payment: { type: "payment_intent", payment_intent: paymentIntentId }, limit: 1,
      }) : null;
    const { data, error } = await createServiceClient().rpc("process_credit_refund", {
      p_event_id: event.id,
      p_charge_id: charge.id,
      p_payment_intent_id: paymentIntentId,
      p_customer_id: record.customer_id,
      p_livemode: event.livemode,
      p_event_created: event.created,
      p_currency: charge.currency,
      p_amount_cents: charge.amount,
      p_amount_refunded_cents: charge.amount_refunded,
      p_session_id: session?.id ?? null,
      p_is_invoice_payment: session?.mode === "subscription" || !!invoicePayments?.data.length,
    });
    if (error) {
      // Wyjątek wdrożeniowy wymagany w briefie: kod przed migracją → log do
      // ręcznego uzgodnienia. Nie ukrywamy pozostałych błędów RPC odpowiedzią 200.
      if (isMissingRpc(error, "process_credit_refund")) {
        manualReview("refund_migration_missing");
        return true;
      }
      console.error("Webhook: refund RPC failed", event.id, error.code);
      return false;
    }
    if (!data || !["applied", "skipped", "missing_payment"].includes(data.outcome)) {
      console.error("Webhook: invalid refund RPC result", event.id);
      return false;
    }
    if (data.status === "manual_review" || data.status === "pending_payment") {
      manualReview(data.reason, data.status);
    }
    return true;
  } catch {
    // Brak logowania payloadu/błędów dostawcy (mogą zawierać dane osobowe).
    console.error("Webhook: refund processing failed", event.id);
    return false;
  }
}
