"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { POLISH_AIRPORTS } from "@/lib/airports";
import { resolveOrigin } from "@/lib/drop/defaults";
import { ORIGIN_GENITIVE, formatLocal } from "@/lib/drop/email";

export interface StripDeal {
  city_code: string;
  city: string;
  price: number;
  departure_at: string;
  return_at: string;
  hours: number | null;
}

const STORAGE_KEY = "deals_origin";

function readSavedOrigin(fallback: string): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return resolveOrigin(saved);
  } catch { /* storage zablokowany */ }
  return fallback;
}

// Trzy najtańsze wyjazdy na najbliższy weekend. Pierwsze lotnisko przychodzi z serwera,
// więc sekcja jest w HTML od razu; po zmianie lotniska dane dociągamy w przeglądarce.
// Bez danych nie pokazuje niczego, więc nie udaje, że okazje są.
export default function DealsStrip({
  initialDeals = [],
  initialOrigin = "WRO",
  onOriginChange,
}: {
  initialDeals?: StripDeal[];
  initialOrigin?: string;
  onOriginChange?: (code: string) => void;
}) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [deals, setDeals] = useState<StripDeal[]>(initialDeals);
  // false, gdy dane dla bieżącego lotniska jeszcze nie dotarły: karty wtedy nie pasują do nagłówka
  const [ready, setReady] = useState(true);
  const requestId = useRef(0);

  // Tylko ostatnie zapytanie ma prawo ustawić dane, więc spóźniona odpowiedź ze starego lotniska nic nie nadpisze
  const load = (code: string) => {
    const id = ++requestId.current;
    if (code === initialOrigin) { setDeals(initialDeals); setReady(true); return; }
    setReady(false);
    fetch(`/api/deals?origin=${code}`)
      .then((r) => (r.ok ? r.json() : { deals: [] }))
      .then((d) => { if (id === requestId.current) { setDeals(Array.isArray(d.deals) ? d.deals : []); setReady(true); } })
      .catch(() => { if (id === requestId.current) { setDeals([]); setReady(true); } });
  };

  // Zapamiętane lotnisko czytamy dopiero po zamontowaniu, żeby HTML z serwera i pierwszy render były takie same
  useEffect(() => {
    const saved = readSavedOrigin(initialOrigin);
    if (saved !== initialOrigin) {
      setOrigin(saved);
      load(saved);
    }
    return () => { requestId.current++; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (code: string) => {
    setOrigin(code);
    onOriginChange?.(code);
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* storage zablokowany */ }
    load(code);
  };

  // Bez danych na starcie nie pokazujemy nic. Po wyborze innego lotniska sekcja zostaje, żeby dało się wybrać kolejne.
  if (deals.length === 0 && origin === initialOrigin && ready) return null;
  const from = ORIGIN_GENITIVE[origin] ?? origin;
  const slug = origin.toLowerCase();

  return (
    <section data-track-section="okazje" style={{ background: "var(--bg-primary)", padding: "64px 28px 8px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 10px" }}>
          Okazje na weekend
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "clamp(28px, 7vw, 40px)", lineHeight: 1.1, fontWeight: 700, margin: 0 }}>
            Najbliższy weekend z {from}
          </h2>
          <select
            aria-label="Lotnisko wylotu"
            value={origin}
            onChange={(e) => choose(e.target.value)}
            style={{ fontSize: 14, minHeight: 40, padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-surface)" }}
          >
            {POLISH_AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.city}</option>)}
          </select>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "10px 0 0", lineHeight: 1.5 }}>
          Lot w obie strony, ceny z ostatnich wyszukiwań. Przed zakupem sprawdź aktualną cenę.
        </p>
        {deals.length === 0 && (
          <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "16px 0 0" }}>
            {ready ? `Na ten weekend nie ma jeszcze okazji z ${from}. Wybierz inne lotnisko albo zapisz się niżej.` : "Szukam okazji…"}
          </p>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "grid", gap: 10 }}>
          {ready && deals.map((d) => (
            <li key={d.city_code}>
              <Link
                href={`/okazje/${slug}#${d.city_code}`}
                style={{ display: "block", padding: "14px 16px", borderRadius: 14, textDecoration: "none", color: "inherit", background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <span style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>{d.city}</span>
                  <span style={{ color: "var(--accent)" }}>{d.price} zł</span>
                </span>
                <span style={{ display: "block", fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
                  {formatLocal(d.departure_at)} → {formatLocal(d.return_at)}{d.hours ? ` · ok. ${d.hours} h na miejscu` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", marginTop: 10 }}>
          <Link
            href={`/okazje/${slug}`}
            style={{ display: "inline-block", padding: "10px 0", fontSize: 15, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
          >
            Wszystkie okazje z {from} →
          </Link>
          <a
            href="#zrzut"
            style={{ display: "inline-block", padding: "10px 0", fontSize: 15, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
          >
            Dostawaj to co czwartek →
          </a>
        </div>
      </div>
    </section>
  );
}
