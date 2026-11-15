"use client";

import { useEffect, useState } from "react";
import type { CardFlightPrice } from "@/lib/flights/card-price";
import type { DestinationRecommendation, QuizAnswers } from "@/types";

/** Independent from the persistent destination store: cached places must not freeze fares. */
export function useFlightPrices(destinations: DestinationRecommendation[], quiz: QuizAnswers, enabled: boolean) {
  const request = enabled && destinations.length && quiz.month && quiz.duration ? JSON.stringify({
    destinations: destinations.slice(0, 6).map(({ city, country }) => ({ city, country })),
    quizAnswers: {
      month: quiz.month, duration: quiz.duration, airports: quiz.airports,
      companion: quiz.companion, group: quiz.group,
    },
  }) : null;
  const [result, setResult] = useState<{ request: string; prices: (CardFlightPrice | null)[] } | null>(null);

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    fetch("/api/destination-flight-prices", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: request,
      cache: "no-store", signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted && Array.isArray(data.prices)) setResult({
          request,
          prices: data.prices.map((quote: CardFlightPrice | null) => quote && quote.expiresAt > Date.now() ? quote : null),
        });
      })
      .catch(() => { /* Cards and Aviasales remain usable without a cache quote. */ });
    return () => controller.abort();
  }, [request]);

  useEffect(() => {
    const expiries = result?.prices.flatMap((quote) => quote ? [quote.expiresAt] : []) ?? [];
    if (!expiries.length) return;
    const timer = setTimeout(() => setResult((current) => current ? {
      ...current, prices: current.prices.map((quote) => quote && quote.expiresAt > Date.now() ? quote : null),
    } : null), Math.max(0, Math.min(...expiries) - Date.now()));
    return () => clearTimeout(timer);
  }, [result]);

  return result?.request === request ? result?.prices ?? [] : [];
}
