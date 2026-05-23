"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Step = "idle" | "short" | "expanding" | "full" | "done";

interface Props {
  tripId: string;
  city: string;
  onPdfUnlocked: () => void;
}

const SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "friend", label: "Od znajomego" },
  { value: "google", label: "Google" },
  { value: "other", label: "Inne" },
];

export default function FeedbackWidget({ tripId, city, onPdfUnlocked }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [text, setText] = useState("");
  const [liked, setLiked] = useState("");
  const [improve, setImprove] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [creditAdded, setCreditAdded] = useState(false);

  const submitShort = async (selectedRating: "up" | "down") => {
    setRating(selectedRating);
    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          city,
          type: "short",
          rating: selectedRating,
          text: text.trim() || undefined,
          source: "web",
        }),
      });
      onPdfUnlocked();
      setStep("expanding");
    } catch {
      // Mimo błędu odblokuj PDF — nie karamy usera za problem sieci
      onPdfUnlocked();
      setStep("expanding");
    } finally {
      setLoading(false);
    }
  };

  const submitFull = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          city,
          type: "full",
          rating,
          answers: { liked: liked.trim(), improve: improve.trim() },
          source: source || "web",
        }),
      });
      const data = await res.json();
      if (data.creditAdded) setCreditAdded(true);
    } catch {
      // cicho — kredyt może nie być dodany, ale nie blokujemy UI
    } finally {
      setLoading(false);
      setStep("done");
    }
  };

  return (
    <div className="px-5 mt-4 no-print">
      <AnimatePresence mode="wait">
        {/* ── IDLE ── */}
        {step === "idle" && (
          <motion.button
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => setStep("short")}
            className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{
              background: "var(--accent-light)",
              color: "var(--accent)",
              border: "1px solid rgba(196,98,45,0.2)",
            }}
          >
            ✦ Oceń ten plan — odblokuj PDF
          </motion.button>
        )}

        {/* ── SHORT FEEDBACK ── */}
        {step === "short" && (
          <motion.div
            key="short"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-5"
          >
            <p className="text-sm font-bold mb-1">Jak wyszedł plan?</p>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Jedna odpowiedź i PDF gotowy do pobrania — bez Pro.
            </p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setRating("up")}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl text-2xl transition-all"
                style={{
                  background: rating === "up" ? "#DCFCE7" : "#F0F0F0",
                  border: rating === "up" ? "2px solid #16A34A" : "2px solid transparent",
                }}
              >
                👍
              </button>
              <button
                onClick={() => setRating("down")}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl text-2xl transition-all"
                style={{
                  background: rating === "down" ? "#FEE2E2" : "#F0F0F0",
                  border: rating === "down" ? "2px solid #DC2626" : "2px solid transparent",
                }}
              >
                👎
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Opcjonalnie: co konkretnie? (1 zdanie wystarczy)"
              rows={2}
              className="w-full rounded-xl px-3 py-2 text-sm resize-none mb-4"
              style={{
                background: "#F7F7F5",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />

            <button
              onClick={() => rating && submitShort(rating)}
              disabled={!rating || loading}
              className="w-full py-3 rounded-2xl text-sm font-bold transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {loading ? "Wysyłam…" : "Wyślij i pobierz PDF →"}
            </button>
          </motion.div>
        )}

        {/* ── EXPANDING — propozycja pełnego feedbacku ── */}
        {step === "expanding" && (
          <motion.div
            key="expanding"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-5"
          >
            <p className="text-sm font-bold mb-1">
              ✓ PDF odblokowany!
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Masz chwilę? 3 pytania więcej = <strong>+1 bezpłatny plan podróży</strong> na konto.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("full")}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)", color: "white" }}
              >
                Tak, chcę kredyt →
              </button>
              <button
                onClick={() => setStep("done")}
                className="py-2.5 px-4 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
              >
                Może później
              </button>
            </div>
          </motion.div>
        )}

        {/* ── FULL FEEDBACK ── */}
        {step === "full" && (
          <motion.div
            key="full"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-5"
          >
            <p className="text-sm font-bold mb-4">Jeszcze 3 pytania → +1 plan gratis</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Co Ci się podobało?
                </label>
                <textarea
                  value={liked}
                  onChange={(e) => setLiked(e.target.value)}
                  placeholder="np. dobry dobór aktywności, realne ceny…"
                  rows={2}
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none"
                  style={{
                    background: "#F7F7F5",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Co można poprawić?
                </label>
                <textarea
                  value={improve}
                  onChange={(e) => setImprove(e.target.value)}
                  placeholder="np. za długi plan na dzień, brak opcji wegetariańskich…"
                  rows={2}
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none"
                  style={{
                    background: "#F7F7F5",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Skąd dowiedziałeś się o Włóczykiju?
                </label>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSource(opt.value)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: source === opt.value ? "var(--accent)" : "#F0F0F0",
                        color: source === opt.value ? "white" : "var(--text-secondary)",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={submitFull}
              disabled={loading}
              className="w-full py-3 rounded-2xl text-sm font-bold mt-5 transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {loading ? "Wysyłam…" : "Wyślij i zdobądź kredyt →"}
            </button>
          </motion.div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-5 text-center"
          >
            <p className="text-2xl mb-2">🎒</p>
            <p className="text-sm font-bold mb-1">
              {creditAdded ? "Dzięki! +1 kredyt dodany na konto." : "Dzięki za feedback!"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {creditAdded
                ? "Twoja opinia pomaga nam robić Włóczykija lepszym."
                : "PDF jest odblokowany — pobierz kiedy chcesz."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
