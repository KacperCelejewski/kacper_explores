"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { getCityPhotoUrl } from "@/lib/cityPhotos";

const DESTINATIONS = [
  { city: "Barcelona", country: "Hiszpania", flag: "🇪🇸", price: "od 1 600 PLN", days: "5 dni" },
  { city: "Lizbona", country: "Portugalia", flag: "🇵🇹", price: "od 1 900 PLN", days: "5 dni" },
  { city: "Ateny", country: "Grecja", flag: "🇬🇷", price: "od 1 400 PLN", days: "4 dni" },
  { city: "Praga", country: "Czechy", flag: "🇨🇿", price: "od 800 PLN", days: "3 dni" },
];

const STEPS = [
  { num: "1", label: "Podaj budżet i styl", desc: "Backpacker czy komfortowy? Jaka energia?" },
  { num: "2", label: "AI znajduje loty", desc: "Sprawdzamy WRO, KTW, WAW, BER i więcej" },
  { num: "3", label: "Gotowy plan na każdy dzień", desc: "Godzina po godzinie — od śniadania po nocleg" },
];

export default function StartPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary, #F5EFE0)" }}
    >
      {/* Hero */}
      <div className="px-5 pt-10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent, #C4622D)" }}>
            Włóczykij
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Gdzie następna?<br />
            <span style={{ color: "var(--accent, #C4622D)" }}>
              AI planuje za Ciebie.
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--text-muted, #7A6A55)" }}>
            Podaj budżet — AI znajdzie najtańszy lot i ułoży plan godzina po godzinie. Za darmo.
          </p>
        </motion.div>

        {/* Trust */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-5 flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: "rgba(196,98,45,0.08)", border: "1px solid rgba(196,98,45,0.2)" }}
        >
          <span className="text-xl">✈️</span>
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--accent, #C4622D)" }}>
              Ponad 500 planów wygenerowanych
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted, #7A6A55)" }}>
              5 planów za darmo · bez karty · 3 minuty
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-6"
        >
          <Link
            href="/quiz"
            className="btn-primary"
            style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "1rem", padding: "16px" }}
          >
            Sprawdź gdzie możesz polecieć →
          </Link>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="text-xs" style={{ color: "var(--text-muted, #7A6A55)" }}>✓ Bez karty</span>
            <span className="text-xs" style={{ color: "var(--text-muted, #7A6A55)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--text-muted, #7A6A55)" }}>✓ 5 planów za darmo</span>
            <span className="text-xs" style={{ color: "var(--text-muted, #7A6A55)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--text-muted, #7A6A55)" }}>✓ 3 minuty</span>
          </div>
        </motion.div>
      </div>

      {/* Example destinations */}
      <div className="px-5 pb-6">
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted, #7A6A55)" }}>
          Przykładowe kierunki z planu AI
        </p>
        <div className="flex flex-col gap-3">
          {DESTINATIONS.map((d, i) => (
            <motion.div
              key={d.city}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.07 }}
              className="relative rounded-2xl overflow-hidden flex items-end"
              style={{ height: 100 }}
            >
              <Image
                src={getCityPhotoUrl(d.city, 800)}
                alt={d.city}
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                className="object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 100%)" }}
              />
              <div className="relative flex items-center justify-between w-full px-4 py-3">
                <div>
                  <p className="text-white font-bold text-base leading-tight">{d.city}</p>
                  <p className="text-white/70 text-xs mt-0.5">{d.flag} {d.country} · {d.days}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">{d.price}</p>
                  <p className="text-white/60 text-xs">z lotem</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div
        className="px-5 py-6 mx-5 mb-6 rounded-2xl"
        style={{ background: "rgba(196,98,45,0.06)", border: "1px solid rgba(196,98,45,0.15)" }}
      >
        <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent, #C4622D)" }}>
          Jak to działa
        </p>
        <div className="flex flex-col gap-4">
          {STEPS.map((step) => (
            <div key={step.num} className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{ background: "var(--accent, #C4622D)", color: "white" }}
              >
                {step.num}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted, #7A6A55)" }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-10">
        <Link
          href="/quiz"
          className="btn-primary"
          style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "1rem", padding: "16px" }}
        >
          Zacznij planować — to nic nie kosztuje →
        </Link>
        <p className="text-center text-xs mt-3" style={{ color: "var(--text-muted, #7A6A55)" }}>
          Już zarejestrowałeś się?{" "}
          <Link href="/login" style={{ color: "var(--accent, #C4622D)", textDecoration: "none", fontWeight: 600 }}>
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
