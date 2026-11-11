"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { budgetToMaxPrice, DROP_MAX_AIRPORTS } from "@/lib/drop/signup";
import { trackEvent } from "@/lib/analytics";
import type { QuizAnswers } from "@/types";

type State = "idle" | "loading" | "enabled" | "pending";

const GENERIC_ERROR = "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.";

// Zapis na zrzut jednym kliknięciem dla zalogowanych: e-mail z konta, lotniska i budżet z quizu.
export default function DropProfileButton({
  prefs,
  alreadyEnabled = false,
}: {
  prefs: QuizAnswers | null | undefined;
  alreadyEnabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/drop/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromProfile: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (prefs?.budget) {
        trackEvent("drop_signup", {
          airports: Math.min(prefs.airports.length, DROP_MAX_AIRPORTS),
          max_price: budgetToMaxPrice(prefs.budget),
        });
      }
      setState(d.enabled ? "enabled" : "pending");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : GENERIC_ERROR);
      setState("idle");
    }
  };

  if (alreadyEnabled || state === "enabled") {
    return (
      <p className="text-sm font-semibold" style={{ color: "#16A34A" }}>
        Jesteś zapisany. Zrzut przyjdzie w czwartek.
      </p>
    );
  }

  if (state === "pending") {
    return (
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Mamy Twój zapis. Jeśli w czwartek nic nie przyjdzie, napisz na hej@wloczykij.me.
      </p>
    );
  }

  if (!prefs?.airports?.length || !prefs.budget) {
    return (
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Zrób najpierw quiz, żebyśmy wiedzieli, skąd lecisz i za ile.{" "}
        <button
          onClick={() => router.push("/quiz")}
          className="font-semibold inline-block py-2"
          style={{ color: "var(--accent)" }}
        >
          Zrób quiz →
        </button>
      </p>
    );
  }

  return (
    <>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Co czwartek 3 wyjazdy z Twojego lotniska, w Twoim budżecie.
      </p>
      {error && (
        <p role="alert" className="text-sm mt-3" style={{ color: "#DC2626" }}>{error}</p>
      )}
      <button className="btn-primary mt-4" onClick={handleClick} disabled={state === "loading"}>
        {state === "loading" ? "…" : "Wysyłaj mi zrzut"}
      </button>
    </>
  );
}
