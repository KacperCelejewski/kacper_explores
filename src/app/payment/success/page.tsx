import Link from "next/link";
import { stripe } from "@/lib/stripe";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  let isPro = false;
  let valid = false;

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["line_items"],
      });
      valid = session.payment_status === "paid" || session.status === "complete";
      isPro = session.mode === "subscription";
    } catch {
      // invalid or expired session_id — treat as unknown
    }
  }

  return (
    <div className="flex flex-col flex-1 px-5 pb-8 justify-center items-center text-center">
      <span className="text-6xl">{valid ? "🎉" : "✅"}</span>
      <h1 className="text-2xl font-bold mt-4">
        {isPro ? "Subskrypcja Pro aktywna!" : "Płatność udana!"}
      </h1>
      <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
        {isPro
          ? "Masz teraz nielimitowane plany podróży. Miłego włóczenia!"
          : "5 planów podróży zostało dodanych do Twojego konta."}
      </p>

      <Link
        href="/quiz"
        className="btn-primary"
        style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "2rem" }}
      >
        Zaplanuj podróż →
      </Link>

      <Link href="/profile">
        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          Przejdź do profilu
        </p>
      </Link>
    </div>
  );
}
