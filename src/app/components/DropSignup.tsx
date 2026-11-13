"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { DROP_MAX_AIRPORTS } from "@/lib/drop/signup";
import DropPrefsFields from "./DropPrefsFields";
import { trackEvent } from "@/lib/analytics";
import { pickDefaultMaxPrice } from "@/lib/drop/defaults";
import { ORIGIN_GENITIVE } from "@/lib/drop/email";

type State = "idle" | "loading" | "pending" | "enabled";

const GENERIC_ERROR = "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.";

type Props = {
  /** Lotniska zaznaczone na start (strona zna je z adresu, zapamiętanego wyboru albo z quizu) */
  defaultAirports?: string[];
  /** Najtańsza okazja z tego lotniska (from = „Wrocławia”): z niej wynika domyślny budżet i podpowiedź pod nim */
  cheapestHint?: { from: string; price: number } | null;
  /** Własny nagłówek, gdy formularz stoi w innym kontekście (cennik, blog) */
  title?: string;
  lead?: string;
  /** Zwinięty do jednej linii, rozwija się po kliknięciu; do środka długich list i artykułów */
  collapsed?: boolean;
};

export default function DropSignup({ defaultAirports, cheapestHint = null, title, lead, collapsed = false }: Props) {
  const [email, setEmail] = useState("");
  const [airports, setAirports] = useState<string[]>(defaultAirports ?? []);
  const [maxPrice, setMaxPrice] = useState<number>(() => pickDefaultMaxPrice(cheapestHint?.price ?? null));
  const emailId = useId();
  const touched = useRef(false);
  const defaultsKey = (defaultAirports ?? []).join(",");
  const hintPrice = cheapestHint?.price ?? null;

  // Strona główna zna zapamiętane lotnisko dopiero po zamontowaniu; nie nadpisujemy wyboru użytkownika
  useEffect(() => {
    if (touched.current) return;
    setAirports(defaultsKey ? defaultsKey.split(",") : []);
    setMaxPrice(pickDefaultMaxPrice(hintPrice));
  }, [defaultsKey, hintPrice]);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const toggleAirport = (code: string) => {
    touched.current = true;
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
      <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>
        Czwartkowy zrzut
      </p>
      <h2
        className="text-3xl font-bold leading-tight"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title ?? "Co czwartek 3 wyjazdy z Twojego lotniska"}
      </h2>
      <p className="text-base mt-3 mb-6 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {lead ?? "Jeden mail, najtańsze loty na weekend. Za darmo, bez konta, wypiszesz się jednym kliknięciem."}
      </p>
    </>
  );

  const successFrom = airports[0] ? ORIGIN_GENITIVE[airports[0]] : null;

  if (state === "pending" || state === "enabled") {
    return (
      <div>
        {!collapsed && heading}
        <div
          role="status"
          className="p-5 rounded-2xl"
          style={{ background: "var(--success-bg)", border: "1px solid var(--success)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--success)" }}>
            {state === "pending"
              ? "Sprawdź skrzynkę i potwierdź zapis. Pierwszy zrzut w czwartek."
              : "Zapisane. Pierwszy zrzut w czwartek."}
          </p>
          {airports[0] && (
            <Link
              href={`/okazje/${airports[0].toLowerCase()}`}
              className="inline-block mt-3 text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              W międzyczasie: okazje z {successFrom} →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const form = (
    <div>
      {!collapsed && heading}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div>
          <label htmlFor={emailId} className="block text-sm font-semibold mb-2">
            E-mail
          </label>
          <input
            id={emailId}
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

        <DropPrefsFields
          airports={airports}
          maxPrice={maxPrice}
          onToggleAirport={toggleAirport}
          onMaxPrice={(p) => { touched.current = true; setMaxPrice(p); }}
          priceHint={cheapestHint ? `W tym tygodniu z ${cheapestHint.from} loty od ${cheapestHint.price} zł.` : undefined}
        />

        {error && (
          <p role="alert" className="text-sm" style={{ color: "var(--error)" }}>
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
        <p className="text-xs leading-relaxed -mt-2" style={{ color: "var(--text-muted)" }}>
          Raz w tygodniu mail z okazjami. Wypiszesz się jednym kliknięciem. Szczegóły w{" "}
          <Link href="/privacy" className="underline">polityce prywatności</Link>.
        </p>
      </form>
    </div>
  );

  if (!collapsed) return form;
  return (
    <details className="rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden p-4 flex items-center justify-between gap-3" style={{ minHeight: 48 }}>
        <span>
          <span className="block text-xs font-bold tracking-widest uppercase" style={{ color: "var(--accent)" }}>Czwartkowy zrzut</span>
          <span className="block text-base font-bold mt-0.5">{title ?? "Takie okazje co czwartek w skrzynce"}</span>
        </span>
        <span aria-hidden="true" style={{ color: "var(--accent)", fontWeight: 700 }}>Zapisz się →</span>
      </summary>
      <div className="px-4 pb-5">{form}</div>
    </details>
  );
}