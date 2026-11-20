"use client";

import Link from "next/link";
import { QUIZ_QUESTION_COUNT } from "@/lib/quizSteps";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import DropSignup from "@/app/components/DropSignup";
import DealsStrip, { type StripDeal } from "@/app/components/DealsStrip";
import { ORIGIN_GENITIVE } from "@/lib/drop/email";
import { resolveOrigin } from "@/lib/drop/defaults";
import { HOME, homeSubtitle } from "@/lib/homeCopy";
import HomeDreams from "./HomeDreams";

import { IconCompass, IconClock, IconBook, IconCoin } from "./Icons";

// ─── Static data ────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: `${QUIZ_QUESTION_COUNT} pytań o Was`,
    desc: "Ilu Was jedzie, kiedy, jaki budżet na osobę i co lubicie robić. Zajmuje mniej niż 3 minuty.",
  },
  {
    num: "02",
    title: "6 kierunków w Waszym budżecie",
    desc: "Patrzymy na budżet, styl i termin, i dobieramy 6 miejsc, które mieszczą się w widełkach. Z ceną lotu z Waszego lotniska, gdy mamy świeżą wycenę.",
  },
  {
    num: "03",
    title: "Plan godzina po godzinie, do wysłania ekipie",
    desc: "Śniadania, muzea, restauracje: z cenami, trasami i trikami budżetowymi. Koszt na osobę i razem. Link do planu wklejacie na czacie, otwiera się bez konta.",
  },
];

const EXAMPLE_PLAN = [
  { time: "08:30", Icon: IconClock, text: "Śniadanie w lokalnej piekarni — croissant + kawa, ~4 EUR" },
  { time: "10:00", Icon: IconBook, text: "Park Güell — wejście 10 EUR, widok na całą Barcelonę" },
  { time: "13:00", Icon: IconCoin, text: "Obiad na Mercat de Santa Caterina — 2x tapas za 9 EUR" },
  { time: "16:00", Icon: IconCompass, text: "Plaża Barceloneta — bezpłatna, leżak 3 EUR" },
  { time: "20:00", Icon: IconClock, text: "Aperitivo na Las Ramblas — wino + pintxos ~12 EUR" },
];

// ─── Shared style tokens ─────────────────────────────────────────────────────

// Poster brick: illustration, large type and accents on the dark sections
const ACCENT = "var(--accent-poster)";
const DARK = "#0D0A07";
const OVERLINE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
  color: "var(--accent)",
  marginBottom: 14,
};

// ─── Closing poster ──────────────────────────────────────────────────────────
// The existing static footer illustration keeps the brand silhouette.

const WALKER_PATHS = [
  "M 4 78 C 28 64, 96 58, 154 62 C 168 64, 176 72, 170 78 C 168 82, 156 84, 138 86 C 90 92, 38 92, 14 88 C 4 86, -2 82, 4 78 Z",
  "M 76 68 C 70 30, 88 12, 104 12 C 124 12, 134 32, 128 68 Z",
  "M 86 86 L 86 96 C 78 98, 74 102, 78 108 C 80 112, 86 116, 94 118 L 116 118 C 122 118, 126 114, 126 108 L 126 86 Z",
  "M 88 118 C 80 132, 76 158, 78 184 L 82 208 L 88 220 L 122 220 L 130 210 L 132 134 C 132 124, 126 118, 120 118 L 116 118 Z",
  "M 130 124 C 148 126, 162 138, 162 156 L 162 196 C 162 206, 156 210, 148 208 L 132 204 L 132 134 C 132 124, 130 124, 130 124 Z",
  "M 88 220 L 76 264 L 60 290 L 48 296 L 52 300 L 92 300 L 98 268 L 110 220 Z",
  "M 112 220 L 118 244 L 130 268 L 154 274 L 166 270 L 160 264 L 146 260 L 134 252 L 126 232 L 122 220 Z",
];

// Closing scene: same poster world at dusk, the walker heading off toward the sun.
function DuskPoster() {
  return (
    <svg
      viewBox="0 0 1440 360"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", width: "100%", height: "clamp(200px, 24vw, 340px)" }}
    >
      <defs>
        <mask id="dusk-sun-cuts">
          <rect width="1440" height="360" fill="white" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x="0" y={226 + i * 20} width="1440" height={5 + i * 3} fill="black" />
          ))}
        </mask>
        <clipPath id="dusk-ink">
          <circle cx="720" cy="270" r="150" />
          <path d="M0 270 C 240 250, 480 262, 700 246 C 900 232, 1120 258, 1440 244 L1440 360 L0 360 Z" />
        </clipPath>
        <filter id="dusk-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.18" />
          </feComponentTransfer>
        </filter>
      </defs>

      <circle cx="720" cy="270" r="150" fill="var(--accent-poster)" mask="url(#dusk-sun-cuts)" />
      <path
        d="M0 270 C 240 250, 480 262, 700 246 C 900 232, 1120 258, 1440 244 L1440 360 L0 360 Z"
        fill="var(--text-secondary)"
      />
      <path
        d="M0 312 C 300 296, 560 306, 760 292 C 960 280, 1180 300, 1440 290 L1440 360 L0 360 Z"
        fill="var(--text-muted)"
      />
      <path
        d="M0 346 C 280 336, 560 340, 780 326 C 900 318, 1000 316, 1120 322 C 1260 328, 1360 336, 1440 338 L1440 360 L0 360 Z"
        fill="var(--green)"
      />

      {/* Mirrored so he walks right, toward the sun and off the page */}
      <g transform="translate(828 158) scale(-0.56 0.56)" fill="var(--text-primary)">
        {WALKER_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* Grain only on the sun and land, so the sky meets the section without a seam */}
      <rect width="1440" height="360" filter="url(#dusk-grain)" clipPath="url(#dusk-ink)" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomeClient({
  faq,
  heroAnimation,
  exampleSummary,
  initialDeals = [],
  initialDealsOrigin = "WRO",
}: {
  /** Okazje z domyślnego lotniska, pobrane na serwerze, żeby pasek nie wskakiwał po załadowaniu */
  initialDeals?: StripDeal[];
  initialDealsOrigin?: string;
  /** Objection handling, rendered before the final call to action */
  faq?: React.ReactNode;
  heroAnimation?: React.ReactNode;
  exampleSummary?: React.ReactNode;
}) {
  /* ── lotnisko dla zapisu na zrzut: to samo, które wybrano w pasku okazji ── */
  const [dropOrigin, setDropOrigin] = useState(initialDealsOrigin);
  useEffect(() => {
    try { setDropOrigin(resolveOrigin(window.localStorage.getItem("deals_origin"))); } catch { /* storage zablokowany */ }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="home-content">

      {/* ════════════════════════════════════════════════════════════════════
          §1  HERO — two paths and the group chat story
          ════════════════════════════════════════════════════════════════════ */}
      <section className="home-hero">
        {/* Pierwszy ekran: tylko H1 i przyciski do quizu. Cała reszta jest niżej, w DOM-ie, nie schowana CSS-em. */}
        <div className="home-container home-hero-first">
          <motion.h1 className="home-title"
            initial={false}
            style={{
              fontFamily: "var(--font-heading)",
              lineHeight: 1.02,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            {HOME.h1}
          </motion.h1>

          <motion.div className="home-hero-actions"
            initial={false}
          >
            <Link
              href={HOME.ctaTeamHref}
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
              {HOME.ctaTeam}
            </Link>
            <Link
              href={HOME.ctaSoloHref}
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
              {HOME.ctaSolo}
            </Link>
          </motion.div>
        </div>

        <div className="home-container home-hero-grid">
        {/* ── Pod zgięciem: opis, mikrokopia i linki pomocnicze obok animacji ── */}
        <div className="home-hero-copy">
          <motion.h2 className="home-lead"
            initial={false}
            style={{
              fontFamily: "var(--font-heading)",
              lineHeight: 1.08,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.025em",
              marginBottom: 12,
            }}
          >
            {HOME.lead}
          </motion.h2>

          <motion.p className="home-subtitle"
            initial={false}
            style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            {homeSubtitle()}
          </motion.p>

          <motion.p className="home-micro"
            initial={false}
            style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}
          >
            {HOME.micro}
          </motion.p>
          <motion.p className="home-secondary-links"
            initial={false}
            style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 10 }}
          >
            <Link href={HOME.quickHref} style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {HOME.quickLink}
            </Link>
            <a href={HOME.dropHref} style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {HOME.dropLink}
            </a>
          </motion.p>
        </div>
        {heroAnimation}
        </div>
      </section>

      <HomeDreams />

      <div className="home-discovery home-container">
      <DealsStrip initialDeals={initialDeals} initialOrigin={initialDealsOrigin} onOriginChange={setDropOrigin} />

      {/* ════════════════════════════════════════════════════════════════════
          CZWARTKOWY ZRZUT — zapis na tygodniowy mail z lotami na weekend, zaraz pod okazjami
          ════════════════════════════════════════════════════════════════════ */}
      <section id="zrzut" className="home-signup" style={{ background: "var(--bg-surface)" }}>
        <div>
          <DropSignup
            defaultAirports={[dropOrigin]}
            cheapestHint={dropOrigin === initialDealsOrigin && initialDeals[0]
              ? { from: ORIGIN_GENITIVE[dropOrigin] ?? dropOrigin, price: initialDeals[0].price, thirdPrice: (initialDeals[2] ?? initialDeals[initialDeals.length - 1]).price }
              : null}
          />
        </div>
      </section>

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          §3  HOW IT WORKS — dark, editorial, numbered steps
          ════════════════════════════════════════════════════════════════════ */}
      <section
        id="jak-to-dziala" className="home-section"
        style={{ background: DARK, color: "white" }}
      >
        <div className="home-container">
          <motion.p
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ ...OVERLINE, color: ACCENT }}
          >
            Jak to działa
          </motion.p>

          <motion.h2
            initial={false}
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

          <div className="home-steps">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={false}
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
                    color: ACCENT,
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
            initial={false}
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
                background: "var(--accent)",
                color: "white",
                fontWeight: 800,
                borderRadius: 14,
                padding: "16px 28px",
                fontSize: 16,
                letterSpacing: "0.01em",
                boxShadow: `0 4px 28px rgba(196,98,45,0.22)`,
              }}
            >
              Zacznij za darmo — {QUIZ_QUESTION_COUNT} pytań →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          §4  PLAN PREVIEW — product demo in warm section
          ════════════════════════════════════════════════════════════════════ */}
      <section className="home-section" style={{ background: "var(--bg-surface)" }}>
        <div className="home-container home-preview">
          <div>
          <motion.p
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={OVERLINE}
          >
            Przykładowy plan
          </motion.p>

          <motion.h2
            initial={false}
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
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Przykład dla 4 osób.</em>
          </motion.h2>

          <motion.p
            initial={false}
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

          </div>
          {/* The actual plan card */}
          <motion.div
            initial={false}
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
            {exampleSummary}
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
                <p style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.9, marginBottom: 4 }}>
                  Dzień 1 — Piątek
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  Barcelona, Katalonia
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 12, opacity: 0.9, marginBottom: 3 }}>Budżet dnia</p>
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
                <span style={{ flexShrink: 0, paddingTop: 3 }}><item.Icon size={18} /></span>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)" }}>
                  {item.text}
                </p>
              </div>
            ))}

            {/* Co jeszcze potrafi plan */}
            <p style={{ padding: "12px 20px", fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
              To fragment jednego dnia. W swoim planie zmienisz dzień, podmienisz atrakcję, sprawdzisz budżet i mapę, pobierzesz PDF i wrzucisz wyjazd do kalendarza.
            </p>

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
                  display: "inline-block",
                  padding: "6px 0",
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

      {faq}

      {/* ════════════════════════════════════════════════════════════════════
          §6  FINAL CTA — dusk poster: the walker heads off over the ridge
          ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "var(--text-primary)", overflow: "hidden" }}>
        <div className="home-container home-finale" style={{ textAlign: "center" }}>
          <motion.h2
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(34px, 11vw, 62px)",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "var(--bg-primary)",
              letterSpacing: "-0.03em",
              marginBottom: 32,
            }}
          >
            W piątek rano<br />
            <em style={{ fontStyle: "italic", color: ACCENT }}>możesz już być w drodze.</em>
          </motion.h2>

          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link
              href={HOME.ctaTeamHref}
              style={{
                display: "inline-block",
                background: "var(--accent)",
                color: "white",
                fontWeight: 800,
                borderRadius: 14,
                padding: "16px 42px",
                textDecoration: "none",
                fontSize: 16,
                letterSpacing: "0.01em",
              }}
            >
              {HOME.ctaTeam}
            </Link>
            <Link
              href={HOME.ctaSoloHref}
              style={{ display: "inline-block", color: "var(--bg-primary)", textDecoration: "underline", textUnderlineOffset: 4, fontSize: 15, fontWeight: 600, padding: "16px 20px" }}
            >
              {HOME.ctaSolo}
            </Link>
          </motion.div>

          <p style={{ color: "rgba(245,239,224,0.78)", fontSize: 13, marginTop: 14 }}>
            {HOME.micro}
          </p>
          <p style={{ fontSize: 14, marginTop: 14 }}>
            <Link href={HOME.guideHref} style={{ color: "var(--bg-primary)", textDecoration: "underline", textUnderlineOffset: 4, fontWeight: 600 }}>
              {HOME.guideLink}
            </Link>
          </p>
        </div>

        <DuskPoster />
      </section>

    </div>
  );
}
