import Link from "next/link";
import { redirect } from "next/navigation";
import { IconBackpack } from "@/app/components/Icons";
import { stripe } from "@/lib/stripe";
import PurchaseTracker from "./PurchaseTracker";
import { purchaseFromSession } from "@/lib/analytics";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;
  // Bez identyfikatora sesji nie ma czego potwierdzać; człowiek trafił tu z zakładki albo ze starego linku
  if (!session_id) redirect("/pricing");

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
      purchase = purchaseFromSession(session);
    } catch {
      // invalid or expired session_id — treat as unknown
    }
  }

  return (
    <div className="flex flex-col flex-1 px-5 pb-8 justify-center items-center text-center">
      {purchase && (
        <PurchaseTracker transactionId={purchase.id} value={purchase.value} currency={purchase.currency} plan={purchase.plan} />
      )}
      <span style={{ color: "var(--accent)" }}><IconBackpack size={56} /></span>
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
