"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { IconPlane, IconClock, IconCoin } from "@/app/components/Icons";

type IconFC = React.FC<{ size?: number }>;

const features: { Icon: IconFC; label: string; desc: string }[] = [
  { Icon: IconPlane, label: "Najtańsze loty", desc: "Sprawdzamy WRO i BER — wybieramy co się opłaca" },
  { Icon: IconClock, label: "Plan AI godzina po godzinie", desc: "Gemini układa Twój dzień od śniadania po kolację" },
  { Icon: IconCoin, label: "Zero przepłacania", desc: "Street food, darmowe atrakcje, triki budżetowe" },
];

type NewsletterState = "idle" | "loading" | "pending" | "success" | "error" | "expired" | "invalid";

function NewsletterSection() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [state, setState] = useState<NewsletterState>("idle");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const newsletterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const status = searchParams.get("newsletter");
    const returnedCode = searchParams.get("code");
    if (status === "verified" && returnedCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCode(returnedCode);
      setState("success");
      router.replace("/", { scroll: false });
      setTimeout(() => newsletterRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    } else if (status === "expired") {
      setState("expired");
      router.replace("/", { scroll: false });
    } else if (status === "invalid") {
      setState("invalid");
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

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
      if (data.code) {
        setCode(data.code);
        setState("success");
      } else {
        setState("pending");
      }
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

  const handleRetry = () => {
    setState("idle");
    setEmail("");
    setErrorMsg("");
  };

  return (
    <div ref={newsletterRef}>
      <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>
        Newsletter
      </p>
      <h2 className="text-xl font-bold leading-snug">
        Zapisz się i odbierz<br />
        <span style={{ color: "var(--accent)" }}>10% zniżki na Pack</span>
      </h2>
      <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Nowe kierunki, triki budżetowe i okazje lotnicze co tydzień.
        Potwierdzisz e-mail — wyślemy kod od razu.
      </p>

      <AnimatePresence mode="wait">
        {state === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 rounded-2xl"
            style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.25)" }}
          >
            <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
              Oto Twój kod zniżkowy 🎉
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
        )}

        {state === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 rounded-2xl"
            style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
          >
            <p className="text-sm font-bold" style={{ color: "#16A34A" }}>
              Sprawdź skrzynkę ✉️
            </p>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "#4B5563" }}>
              Wysłaliśmy e-mail na <strong>{email}</strong>.<br />
              Kliknij link w wiadomości — odbierzesz kod od razu.
            </p>
            <p className="text-xs mt-3" style={{ color: "#9CA3AF" }}>
              Nie ma maila? Sprawdź spam lub{" "}
              <button
                onClick={handleRetry}
                className="underline"
                style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                podaj adres ponownie
              </button>.
            </p>
          </motion.div>
        )}

        {state === "expired" && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 rounded-2xl"
            style={{ background: "#FEF9C3", border: "1px solid #FDE68A" }}
          >
            <p className="text-sm font-bold" style={{ color: "#92400E" }}>
              Link wygasł ⏰
            </p>
            <p className="text-sm mt-1" style={{ color: "#4B5563" }}>
              Linki są ważne 48 godzin. Zapisz się ponownie, żeby dostać nowy.
            </p>
            <button
              onClick={handleRetry}
              className="text-xs font-semibold mt-3"
              style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              ← Zapisz się ponownie
            </button>
          </motion.div>
        )}

        {state === "invalid" && (
          <motion.div
            key="invalid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 rounded-2xl"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <p className="text-sm font-bold" style={{ color: "#DC2626" }}>
              Nieprawidłowy link
            </p>
            <p className="text-sm mt-1" style={{ color: "#4B5563" }}>
              Ten link nie jest prawidłowy. Spróbuj zapisać się ponownie.
            </p>
            <button
              onClick={handleRetry}
              className="text-xs font-semibold mt-3"
              style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              ← Spróbuj ponownie
            </button>
          </motion.div>
        )}

        {(state === "idle" || state === "loading" || state === "error") && (
          <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5">
            <div className="flex gap-2">
              <label htmlFor="newsletter-email" className="sr-only">
                Adres email do newslettera
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === "error") setState("idle");
                }}
                onKeyDown={(e) => e.key === "Enter" && state !== "loading" && handleSubscribe()}
                placeholder="twoj@email.com"
                aria-describedby={state === "error" ? "newsletter-error" : undefined}
                aria-invalid={state === "error" ? "true" : undefined}
                className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={{
                  background: "#F7F7F5",
                  border: `1.5px solid ${state === "error" ? "var(--error)" : "var(--border)"}`,
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => { if (state !== "error") e.target.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { if (state !== "error") e.target.style.borderColor = "var(--border)"; }}
              />
              <button
                onClick={handleSubscribe}
                disabled={state === "loading" || !email.trim()}
                aria-busy={state === "loading"}
                className="px-5 py-3 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ background: "var(--accent)", color: "white", whiteSpace: "nowrap" }}
              >
                {state === "loading" ? (
                  <><span aria-hidden="true">…</span><span className="sr-only">Wysyłanie…</span></>
                ) : "Zapisz się"}
              </button>
            </div>
            {state === "error" && (
              <p id="newsletter-error" role="alert" className="text-xs mt-2" style={{ color: "var(--error)" }}>
                {errorMsg}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomeClient() {
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
          Włóczykij
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
          Budżetowe podróże solo<br />
          po Europie —<br />
          <span style={{ color: "var(--accent)" }}>AI planuje za Ciebie.</span>
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
              className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--accent-light)", color: "var(--accent)" }}
            >
              <f.Icon size={20} />
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

      <div className="mt-8 h-px" style={{ background: "var(--border)" }} />

      {/* Newsletter */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.75 }}
        className="mt-8"
      >
        <Suspense fallback={<div aria-busy="true" aria-label="Ładowanie sekcji newslettera…" />}>
          <NewsletterSection />
        </Suspense>
      </motion.div>
    </div>
  );
}
