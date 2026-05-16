"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IconPlane, IconClock, IconCoin } from "@/app/components/Icons";

type IconFC = React.FC<{ size?: number }>;

const features: { Icon: IconFC; label: string; desc: string }[] = [
  { Icon: IconPlane, label: "Najtańsze loty", desc: "Sprawdzamy WRO i BER — wybieramy co się opłaca" },
  { Icon: IconClock, label: "Plan AI godzina po godzinie", desc: "Gemini układa Twój dzień od śniadania po kolację" },
  { Icon: IconCoin, label: "Zero przepłacania", desc: "Street food, darmowe atrakcje, triki budżetowe" },
];

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
          {[
            { flag: "🇵🇹", label: "Portugalia" },
            { flag: "🇪🇸", label: "Hiszpania" },
            { flag: "🇬🇷", label: "Grecja" },
            { flag: "🇮🇹", label: "Włochy" },
            { flag: "🇭🇷", label: "Chorwacja" },
            { flag: "🇨🇿", label: "Czechy" },
          ].map(({ flag, label }) => (
            <span key={flag} className="text-xl" role="img" aria-label={label}>{flag}</span>
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
    </div>
  );
}
