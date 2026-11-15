// Liczby w panelu /admin/analytics. Tabela payments zapisuje każdy webhook Stripe, także z trybu testowego
// (sesje cs_test_) i zamówienia 0 zł (kod -100%). Przychód to tylko sesje live z kwotą > 0.

export interface PaymentLike {
  user_id: string;
  stripe_session_id: string;
  amount_cents: number | null;
  plan_type: string | null;
  created_at: string;
}

export function isRealPayment(p: Pick<PaymentLike, "stripe_session_id" | "amount_cents">): boolean {
  return p.stripe_session_id.startsWith("cs_live_") && (p.amount_cents ?? 0) > 0;
}

export function revenueCents(payments: PaymentLike[], sinceIso?: string): number {
  return payments
    .filter((p) => isRealPayment(p) && (!sinceIso || p.created_at >= sinceIso))
    .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
}

// Pro opłacone = konto Pro z prawdziwą płatnością planu pro_*; reszta to nadania ręczne (SQL, panel, testy).
export function splitPro(
  profiles: { id: string; subscription_tier: string }[],
  payments: PaymentLike[],
): { paid: number; manual: number } {
  const paidUsers = new Set(payments.filter((p) => isRealPayment(p) && p.plan_type?.startsWith("pro_")).map((p) => p.user_id));
  const pro = profiles.filter((p) => p.subscription_tier === "pro");
  const paid = pro.filter((p) => paidUsers.has(p.id)).length;
  return { paid, manual: pro.length - paid };
}
