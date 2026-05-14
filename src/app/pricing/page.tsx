"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const PLANS = [
  {
    key: "pack_5",
    name: "Pack",
    price: "5 PLN",
    period: "jednorazowo",
    features: [
      "5 planów podróży",
      "Pełny itinerary godzina po godzinie",
      "Triki budżetowe AI",
      "Bez wygasania",
    ],
    highlight: false,
    cta: "Kup Pack →",
    emoji: "🎒",
  },
  {
    key: "pro_monthly",
    name: "Pro",
    price: "19 PLN",
    period: "miesięcznie",
    features: [
      "Nielimitowane plany podróży",
      "Historia wszystkich wyjazdów",
      "Priorytetowe generowanie",
      "Dostęp do nowych funkcji",
    ],
    highlight: true,
    cta: "Zostań Pro →",
    emoji: "✦",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async (planKey: string) => {
    setLoading(planKey);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      if (res.status === 401) { router.push(`/login?next=/pricing`); return; }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setCheckoutError("Nie udało się uruchomić płatności. Spróbuj ponownie.");
    } catch {
      setCheckoutError("Błąd połączenia. Sprawdź internet i spróbuj ponownie.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 px-5 pb-8">
      <div className="pt-10 pb-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent)" }}>
            Plany
          </p>
          <h1 className="text-3xl font-bold leading-tight">
            Wybierz swój plan.
          </h1>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Zaczynasz z 1 darmowym planem po rejestracji.
          </p>
        </motion.div>
      </div>

      {checkoutError && (
        <div className="mb-4 p-3 rounded-2xl text-center" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-sm" style={{ color: "#EF4444" }}>{checkoutError}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Free tier */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl flex items-center justify-between"
          style={{ background: "#F7F7F5", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="font-bold text-sm">Free</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Po rejestracji · bez karty
            </p>
          </div>
          <span
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: "var(--border)", color: "var(--text-muted)" }}
          >
            1 plan
          </span>
        </motion.div>

        {/* Paid plans */}
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: plan.highlight ? `2px solid var(--accent)` : "1px solid var(--border)",
              boxShadow: plan.highlight ? "0 4px 20px rgba(255,107,53,0.12)" : "0 1px 8px rgba(0,0,0,0.04)",
            }}
          >
            {plan.highlight && (
              <div
                className="px-5 py-2 text-xs font-bold text-center tracking-wider uppercase"
                style={{ background: "var(--accent)", color: "white" }}
              >
                Najlepszy wybór
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xl">{plan.emoji}</span>
                  <h3 className="font-bold text-lg mt-1">{plan.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{plan.price}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{plan.period}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--accent-light)" }}
                    >
                      <span className="text-xs" style={{ color: "var(--accent)" }}>✓</span>
                    </div>
                    <p className="text-sm">{f}</p>
                  </div>
                ))}
              </div>

              <button
                className="btn-primary mt-5"
                disabled={loading === plan.key}
                onClick={() => handleCheckout(plan.key)}
              >
                {loading === plan.key ? "Przekierowanie…" : plan.cta}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-center mt-6" style={{ color: "var(--text-muted)" }}>
        Płatności obsługuje Stripe · Bezpieczne i szyfrowane
      </p>
    </div>
  );
}
