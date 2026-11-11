"use client";

import { useEffect } from "react";
import { GA_ID, purchaseAction, rememberPurchase, trackEvent } from "@/lib/analytics";

// Wysyła zdarzenie purchase raz na sesję Stripe. Strona sukcesu może załadować się przed skryptem GA,
// więc próbujemy co 250 ms przez 10 s.
export default function PurchaseTracker({
  transactionId, value, currency, plan,
}: { transactionId: string; value: number; currency: string; plan: string }) {
  useEffect(() => {
    if (!GA_ID) return;
    let storage: Storage | null = null;
    try { storage = window.sessionStorage; } catch { /* storage zablokowany */ }

    const started = Date.now();
    const timer = window.setInterval(() => {
      const action = purchaseAction(storage, transactionId, !!window.gtag);
      if (action === "send") {
        trackEvent("purchase", {
          transaction_id: transactionId,
          value,
          currency,
          items: [{ item_id: plan, price: value, quantity: 1 }],
        });
        rememberPurchase(storage, transactionId);
      }
      if (action !== "wait" || Date.now() - started > 10_000) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [transactionId, value, currency, plan]);

  return null;
}
