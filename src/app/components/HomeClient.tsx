"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { getCityPhotoUrl, FEATURED_DESTINATIONS } from "@/lib/cityPhotos";

// ─── Static data ────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "5 pytań o Ciebie",
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

const GOLD = "#E8A030";
const DARK = "#0D0A07";
const OVERLINE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
  color: "var(--accent)",
  marginBottom: 14,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomeClient({ galleryPhotos = [] }: { galleryPhotos?: string[] }) {
  /* ── full-width + dark nav override ── */
  useEffect(() => {
    document.body.classList.add("is-home");
    return () => document.body.classList.remove("is-home");
  }, []);

  /* ── hero rotating background ── */
  const [heroIdx, setHeroIdx] = useState(0);
  const heroPhotos =
    galleryPhotos.length >= 3
      ? galleryPhotos.slice(0, 5)
      : FEATURED_DESTINATIONS.slice(0, 5).map((d) => getCityPhotoUrl(d.city, 1400));

  useEffect(() => {
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % heroPhotos.length), 5500);
    return () => clearInterval(id);
  }, [heroPhotos.length]);

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
          §1  HERO — Full viewport, cinematic, rotating city photos
          ════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          height: "100dvh",
          minHeight: 620,
          overflow: "hidden",
        }}
      >
        {/* Rotating background photo */}
        <AnimatePresence mode="wait">
          <motion.div
            key={heroIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0 }}
          >
            <Image
              src={heroPhotos[heroIdx]}
              alt="Europejskie miasto"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Deep gradient — bottom heavy so text pops */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(8,5,2,0.12) 0%, rgba(8,5,2,0.32) 35%, rgba(8,5,2,0.76) 65%, rgba(8,5,2,0.97) 100%)",
          }}
        />

        {/* ── Content ── */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "72px 28px 84px",   /* top pad = fixed nav height */
            maxWidth: 920,
          }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(196,98,45,0.82)",
              backdropFilter: "blur(10px)",
              color: "white",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 22,
              width: "fit-content",
              letterSpacing: "0.02em",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            ✈️&nbsp;<span>500+ podróżników już wie dokąd jedzie</span>
          </motion.div>

          {/* Headline — Cormorant Garamond, massive, editorial */}
          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(44px, 12vw, 86px)",
              lineHeight: 1.02,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.03em",
              marginBottom: 18,
            }}
          >
            Masz wolny weekend<br />
            i trochę kasy?<br />
            <em style={{ fontStyle: "italic", color: GOLD }}>My mamy plan.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.3, ease: "easeOut" }}
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: "clamp(14px, 3.5vw, 17px)",
              lineHeight: 1.7,
              maxWidth: 400,
              marginBottom: 30,
            }}
          >
            Odpowiedz na 5 pytań. Dostaniesz 3 destynacje
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
                boxShadow: "0 4px 28px rgba(196,98,45,0.45)",
              }}
            >
              Zaplanuj wyjazd — za darmo →
            </Link>
            <a
              href="#jak-to-dziala"
              style={{
                color: "rgba(255,255,255,0.58)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Jak to działa? ↓
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.82 }}
            style={{ color: "rgba(255,255,255,0.32)", fontSize: 11, marginTop: 14 }}
          >
            Bez karty · 5 planów gratis · 3 minuty
          </motion.p>
        </div>

        {/* Photo dots — bottom right */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 28,
            right: 24,
            display: "flex",
            gap: 6,
            zIndex: 3,
          }}
        >
          {heroPhotos.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIdx(i)}
              aria-label={`Zdjęcie tła ${i + 1}`}
              style={{
                width: i === heroIdx ? 24 : 6,
                height: 4,
                borderRadius: 2,
                background: i === heroIdx ? GOLD : "rgba(255,255,255,0.3)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          ))}
        </div>

        {/* Scroll bounce indicator */}
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, 9, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          style={{
            position: "absolute",
            bottom: 22,
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.28)",
            fontSize: 18,
            zIndex: 3,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          ↓
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          §2  MARQUEE — accent strip scrolling with destination names
          ════════════════════════════════════════════════════════════════════ */}
      <div
        aria-hidden="true"
        style={{ background: "var(--accent)", overflow: "hidden", padding: "11px 0" }}
      >
        <div className="marquee-track">
          <div className="marquee-inner">
            {[...FEATURED_DESTINATIONS, ...FEATURED_DESTINATIONS].map((d, i) => (
              <span
                key={i}
                style={{
                  flexShrink: 0,
                  color: "white",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.07em",
                  marginRight: 36,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {d.flag}&nbsp;{d.city}&nbsp;·&nbsp;{d.priceFrom}
                <span style={{ opacity: 0.32 }}>✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>

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
            <em style={{ color: GOLD, fontStyle: "italic" }}>do gotowego planu.</em>
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
                    opacity: 0.88,
                  }}
                >
                  {step.num}
                </div>
                <div style={{ paddingTop: 10 }}>
                  <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 7, letterSpacing: "-0.01em" }}>
                    {step.title}
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.48)", lineHeight: 1.78 }}>
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
                background: GOLD,
                color: DARK,
                fontWeight: 800,
                borderRadius: 14,
                padding: "16px 28px",
                fontSize: 16,
                letterSpacing: "0.01em",
                boxShadow: `0 4px 28px rgba(232,160,48,0.22)`,
              }}
            >
              Zacznij za darmo — 5 pytań →
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
            Barcelona, 5 dni.<br />
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
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.68, marginBottom: 4 }}>
                  Dzień 1 — Wtorek
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  Barcelona, Katalonia 🇪🇸
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 9, opacity: 0.62, marginBottom: 3 }}>Budżet dnia</p>
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
                  background: i % 2 === 0 ? "#FAFAF8" : "#F5F1EC",
                  borderBottom: i < EXAMPLE_PLAN.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
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
                <p style={{ fontSize: 12, lineHeight: 1.65, color: "var(--text-primary)" }}>
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
              Wszystkie →
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
            paddingLeft: 24,
            scrollPaddingLeft: 24,
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
                      fontSize: 9,
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
                  <p style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, marginTop: 3 }}>
                    {dest.flag}&nbsp;{dest.country}
                  </p>
                  <p
                    style={{
                      color: GOLD,
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
            <em style={{ fontStyle: "italic", color: GOLD }}>zaczyna się tutaj.</em>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            style={{
              color: "rgba(255,255,255,0.58)",
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
                background: GOLD,
                color: DARK,
                fontWeight: 800,
                borderRadius: 14,
                padding: "16px 42px",
                textDecoration: "none",
                fontSize: 16,
                letterSpacing: "0.01em",
                boxShadow: "0 6px 32px rgba(232,160,48,0.28)",
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
            style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, marginTop: 14 }}
          >
            Bez karty · 5 planów gratis · 3 minuty
          </motion.p>
        </div>
      </section>

    </div>
  );
}
