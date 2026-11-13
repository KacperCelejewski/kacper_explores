"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const STORAGE_KEY = "newsletter_popup_seen";
const SHOW_DELAY_MS = 10000;

type NewsletterState = "idle" | "loading" | "pending" | "success" | "error" | "expired" | "invalid";

// Popup nie wyskakuje nigdzie: zapis na e-mail jest w formularzu Czwartkowego zrzutu.
// Lista zostaje, bo linki potwierdzające ze starych maili nadal wracają tu z parametrami.
const ALLOWED_PATHS: string[] = [];

function NewsletterPopupInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<NewsletterState>("idle");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const status = searchParams.get("newsletter");
    const returnedCode = searchParams.get("code");

    if (status === "verified" && returnedCode) {
      setCode(returnedCode);
      setState("success");
      setVisible(true);
      router.replace("/", { scroll: false });
      return;
    }
    if (status === "expired") {
      setState("expired");
      setVisible(true);
      router.replace("/", { scroll: false });
      return;
    }
    if (status === "invalid") {
      setState("invalid");
      setVisible(true);
      router.replace("/", { scroll: false });
      return;
    }

    // Only auto-show on allowed pages (pricing)
    if (!ALLOWED_PATHS.includes(pathname)) return;

    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch { /* ignore */ }

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchParams, router, pathname]);

  const handleClose = () => {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
  };

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
        setErrorMsg(data.error ?? "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.");
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
      setErrorMsg("Nie ma połączenia. Sprawdź internet i spróbuj jeszcze raz.");
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
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          role="dialog"
          aria-label="Newsletter — 10% zniżki na Pro Roczny"
          style={{
            position: "fixed",
            bottom: 80,
            left: 0,
            right: 0,
            margin: "0 auto",
            width: "calc(100% - 32px)",
            maxWidth: 480,
            zIndex: 99,
            background: "var(--bg-primary)",
            border: "1.5px solid var(--border)",
            borderRadius: 20,
            padding: "20px 18px 18px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          }}
        >
          <button
            onClick={handleClose}
            aria-label="Zamknij"
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              width: 44,
              height: 44,
              color: "var(--text-muted)",
            }}
          >
            ×
          </button>

          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>
            Newsletter
          </p>
          <h2 className="text-xl font-bold leading-snug">
            Zapisz się i odbierz<br />
            <span style={{ color: "var(--accent)" }}>10% zniżki na Pro Roczny</span>
          </h2>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Nowe kierunki, triki budżetowe i tanie loty prosto na skrzynkę.
            Na start dostajesz kod na 10% taniej na roczne Pro.
          </p>

          <AnimatePresence mode="wait">
            {state === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 p-4 rounded-2xl"
                style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                  Twój kod na 10% taniej
                </p>
                <div
                  className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)" }}
                >
                  <span className="font-mono font-bold text-lg tracking-widest" style={{ color: "var(--accent)" }}>
                    {code}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: copied ? "var(--success-bg)" : "var(--accent)",
                      color: copied ? "var(--success)" : "white",
                    }}
                  >
                    {copied ? "Skopiowano" : "Kopiuj"}
                  </button>
                </div>
                <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Wklej go przy płatności za roczne Pro.
                </p>
                <Link
                  href="/pricing"
                  className="btn-primary mt-4"
                  style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "0.875rem" }}
                >
                  Kup Pro Roczny ze zniżką →
                </Link>
              </motion.div>
            )}

            {state === "pending" && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 p-4 rounded-2xl"
                style={{ background: "var(--success-bg)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--success)" }}>
                  Sprawdź skrzynkę
                </p>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Wysłaliśmy e-mail na <strong>{email}</strong>.<br />
                  Kliknij link w wiadomości — odbierzesz kod od razu.
                </p>
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                  Nie ma e-maila? Sprawdź spam lub{" "}
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
                style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                  Link wygasł
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  Linki są ważne 48 godzin. Zapisz się ponownie, żeby dostać nowy.
                </p>
                <button
                  onClick={handleRetry}
                  className="text-xs font-semibold mt-1"
                  style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "12px 0" }}
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
                style={{ background: "var(--error-bg)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--error)" }}>
                  Nieprawidłowy link
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  Ten link nie jest prawidłowy. Spróbuj zapisać się ponownie.
                </p>
                <button
                  onClick={handleRetry}
                  className="text-xs font-semibold mt-1"
                  style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "12px 0" }}
                >
                  ← Spróbuj ponownie
                </button>
              </motion.div>
            )}

            {(state === "idle" || state === "loading" || state === "error") && (
              <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5">
                <div className="flex gap-2">
                  <label htmlFor="newsletter-popup-email" className="sr-only">
                    Adres e-mail do newslettera
                  </label>
                  <input
                    id="newsletter-popup-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (state === "error") setState("idle");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && state !== "loading" && handleSubscribe()}
                    placeholder="twoj@email.com"
                    aria-describedby={state === "error" ? "newsletter-popup-error" : undefined}
                    aria-invalid={state === "error" ? "true" : undefined}
                    className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none transition-all"
                    style={{
                      background: "var(--bg-surface)",
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
                  <p id="newsletter-popup-error" role="alert" className="text-xs mt-2" style={{ color: "var(--error)" }}>
                    {errorMsg}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function NewsletterPopup() {
  return (
    <Suspense fallback={null}>
      <NewsletterPopupInner />
    </Suspense>
  );
}
