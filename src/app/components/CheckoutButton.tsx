"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { planPrice } from "@/lib/prices";

interface Props {
  planKey: string;
  cta: string;
  // Skąd przyszło kliknięcie (pricing, plan_banner, pdf), do analityki.
  gate?: string;
  // Gdzie wrócić po logowaniu albo po anulowaniu płatności. Domyślnie cennik.
  returnTo?: string;
  className?: string;
  style?: CSSProperties;
  // Bogatsza zawartość przycisku (np. karta z ceną); cta zostaje jako aria-label.
  children?: ReactNode;
}

export default function CheckoutButton({ planKey, cta, gate, returnTo = "/pricing", className = "btn-primary mt-5", style, children }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    trackEvent("begin_checkout", { plan: planKey, gate, value: planPrice(planKey), currency: "PLN" });
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, returnTo }),
      });
      if (res.status === 401) { router.push(`/login?next=${encodeURIComponent(returnTo)}`); return; }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError("Płatność się nie otworzyła. Spróbuj jeszcze raz — zwykle działa za drugim.");
    } catch {
      setError("Nie ma połączenia. Sprawdź internet i kliknij jeszcze raz.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className={className}
        style={{ ...style, ...(loading && children ? { opacity: 0.6 } : null) }}
        disabled={loading}
        aria-busy={loading}
        aria-label={children ? cta : undefined}
        onClick={handleCheckout}
      >
        {children ?? (loading ? "Przekierowanie…" : cta)}
      </button>
      {error && (
        <p className="text-xs mt-2 text-center" style={{ color: "var(--error)" }}>{error}</p>
      )}
    </>
  );
}
