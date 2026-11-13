"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { POLISH_AIRPORTS } from "@/lib/airports";
import { ORIGIN_GENITIVE, formatLocal } from "@/lib/drop/email";

interface StripDeal {
  city: string;
  price: number;
  departure_at: string;
  return_at: string;
  hours: number | null;
}

const STORAGE_KEY = "deals_origin";

function readOrigin(): string {
  if (typeof window === "undefined") return "WRO";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && POLISH_AIRPORTS.some((a) => a.code === saved)) return saved;
  } catch { /* storage zablokowany */ }
  return "WRO";
}

// Trzy najtańsze wyjazdy na najbliższy weekend. Bez danych nie pokazuje niczego, więc nie udaje, że okazje są.
export default function DealsStrip() {
  const [origin, setOrigin] = useState(readOrigin);
  const [deals, setDeals] = useState<StripDeal[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/deals?origin=${origin}`)
      .then((r) => (r.ok ? r.json() : { deals: [] }))
      .then((d) => { if (!cancelled) setDeals(Array.isArray(d.deals) ? d.deals : []); })
      .catch(() => { if (!cancelled) setDeals([]); });
    return () => { cancelled = true; };
  }, [origin]);

  const choose = (code: string) => {
    setOrigin(code);
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* storage zablokowany */ }
  };

  if (!deals || deals.length === 0) return null;
  const from = ORIGIN_GENITIVE[origin] ?? origin;

  return (
    <section data-track-section="okazje" style={{ background: "var(--bg-primary)", padding: "40px 28px 8px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Najbliższy weekend z {from}</h2>
          <select
            aria-label="Lotnisko wylotu"
            value={origin}
            onChange={(e) => choose(e.target.value)}
            style={{ fontSize: 13, padding: "6px 8px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)" }}
          >
            {POLISH_AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.city}</option>)}
          </select>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "grid", gap: 10 }}>
          {deals.map((d) => (
            <li key={d.city}>
              <Link
                href={`/okazje/${origin.toLowerCase()}`}
                style={{ display: "block", padding: "14px 16px", borderRadius: 14, textDecoration: "none", color: "inherit", background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <span style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>{d.city}</span>
                  <span style={{ color: "var(--accent)" }}>{d.price} zł</span>
                </span>
                <span style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  {formatLocal(d.departure_at)} → {formatLocal(d.return_at)}{d.hours ? ` · ok. ${d.hours} h na miejscu` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={`/okazje/${origin.toLowerCase()}`}
          style={{ display: "inline-block", marginTop: 12, fontSize: 14, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
        >
          Wszystkie okazje z {from} →
        </Link>
      </div>
    </section>
  );
}
