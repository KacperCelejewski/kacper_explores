"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { IconPlane, IconClock, IconCoin } from "@/app/components/Icons";
import { getCityPhotoUrl, FEATURED_DESTINATIONS } from "@/lib/cityPhotos";

type IconFC = React.FC<{ size?: number }>;

const features: { Icon: IconFC; label: string; desc: string }[] = [
  { Icon: IconPlane, label: "Najtańszy lot w 3 minuty", desc: "Sprawdzamy WRO, KTW, BER i więcej — wybieramy co się opłaca" },
  { Icon: IconClock, label: "Plan godzina po godzinie", desc: "AI układa Twój dzień od śniadania po kolację, z konkretnymi miejscami" },
  { Icon: IconCoin, label: "Zero przepłacania", desc: "Street food, darmowe atrakcje, budżetowe triki których nie znajdziesz w Google" },
];

const EXAMPLE_PLAN = [
  { time: "08:30", emoji: "☕", text: "Śniadanie w lokalnej piekarni — croissant + kawa, ~4 EUR" },
  { time: "10:00", emoji: "🏛️", text: "Park Güell — wejście 10 EUR, widok na całą Barcelonę" },
  { time: "13:00", emoji: "🥘", text: "Obiad na Mercat de Santa Caterina — 2x tapas za 9 EUR" },
  { time: "16:00", emoji: "🏖️", text: "Plaża Barceloneta — bezpłatna, leżak 3 EUR" },
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
          Gdzie następna?<br />
          <span style={{ color: "var(--accent)" }}>AI znajdzie lot i ułoży plan.</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Podaj budżet i miesiąc — za 3 minuty wiesz dokąd lecisz
          i masz gotowy plan na każdy dzień.
        </p>
      </motion.div>

      {/* Social proof bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-5 flex items-center gap-3 px-4 py-2.5 rounded-2xl"
        style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.2)" }}
      >
        <span className="text-lg">✈️</span>
        <div>
          <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>
            Ponad 500 planów wygenerowanych
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            5 planów za darmo · bez karty kredytowej
          </p>
        </div>
      </motion.div>

      {/* Example plan preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-6"
      >
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
          Przykładowy plan — Barcelona, 5 dni za 2 200 PLN
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "#FAFAF8" }}
        >
          {EXAMPLE_PLAN.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderBottom: i < EXAMPLE_PLAN.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <span className="text-xs font-mono pt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)", minWidth: 36 }}>
                {item.time}
              </span>
              <span className="flex-shrink-0">{item.emoji}</span>
              <p className="text-xs leading-relaxed">{item.text}</p>
            </div>
          ))}
          <div
            className="px-4 py-2 text-center text-xs font-semibold"
            style={{ color: "var(--accent)", background: "var(--accent-light)" }}
          >
            + pełny plan godzina po godzinie dla każdego dnia →
          </div>
        </div>
      </motion.div>

      {/* Features */}
      <div className="mt-8 flex flex-col gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.35 + i * 0.08 }}
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
        transition={{ duration: 0.4, delay: 0.6 }}
        className="mt-8"
      >
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
          Popularne kierunki
        </p>
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {FEATURED_DESTINATIONS.map((dest, i) => (
            <motion.div
              key={dest.city}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 + i * 0.06 }}
              className="relative flex-shrink-0 rounded-2xl overflow-hidden"
              style={{ width: 120, height: 160 }}
            >
              <Image
                src={getCityPhotoUrl(dest.city, 640)}
                alt={dest.city}
                fill
                sizes="120px"
                className="object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)",
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-white text-xs font-bold leading-tight">{dest.city}</p>
                <p className="text-white/70 text-[10px] leading-tight mt-0.5">{dest.flag} {dest.country}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="mt-8 h-px" style={{ background: "var(--border)" }} />

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="mt-8"
      >
        <Link
          href="/quiz"
          className="btn-primary"
          style={{ display: "block", textAlign: "center", textDecoration: "none" }}
        >
          Sprawdź gdzie możesz polecieć →
        </Link>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>✓ Bez karty</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>✓ 5 planów za darmo</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>✓ 3 minuty</span>
        </div>
      </motion.div>
    </div>
  );
}
