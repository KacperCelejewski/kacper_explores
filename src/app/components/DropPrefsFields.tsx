"use client";

import { POLISH_AIRPORTS } from "@/lib/airports";
import { DROP_MAX_AIRPORTS, DROP_MAX_PRICES } from "@/lib/drop/signup";

type Props = {
  airports: string[];
  maxPrice: number;
  onToggleAirport: (code: string) => void;
  onMaxPrice: (price: number) => void;
  priceHint?: string;
};

// Lotniska i budżet: wspólne dla zapisu na zrzut i strony ustawień.
export default function DropPrefsFields({ airports, maxPrice, onToggleAirport, onMaxPrice, priceHint }: Props) {
  const chip = (active: boolean, disabled = false): React.CSSProperties => ({
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    background: active ? "var(--accent)" : "var(--bg-primary)",
    color: active ? "white" : "var(--text-primary)",
    border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
  });

  return (
    <>
      <fieldset className="border-0 p-0 m-0 min-w-0">
        <legend className="text-sm font-semibold mb-2">
          Skąd lecisz? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(do {DROP_MAX_AIRPORTS})</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {POLISH_AIRPORTS.map((a) => {
            const active = airports.includes(a.code);
            const disabled = !active && airports.length >= DROP_MAX_AIRPORTS;
            return (
              <button
                key={a.code}
                type="button"
                aria-pressed={active}
                aria-disabled={disabled}
                onClick={() => onToggleAirport(a.code)}
                style={chip(active, disabled)}
              >
                {a.city}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="border-0 p-0 m-0 min-w-0">
        <legend className="text-sm font-semibold mb-2">Lot w obie strony do</legend>
        <div className="flex flex-wrap gap-2">
          {DROP_MAX_PRICES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={maxPrice === p}
              onClick={() => onMaxPrice(p)}
              style={chip(maxPrice === p)}
            >
              {p} zł
            </button>
          ))}
        </div>
        {priceHint && (
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{priceHint}</p>
        )}
      </fieldset>
    </>
  );
}
