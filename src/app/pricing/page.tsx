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
    credits: "5 planów",
    features: [
      "5 wygenerowanych planów",
      "Pełny itinerary godzina po godzinie",
      "Triki budżetowe AI",
      "Bez wygasania",
    ],
    highlight: false,
    cta: "Kup Pack",
    emoji: "🎒",
  },
  {
    key: "pro_monthly",
    name: "Pro",
    price: "19 PLN",
    period: "miesięcznie",
    credits: "Unlimited",
    features: [
      "Nielimitowane plany podróży",
      "Historia wszystkich wyjazdów",
      "Priorytetowe generowanie",
      "Dostęp do nowych funkcji",
    ],
    highlight: true,
    cta: "Zostań Pro",
    emoji: "✨",
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

      if (res.status === 401) {
        router.push(`/login?next=/pricing`);
        return;
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError("Nie udało się uruchomić płatności. Spróbuj ponownie.");
      }
    } catch {
      setCheckoutError("Błąd połączenia. Sprawdź internet i spróbuj ponownie.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 px-5 pb-8">
      <div className="pt-8 pb-6 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-4xl">💎</span>
          <h1 className="text-2xl font-bold mt-3">Wybierz plan</h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Zaczynasz z 1 darmowym planem po rejestracji.
          </p>
        </motion.div>
      </div>

      {checkoutError && (
        <div className="mb-4 glass-card p-3 text-center" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
          <p className="text-sm text-red-400">{checkoutError}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Free tier */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl">🆓</span>
              <h3 className="font-bold mt-1">Free</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                0 PLN
              </p>
            </div>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
            >
              1 plan
            </span>
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Jeden darmowy plan po rejestracji. Bez karty kredytowej.
          </p>
        </motion.div>

        {/* Paid plans */}
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            className="glass-card overflow-hidden"
            style={
              plan.highlight
                ? { border: "1.5px solid rgba(245,158,11,0.5)" }
                : {}
            }
          >
            {plan.highlight && (
              <div
                className="px-5 py-2 text-xs font-bold text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.2))",
                  color: "#f59e0b",
                }}
              >
                ✦ NAJLEPSZY WYBÓR
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl">{plan.emoji}</span>
                  <h3 className="font-bold mt-1 text-lg">{plan.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold gradient-text">{plan.price}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {plan.period}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "#4ade80" }}>✓</span>
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
