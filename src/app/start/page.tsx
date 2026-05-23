"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function StartPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary, #F5EFE0)" }}
    >
      <div className="px-5 pt-10 pb-6 flex flex-col flex-1">
        {/* Brand */}
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-xs font-bold tracking-widest uppercase mb-6"
          style={{ color: "var(--accent, #C4622D)" }}
        >
          Włóczykij
        </motion.p>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Gdzie następna<br />
            <span style={{ color: "var(--accent, #C4622D)" }}>przygoda?</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-muted, #7A6A55)" }}>
            AI tworzy plan podróży dopasowany do Ciebie — konkretne atrakcje, restauracje i wskazówki budżetowe.
          </p>
        </motion.div>

        {/* Path 1 — No flights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-4"
        >
          <Link
            href="/quiz"
            className="block rounded-3xl p-5 no-underline transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "var(--accent, #C4622D)",
              textDecoration: "none",
            }}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl mt-0.5">🗺️</span>
              <div className="flex-1">
                <p className="font-bold text-lg text-white leading-tight">
                  Nie wiem gdzie lecieć
                </p>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
                  Odpowiedz na kilka pytań — AI dobierze 3 destynacje dopasowane do Twojego budżetu i stylu.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Budżet", "Styl", "Termin", "Lotnisko"].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-bold mt-4 text-white">
                  Zacznij quiz — 2 minuty →
                </p>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Path 2 — Have flights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-8"
        >
          <Link
            href="/quick"
            className="block rounded-3xl p-5 no-underline transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "var(--bg-surface, #FFF9F0)",
              border: "2px solid var(--accent, #C4622D)",
              textDecoration: "none",
            }}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl mt-0.5">✈️</span>
              <div className="flex-1">
                <p className="font-bold text-lg leading-tight" style={{ color: "var(--text-primary)" }}>
                  Mam już loty
                </p>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Wiem dokąd lecę i kiedy — potrzebuję konkretnego planu co robić: muzea, restauracje, trasy.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Destynacja", "Daty lotu", "Kto leci"].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-bold mt-4" style={{ color: "var(--accent)" }}>
                  Stwórz plan →
                </p>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Example plan teaser */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-2xl p-4"
          style={{ background: "rgba(196,98,45,0.06)", border: "1px solid rgba(196,98,45,0.15)" }}
        >
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>
            Przykład planu AI
          </p>
          <div className="flex flex-col gap-2">
            {[
              { time: "09:00", emoji: "🏛️", text: "Muzeum Picassa — wejście 12 EUR, bilet online" },
              { time: "13:00", emoji: "🥘", text: "Bar El Xampanyet, Carrer de la Montcada 22 — tapas od 3 EUR" },
              { time: "16:00", emoji: "🏖️", text: "Plaża Barceloneta — bezpłatna, leżak 3 EUR" },
            ].map((item) => (
              <div key={item.time} className="flex items-center gap-3">
                <span className="text-xs font-mono w-11 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {item.time}
                </span>
                <span className="text-base">{item.emoji}</span>
                <span className="text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs mt-6"
          style={{ color: "var(--text-muted)" }}
        >
          5 planów za darmo · bez karty kredytowej
        </motion.p>
      </div>
    </div>
  );
}
