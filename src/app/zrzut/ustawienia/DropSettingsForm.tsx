"use client";

import { useState } from "react";
import DropPrefsFields from "@/app/components/DropPrefsFields";
import { DROP_MAX_AIRPORTS, HARD_DISABLED_MESSAGE, NOT_VERIFIED_MESSAGE } from "@/lib/drop/signup";

type Props = {
  token: string;
  initial: { airports: string[]; maxPrice: number; enabled: boolean; verified: boolean; hardDisabled: boolean };
};

const GENERIC_ERROR = "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.";

export default function DropSettingsForm({ token, initial }: Props) {
  const [airports, setAirports] = useState<string[]>(initial.airports);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleAirport = (code: string) => {
    setError(null);
    setSaved(false);
    setAirports((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      return prev.length >= DROP_MAX_AIRPORTS ? prev : [...prev, code];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (airports.length === 0) {
      setError("Wybierz przynajmniej jedno lotnisko.");
      return;
    }
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/drop/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          airports,
          max_price: maxPrice,
          // Zablokowanemu adresowi nie ruszamy przełącznika
          ...(initial.hardDisabled ? {} : { drop_enabled: enabled }),
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? GENERIC_ERROR);
      else setSaved(true);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const blockedNote = initial.hardDisabled
    ? HARD_DISABLED_MESSAGE
    : !initial.verified
      ? NOT_VERIFIED_MESSAGE
      : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 mt-5">
      <DropPrefsFields
        airports={airports}
        maxPrice={maxPrice}
        onToggleAirport={toggleAirport}
        onMaxPrice={(p) => { setMaxPrice(p); setSaved(false); }}
      />

      {initial.hardDisabled ? (
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{blockedNote}</p>
      ) : (
        <div>
          <label className="flex items-center gap-3 text-sm font-semibold" style={{ minHeight: 44 }}>
            <input
              type="checkbox"
              checked={enabled}
              disabled={!initial.verified && !enabled}
              onChange={(e) => { setEnabled(e.target.checked); setSaved(false); setError(null); }}
              style={{ width: 20, height: 20, accentColor: "var(--accent)" }}
            />
            Wysyłaj zrzut
          </label>
          {blockedNote && (
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{blockedNote}</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm" style={{ color: "var(--error)" }}>{error}</p>
      )}
      {saved && (
        <p role="status" className="text-sm font-bold" style={{ color: "var(--success)" }}>Zapisane.</p>
      )}

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50" style={{ minHeight: 48 }}>
        {loading ? "…" : "Zapisz"}
      </button>
    </form>
  );
}
