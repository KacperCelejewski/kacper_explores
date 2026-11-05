"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { getCityPhotoUrl, FEATURED_DESTINATIONS } from "@/lib/cityPhotos";

// ─── Static data ────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "6 pytań o Ciebie",
    desc: "Kto jedzie, kiedy, jaki masz budżet i co lubisz robić. Zajmuje mniej niż 3 minuty.",
  },
  {
    num: "02",
    title: "Dostajesz 3 destynacje skrojone pod Ciebie",
    desc: "Gemini analizuje Twój budżet, styl podróżowania i termin — i dobiera 3 miejsca, które będą idealne akurat dla Ciebie.",
  },
  {
    num: "03",
    title: "Plan godzina po godzinie",
    desc: "Śniadania, muzea, restauracje — z cenami, trasami i trikami budżetowymi. Gotowy od razu.",
  },
];

const EXAMPLE_PLAN = [
  { time: "08:30", emoji: "☕", text: "Śniadanie w lokalnej piekarni — croissant + kawa, ~4 EUR" },
  { time: "10:00", emoji: "🏛️", text: "Park Güell — wejście 10 EUR, widok na całą Barcelonę" },
  { time: "13:00", emoji: "🥘", text: "Obiad na Mercat de Santa Caterina — 2x tapas za 9 EUR" },
  { time: "16:00", emoji: "🏖️", text: "Plaża Barceloneta — bezpłatna, leżak 3 EUR" },
  { time: "20:00", emoji: "🍷", text: "Aperitivo na Las Ramblas — wino + pintxos ~12 EUR" },
];

// ─── Shared style tokens ─────────────────────────────────────────────────────

const ACCENT = "#C4622D";
const DARK = "#0D0A07";
const OVERLINE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
  color: "var(--accent)",
  marginBottom: 14,
};

// ─── Hero poster ─────────────────────────────────────────────────────────────
// Flat railway-poster scene from the brand palette. The walker is the logo's
// silhouette, standing on the ridge and looking out over the valley.

const WALKER_PATHS = [
  "M 4 78 C 28 64, 96 58, 154 62 C 168 64, 176 72, 170 78 C 168 82, 156 84, 138 86 C 90 92, 38 92, 14 88 C 4 86, -2 82, 4 78 Z",
  "M 76 68 C 70 30, 88 12, 104 12 C 124 12, 134 32, 128 68 Z",
  "M 86 86 L 86 96 C 78 98, 74 102, 78 108 C 80 112, 86 116, 94 118 L 116 118 C 122 118, 126 114, 126 108 L 126 86 Z",
  "M 88 118 C 80 132, 76 158, 78 184 L 82 208 L 88 220 L 122 220 L 130 210 L 132 134 C 132 124, 126 118, 120 118 L 116 118 Z",
  "M 130 124 C 148 126, 162 138, 162 156 L 162 196 C 162 206, 156 210, 148 208 L 132 204 L 132 134 C 132 124, 130 124, 130 124 Z",
  "M 88 220 L 76 264 L 60 290 L 48 296 L 52 300 L 92 300 L 98 268 L 110 220 Z",
  "M 112 220 L 118 244 L 130 268 L 154 274 L 166 270 L 160 264 L 146 260 L 134 252 L 126 232 L 122 220 Z",
];

// `crop` picks the window onto the 1440×900 scene: the full sky behind the copy
// from tablet up, a tight frame on the sun and walker on phones.
function HeroPoster({ id, crop, className }: { id: string; crop: string; className: string }) {
  return (
    <svg
      className={className}
      viewBox={crop}
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Woodcut cuts through the lower half of the sun */}
        <mask id={`${id}-sun-cuts`}>
          <rect width="1440" height="900" fill="white" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="0" y={772 + i * 20} width="1440" height={6 + i * 3} fill="black" />
          ))}
        </mask>
        {/* Grain fades in toward the land so the sky meets the page without a seam */}
        <linearGradient id={`${id}-grain-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor="white" stopOpacity="0" />
          <stop offset="0.8" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <mask id={`${id}-grain-mask`}>
          <rect width="1440" height="900" fill={`url(#${id}-grain-fade)`} />
        </mask>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.22" />
          </feComponentTransfer>
        </filter>
      </defs>

      <circle cx="1180" cy="760" r="160" fill="var(--accent)" mask={`url(#${id}-sun-cuts)`} />

      {/* Far ridge */}
      <path
        d="M0 806 C 220 786, 420 792, 640 774 C 860 760, 1040 792, 1240 786 C 1340 783, 1400 776, 1440 772 L1440 900 L0 900 Z"
        fill="var(--border)"
      />
      {/* Middle ridge */}
      <path
        d="M0 846 C 260 828, 520 838, 760 822 C 960 810, 1100 830, 1300 826 C 1370 824, 1420 821, 1440 819 L1440 900 L0 900 Z"
        fill="var(--text-muted)"
      />
      {/* Near ridge the walker stands on */}
      <path
        d="M0 886 C 300 876, 620 882, 880 870 C 1000 864, 1060 858, 1140 859 C 1240 860, 1340 868, 1440 872 L1440 900 L0 900 Z"
        fill="var(--green)"
      />

      <g transform="translate(1086 650) scale(0.72)" fill="var(--text-primary)">
        {WALKER_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <rect width="1440" height="900" filter={`url(#${id}-grain)`} mask={`url(#${id}-grain-mask)`} />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomeClient({ galleryPhotos = [] }: { galleryPhotos?: string[] }) {
  /* ── full-width + dark nav override ── */
  useEffect(() => {
    document.body.classList.add("is-home");
    return () => document.body.classList.remove("is-home");
  }, []);

  /* ── destinations carousel ── */
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    if (!card) return;
    const cardWidth = card.offsetWidth + 12;
    setActiveCard(
      Math.min(Math.round(el.scrollLeft / cardWidth), FEATURED_DESTINATIONS.length - 1)
    );
  }, []);

  const scrollToCard = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-card]");
    cards[i]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ════════════════════════════════════════════════════════════════════
          §1  HERO — sand railway poster: walker, setting sun, flat hills
          ════════════════════════════════════════════════════════════════════ */}
      <section className="home-hero">
        <HeroPoster id="hero-wide" crop="0 0 1440 900" className="home-hero-art home-hero-art--wide" />
        <HeroPoster id="hero-phone" crop="760 560 680 340" className="home-hero-art home-hero-art--phone" />

        {/* ── Content ── */}
        <div className="home-hero-copy">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "white",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 22,
              letterSpacing: "0.02em",
            }}
          >
            5 planów za darmo · loty z 7 polskich lotnisk
          </motion.p>

          {/* Headline — Cormorant Garamond, massive, editorial */}
          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(44px, min(12vw, 9vh), 86px)",
              lineHeight: 1.02,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              marginBottom: 18,
            }}
          >
            Masz wolny weekend<br />
            i trochę kasy?<br />
            <em style={{ fontStyle: "italic", color: ACCENT }}>My mamy plan.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.3, ease: "easeOut" }}
            style={{
              color: "var(--text-secondary)",
              fontSize: "clamp(15px, 3.5vw, 17px)",
              lineHeight: 1.7,
              maxWidth: 400,
              marginBottom: 30,
            }}
          >
            Odpowiedz na 6 pytań. Dostaniesz 3 destynacje
            dopasowane do Ciebie i plan godzina po godzinie.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5, ease: "easeOut" }}
            style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
          >
            <Link
              href="/quiz"
              style={{
                display: "inline-block",
                background: "var(--accent)",
                color: "white",
                fontWeight: 700,
                borderRadius: 14,
                padding: "15px 30px",
                textDecoration: "none",
                fontSize: 16,
                letterSpacing: "0.01em",
                boxShadow: "0 6px 20px rgba(196,98,45,0.28)",
              }}
            >
              Zaplanuj wyjazd — za darmo →
            </Link>
            <Link
              href="/quick"
              style={{
                color: "var(--text-primary)",
                textDecoration: "underline",
                textDecorationColor: "var(--accent)",
                textUnderlineOffset: 4,
                fontSize: 15,
                fontWeight: 600,
                padding: "12px 0",
              }}
            >
              Wiesz już dokąd? 4 kroki →
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.82 }}
            style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 14 }}
          >
            6 pytań · darmowe konto · 5 planów gratis, bez karty
          </motion.p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          §3  HOW IT WORKS — dark, editorial, numbered steps
          ════════════════════════════════════════════════════════════════════ */}
      <section
        id="jak-to-dziala"
        style={{ background: DARK, color: "white", padding: "88px 28px 96px" }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={OVERLINE}
          >
            Jak to działa
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(34px, 10vw, 56px)",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              marginBottom: 56,
            }}
          >
            3 minuty od teraz<br />
            <em style={{ color: ACCENT, fontStyle: "italic" }}>do gotowego planu.</em>
          </motion.h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -26 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "flex", alignItems: "flex-start", gap: 22 }}
              >
                {/* Big editorial number */}
                <div
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 76,
                    fontWeight: 700,
                    lineHeight: 0.82,
                    color: "var(--accent)",
                    flexShrink: 0,
                    width: 58,
                    letterSpacing: "-0.05em",
                    fontVariantNumeric: "lining-nums",
                    opacity: 0.88,
                  }}
                >
                  {step.num}
                </div>
                <div style={{ paddingTop: 10 }}>
                  <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 7, letterSpacing: "-0.01em" }}>
                    {step.title}
                  </p>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.74)", lineHeight: 1.72 }}>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.42 }}
            style={{ marginTop: 56 }}
          >
            <Link
              href="/quiz"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                background: ACCENT,
                color: DARK,
                fontWeight: 800,
                borderRadius: 14,
                padding: "16px 28px",
                fontSize: 16,
                letterSpacing: "0.01em",
                boxShadow: `0 4px 28px rgba(196,98,45,0.22)`,
              }}
            >
              Zacznij za darmo — 6 pytań →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          §4  PLAN PREVIEW — product demo in warm section
          ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "var(--bg-surface)", padding: "88px 28px 96px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={OVERLINE}
          >
            Przykładowy plan
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(30px, 9vw, 48px)",
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: "-0.025em",
              marginBottom: 10,
            }}
          >
            Barcelona, weekend.<br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Łącznie 2 200 PLN.</em>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.18 }}
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              marginBottom: 30,
              lineHeight: 1.7,
            }}
          >
            Hostel w centrum, tapas, plaże i sztuka Gaudíego.
            <br />Tyle wystarczy na niezapomniany wyjazd.
          </motion.p>

          {/* The actual plan card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            style={{
              borderRadius: 22,
              overflow: "hidden",
              border: "1.5px solid var(--border)",
              boxShadow: "0 10px 40px rgba(28,16,8,0.1)",
            }}
          >
            {/* Card header */}
            <div
              style={{
                background: "var(--accent)",
                color: "white",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.9, marginBottom: 4 }}>
                  Dzień 1 — Piątek
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  Barcelona, Katalonia 🇪🇸
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 11, opacity: 0.9, marginBottom: 3 }}>Budżet dnia</p>
                <p style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.03em" }}>~95 EUR</p>
              </div>
            </div>

            {/* Timeline rows */}
            {EXAMPLE_PLAN.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 20px",
                  background: i % 2 === 0 ? "var(--bg-primary)" : "var(--bg-surface)",
                  borderBottom: i < EXAMPLE_PLAN.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                    paddingTop: 2,
                    minWidth: 38,
                    fontWeight: 700,
                  }}
                >
                  {item.time}
                </span>
                <span style={{ flexShrink: 0, fontSize: 15 }}>{item.emoji}</span>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)" }}>
                  {item.text}
                </p>
              </div>
            ))}

            {/* Footer CTA */}
            <div
              style={{
                background: "var(--accent-light)",
                borderTop: "1px solid var(--border)",
                padding: "14px 20px",
                textAlign: "center",
              }}
            >
              <Link
                href="/quiz"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--accent)",
                  textDecoration: "none",
                  letterSpacing: "0.01em",
                }}
              >
                Wygeneruj swój plan za darmo →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          §5  DESTINATIONS — big photo cards, horizontal snap carousel
          ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "var(--bg-primary)", padding: "88px 0 60px" }}>
        {/* Section header */}
        <div style={{ padding: "0 28px", marginBottom: 30, maxWidth: 560, margin: "0 auto 30px" }}>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={OVERLINE}
          >
            Destynacje
          </motion.p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(30px, 9vw, 46px)",
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: "-0.025em",
              }}
            >
              Gdzie chcesz<br />lecieć?
            </motion.h2>
            <Link
              href="/quiz"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent)",
                textDecoration: "none",
                flexShrink: 0,
                marginLeft: 16,
                paddingBottom: 4,
              }}
            >
              Dopasuj do siebie →
            </Link>
          </div>
        </div>

        {/* Snap carousel — full-bleed */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            display: "flex",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            paddingLeft: "max(24px, calc((100vw - 560px) / 2 + 28px))",
            scrollPaddingLeft: "max(24px, calc((100vw - 560px) / 2 + 28px))",
          }}
        >

          {FEATURED_DESTINATIONS.map((dest, i) => (
            <motion.div
              key={dest.city}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.055 }}
              data-card
              style={{
                flexShrink: 0,
                position: "relative",
                borderRadius: 22,
                overflow: "hidden",
                width: "min(calc(100vw - 72px), 360px)",
                height: 368,
                scrollSnapAlign: "start",
                marginRight: i < FEATURED_DESTINATIONS.length - 1 ? 12 : 28,
                boxShadow: "0 10px 36px rgba(28,16,8,0.2)",
              }}
            >
              <Link
                href={`/quiz?city=${encodeURIComponent(dest.city)}`}
                style={{ display: "block", height: "100%", textDecoration: "none" }}
              >
                <Image
                  src={galleryPhotos[i] || getCityPhotoUrl(dest.city, 800)}
                  alt={dest.city}
                  fill
                  sizes="360px"
                  className="object-cover"
                />
                {/* Gradient overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)",
                  }}
                />
                {/* Tag */}
                <div style={{ position: "absolute", top: 14, left: 14 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "var(--accent)",
                      color: "white",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {dest.tag}
                  </span>
                </div>
                {/* Card content */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 18px 18px" }}>
                  <p
                    style={{
                      color: "white",
                      fontSize: 28,
                      fontWeight: 800,
                      lineHeight: 1.05,
                      fontFamily: "var(--font-heading)",
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {dest.city}
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, marginTop: 3 }}>
                    {dest.flag}&nbsp;{dest.country}
                  </p>
                  <p
                    style={{
                      color: ACCENT,
                      fontSize: 16,
                      fontWeight: 800,
                      marginTop: 10,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {dest.priceFrom}
                  </p>
                  <div
                    style={{
                      marginTop: 12,
                      background: "var(--accent)",
                      color: "white",
                      borderRadius: 12,
                      padding: "10px 0",
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.01em",
                    }}
                  >
                    Zaplanuj ten wyjazd →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Dot indicators */}
        <div
          style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20, padding: "0 28px" }}
        >
          {FEATURED_DESTINATIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToCard(i)}
              aria-label={`Karta destynacji ${i + 1}`}
              style={{
                width: i === activeCard ? 20 : 8,
                height: 8,
                borderRadius: 4,
                border: "none",
                padding: 0,
                flexShrink: 0,
                cursor: "pointer",
                transition: "all 0.22s",
                background: i === activeCard ? "var(--accent)" : "var(--border)",
              }}
            />
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          §6  FINAL CTA — full-bleed photo, centered call to action
          ════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          minHeight: 460,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          src={galleryPhotos[2] || getCityPhotoUrl("Santorini", 1400)}
          alt="Europa czeka"
          fill
          sizes="100vw"
          className="object-cover"
        />
        {/* Dark tint */}
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(8,5,2,0.78)" }}
          aria-hidden="true"
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            padding: "88px 28px",
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(34px, 11vw, 62px)",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "white",
              letterSpacing: "-0.03em",
              marginBottom: 18,
            }}
          >
            Twój następny wyjazd<br />
            <em style={{ fontStyle: "italic", color: ACCENT }}>zaczyna się tutaj.</em>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            style={{
              color: "rgba(255,255,255,0.78)",
              fontSize: 15,
              maxWidth: 340,
              margin: "0 auto 36px",
              lineHeight: 1.72,
            }}
          >
            5 planów za darmo. Bez karty kredytowej.
            <br />Bez zobowiązań.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/quiz"
              style={{
                display: "inline-block",
                background: ACCENT,
                color: DARK,
                fontWeight: 800,
                borderRadius: 14,
                padding: "16px 42px",
                textDecoration: "none",
                fontSize: 16,
                letterSpacing: "0.01em",
                boxShadow: "0 6px 32px rgba(196,98,45,0.28)",
              }}
            >
              Zaplanuj wyjazd za darmo →
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.46 }}
            style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 14 }}
          >
            6 pytań · darmowe konto · 5 planów gratis, bez karty
          </motion.p>
        </div>
      </section>

    </div>
  );
}
