"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { planPrice } from "@/lib/prices";
import { checkoutErrorMessage, checkoutTrackingEvent } from "@/lib/checkoutFlow";

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
  // Podwójne kliknięcie zanim React przerysuje disabled nie tworzy drugiej sesji ani zdarzenia
  const inFlight = useRef(false);

  const handleCheckout = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, returnTo }),
      });
      const data = await res.json().catch(() => null);
      const event = checkoutTrackingEvent(res.status, data);
      const params = { plan: planKey, gate, value: planPrice(planKey), currency: "PLN" };
      if (event) trackEvent(event, params);
      if (res.status === 401) { router.push(`/login?next=${encodeURIComponent(returnTo)}`); return; }
      if (res.ok && data?.url) window.location.href = data.url;
      else setError(checkoutErrorMessage(res.status, data));
    } catch {
      setError("Nie ma połączenia. Sprawdź internet i kliknij jeszcze raz.");
    } finally {
      inFlight.current = false;
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
