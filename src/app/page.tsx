"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const features = [
  { emoji: "✈️", label: "Najtańsze loty", desc: "WRO lub BER — wybieramy co się opłaca" },
  { emoji: "🤖", label: "Plan AI", desc: "Gemini generuje Twój plan godzina po godzinie" },
  { emoji: "💸", label: "Zero przepłacania", desc: "Street food, darmowe atrakcje, triki budżetowe" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 px-5 pb-8">
      {/* Header */}
      <div className="pt-14 pb-2 text-center">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-5xl">🌍</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 text-3xl font-bold leading-tight"
        >
          <span className="gradient-text">Kacper Explores</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-3 text-base leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Odpowiedz na 6 pytań — znajdziemy Ci najtańszy lot
          i wygenerujemy kompletny plan podróży.
        </motion.p>
      </div>

      {/* Hero visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="glass-card mt-8 p-6 text-center"
      >
        <div className="text-4xl mb-3">🗺️</div>
        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Budżetowe podróże solo po Europie
        </p>
        <div className="flex justify-center gap-3 mt-4 flex-wrap">
          {["🇵🇹", "🇪🇸", "🇬🇷", "🇮🇹", "🇭🇷", "🇨🇿"].map((flag) => (
            <span key={flag} className="text-2xl">{flag}</span>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
          >
            ✦ Powered by Gemini AI
          </span>
        </div>
      </motion.div>

      {/* Features */}
      <div className="mt-6 flex flex-col gap-3">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            className="glass-card flex items-center gap-4 p-4"
          >
            <span className="text-2xl">{f.emoji}</span>
            <div>
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {f.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8"
      >
        <Link href="/quiz" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          Zaplanuj podróż →
        </Link>
        <p className="text-center text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          Zajmuje ~3 minuty · 1 darmowy plan po rejestracji
        </p>
      </motion.div>
    </div>
  );
}
