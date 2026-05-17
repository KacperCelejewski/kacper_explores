"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { IconPlane, IconClock, IconCoin } from "@/app/components/Icons";
import { getCityPhotoUrl, FEATURED_DESTINATIONS } from "@/lib/cityPhotos";

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
              transition={{ duration: 0.3, delay: 0.55 + i * 0.06 }}
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
