import Link from "next/link";
import { stripe } from "@/lib/stripe";
import PurchaseTracker from "./PurchaseTracker";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  let isPro = false;
  let valid = false;
  let purchase: { id: string; value: number; currency: string; plan: string } | null = null;

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["line_items"],
      });
      valid = session.payment_status === "paid" || session.status === "complete";
      isPro = session.mode === "subscription";
      if (valid && session.amount_total != null) {
        purchase = {
          id: session.id,
          value: session.amount_total / 100,
          currency: (session.currency ?? "pln").toUpperCase(),
          plan: session.metadata?.plan_key ?? "unknown",
        };
      }
    } catch {
      // invalid or expired session_id — treat as unknown
    }
  }

  return (
    <div className="flex flex-col flex-1 px-5 pb-8 justify-center items-center text-center">
      {purchase && (
        <PurchaseTracker transactionId={purchase.id} value={purchase.value} currency={purchase.currency} plan={purchase.plan} />
      )}
      <span className="text-6xl" aria-hidden="true">🎒</span>
      <h1 className="text-2xl font-bold mt-4">
        {!valid ? "Prawie gotowe." : isPro ? "Pro działa." : "Pack jest Twój."}
      </h1>
      <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
        {!valid
          ? "Płatność jeszcze się księguje. Plany pojawią się na koncie za chwilę."
          : isPro
          ? "Teraz możesz lecieć ile chcesz. Do roboty."
          : "Masz na koncie 5 planów więcej. Dokąd tym razem?"}
      </p>

      <Link
        href="/quiz"
        className="btn-primary"
        style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "2rem" }}
      >
        Zaplanuj wyjazd →
      </Link>

      <Link href="/profile">
        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          Przejdź do profilu
        </p>
      </Link>
    </div>
  );
}
