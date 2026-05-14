"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const features = [
  { emoji: "✈️", label: "Najtańsze loty", desc: "Sprawdzamy WRO i BER — wybieramy co się opłaca" },
  { emoji: "🤖", label: "Plan AI godzina po godzinie", desc: "Gemini układa Twój dzień od śniadania po kolację" },
  { emoji: "💸", label: "Zero przepłacania", desc: "Street food, darmowe atrakcje, triki budżetowe" },
];

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!email.trim()) return;
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Coś poszło nie tak.");
        setState("error");
        return;
      }
      setCode(data.code);
      setAlreadySubscribed(data.alreadySubscribed ?? false);
      setState("success");
    } catch {
      setErrorMsg("Błąd połączenia. Spróbuj ponownie.");
      setState("error");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col flex-1 px-5 pb-10">
      {/* Brand */}
      <div className="pt-12">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-sm font-bold tracking-widest uppercase"
          style={{ color: "var(--accent)" }}
        >
          Kacper Explores
        </motion.p>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-5"
      >
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          Twoja następna<br />
          podróż po Europie<br />
          <span style={{ color: "var(--accent)" }}>zaczyna się tutaj.</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Odpowiedz na 6 pytań — znajdziemy najtańszy lot
          i wygenerujemy plan podróży z AI.
        </p>
      </motion.div>

      {/* Features */}
      <div className="mt-8 flex flex-col gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.25 + i * 0.08 }}
            className="flex items-start gap-4"
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
              style={{ background: "var(--accent-light)" }}
            >
              {f.emoji}
            </div>
            <div className="pt-1">
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {f.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Destinations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="mt-8 flex items-center gap-2"
      >
        <div className="flex gap-1">
          {["🇵🇹", "🇪🇸", "🇬🇷", "🇮🇹", "🇭🇷", "🇨🇿"].map((flag) => (
            <span key={flag} className="text-xl">{flag}</span>
          ))}
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>i więcej</span>
      </motion.div>

      {/* Divider */}
      <div className="mt-8 h-px" style={{ background: "var(--border)" }} />

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65 }}
        className="mt-8"
      >
        <Link
          href="/quiz"
          className="btn-primary"
          style={{ display: "block", textAlign: "center", textDecoration: "none" }}
        >
          Zaplanuj podróż →
        </Link>
        <p className="text-center text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          ~3 minuty · 1 plan za darmo po rejestracji
        </p>
      </motion.div>

      {/* Divider */}
      <div className="mt-8 h-px" style={{ background: "var(--border)" }} />

      {/* Newsletter */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.75 }}
        className="mt-8"
      >
        <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>
          Newsletter
        </p>
        <h2 className="text-xl font-bold leading-snug">
          Zapisz się i odbierz<br />
          <span style={{ color: "var(--accent)" }}>10% zniżki na Pack</span>
        </h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Nowe kierunki, triki budżetowe i okazje lotnicze co tydzień.
          Kod na Pack wyślemy od razu — bez spamu.
        </p>

        <AnimatePresence mode="wait">
          {state === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 p-4 rounded-2xl"
              style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.25)" }}
            >
              <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                {alreadySubscribed ? "Już jesteś zapisany!" : "Dziękujemy! Oto Twój kod:"} 🎉
              </p>
              <div
                className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                style={{ background: "#FFFFFF", border: "1.5px solid rgba(255,107,53,0.3)" }}
              >
                <span className="font-mono font-bold text-lg tracking-widest" style={{ color: "var(--accent)" }}>
                  {code}
                </span>
                <button
                  onClick={handleCopy}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: copied ? "#DCFCE7" : "var(--accent)",
                    color: copied ? "#16A34A" : "white",
                  }}
                >
                  {copied ? "Skopiowano ✓" : "Kopiuj"}
                </button>
              </div>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Wklej kod przy zakupie Packa na stronie płatności — otrzymasz 10% zniżki.
              </p>
              <Link
                href="/pricing"
                className="btn-primary mt-4"
                style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "0.875rem" }}
              >
                Kup Pack ze zniżką →
              </Link>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === "error") setState("idle");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && state !== "loading" && handleSubscribe()}
                  placeholder="twoj@email.com"
                  className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                  style={{
                    background: "#F7F7F5",
                    border: `1.5px solid ${state === "error" ? "#EF4444" : "var(--border)"}`,
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => { if (state !== "error") e.target.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { if (state !== "error") e.target.style.borderColor = "var(--border)"; }}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={state === "loading" || !email.trim()}
                  className="px-5 py-3 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "white", whiteSpace: "nowrap" }}
                >
                  {state === "loading" ? "…" : "Zapisz się"}
                </button>
              </div>
              {state === "error" && (
                <p className="text-xs mt-2" style={{ color: "#EF4444" }}>{errorMsg}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
