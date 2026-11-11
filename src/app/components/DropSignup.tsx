"use client";

import { useState } from "react";
import { POLISH_AIRPORTS } from "@/lib/airports";
import { DROP_MAX_AIRPORTS, DROP_MAX_PRICES } from "@/lib/drop/signup";
import { trackEvent } from "@/lib/analytics";

type State = "idle" | "loading" | "pending" | "enabled";

const GENERIC_ERROR = "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.";

export default function DropSignup() {
  const [email, setEmail] = useState("");
  const [airports, setAirports] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(300);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const toggleAirport = (code: string) => {
    setError(null);
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
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/drop/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), airports, max_price: maxPrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? GENERIC_ERROR);
        setState("idle");
        return;
      }
      trackEvent("drop_signup", { airports: airports.length, max_price: maxPrice });
      setState(data.enabled ? "enabled" : "pending");
    } catch {
      setError(GENERIC_ERROR);
      setState("idle");
    }
  };

  const heading = (
    <>
      <h2
        className="text-xl font-bold leading-snug"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Co czwartek 3 wyjazdy z Twojego lotniska
      </h2>
      <p className="text-sm mt-2 mb-5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Jeden mail, najtańsze loty na weekend. Bez spamu, wypiszesz się jednym kliknięciem.
      </p>
    </>
  );

  if (state === "pending" || state === "enabled") {
    return (
      <div>
        {heading}
        <div
          role="status"
          className="p-5 rounded-2xl"
          style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
        >
          <p className="text-sm font-bold" style={{ color: "#16A34A" }}>
            {state === "pending"
              ? "Sprawdź skrzynkę i potwierdź zapis. Pierwszy zrzut w czwartek."
              : "Zapisane. Pierwszy zrzut w czwartek."}
          </p>
        </div>
      </div>
    );
  }

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
    <div>
      {heading}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div>
          <label htmlFor="drop-email" className="block text-sm font-semibold mb-2">
            E-mail
          </label>
          <input
            id="drop-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="twoj@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            required
            className="w-full px-4 rounded-2xl text-base outline-none"
            style={{
              minHeight: 48,
              background: "var(--bg-primary)",
              border: "1.5px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

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
                  onClick={() => toggleAirport(a.code)}
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
                onClick={() => setMaxPrice(p)}
                style={chip(maxPrice === p)}
              >
                {p} zł
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm" style={{ color: "#DC2626" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "loading" || !email.trim()}
          className="btn-primary disabled:opacity-50"
          style={{ minHeight: 48 }}
        >
          {state === "loading" ? "…" : "Zapisz mnie"}
        </button>
      </form>
    </div>
  );
}
