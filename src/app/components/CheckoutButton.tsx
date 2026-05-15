"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  planKey: string;
  cta: string;
}

export default function CheckoutButton({ planKey, cta }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      if (res.status === 401) { router.push(`/login?next=/pricing`); return; }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError("Nie udało się uruchomić płatności. Spróbuj ponownie.");
    } catch {
      setError("Błąd połączenia. Sprawdź internet i spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="btn-primary mt-5"
        disabled={loading}
        onClick={handleCheckout}
      >
        {loading ? "Przekierowanie…" : cta}
      </button>
      {error && (
        <p className="text-xs mt-2 text-center" style={{ color: "#EF4444" }}>{error}</p>
      )}
    </>
  );
}
