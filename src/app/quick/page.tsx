"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { getCityPhotoUrl } from "@/lib/cityPhotos";
import type { Companion, TravelVibe, TravelStyle, DestinationRecommendation, FlightDetails, QuizAnswers } from "@/types";

type IconFC = React.FC<{ size?: number }>;

// ── Icons ──────────────────────────────────────────────────────────────────────

const IconSolo: IconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="12" cy="7" r="4" /><path d="M5 21a7 7 0 0 1 14 0" />
  </svg>
);
const IconCouple: IconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="9" cy="7" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0" />
    <circle cx="17" cy="8" r="3" /><path d="M14 20h8" />
  </svg>
);
const IconFamily: IconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="8" cy="6" r="3" /><circle cx="16" cy="6" r="3" /><circle cx="12" cy="16" r="2.5" />
    <path d="M2 19a6 6 0 0 1 12 0" /><path d="M10 19a6 6 0 0 1 12 0" />
  </svg>
);
const IconFriends: IconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="6" cy="7" r="3" /><circle cx="12" cy="5" r="3" /><circle cx="18" cy="7" r="3" />
    <path d="M0 21a6 6 0 0 1 12 0" /><path d="M12 21a6 6 0 0 1 12 0" />
  </svg>
);

// ── Generating overlay (reused logic from destinations page) ───────────────────

const CITY_FACTS_GENERIC = [
  "Lokalny targ jest zawsze 2-3x tańszy niż restauracje przy atrakcjach",
  "Komunikacja miejska jest zazwyczaj 4-5x tańsza niż Uber",
  "Centra europejskich miast wyglądają najpiękniej o 7 rano — zanim przybędą turyści",
  "Free walking tours są w niemal każdym europejskim mieście — płacisz napiwek",
  "Muzea państwowe są często bezpłatne w pierwszy lub ostatni weekend miesiąca",
  "Śniadanie w kawiarni za rogiem kosztuje 2-3x mniej niż w hotelu",
];

function GeneratingOverlay({
  city,
  currentDay,
  totalDays,
  previewActivities,
}: {
  city: string;
  currentDay: number;
  totalDays: number;
  previewActivities: { time: string; emoji: string; title: string }[];
}) {
  const [factIndex, setFactIndex] = useState(0);

  const hasProgress = totalDays > 0;
  const progress = hasProgress ? Math.round((currentDay / totalDays) * 100) : 5;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="flex flex-col flex-1 items-center justify-center px-6 gap-6">
        <div className="relative" style={{ width: 160, height: 110 }}>
          <div className="absolute bottom-0 select-none" style={{ left: "50%", transform: "translateX(-50%)", fontSize: "3rem" }}>
            🗼
          </div>
          <motion.div
            className="absolute select-none"
            style={{ left: 0, top: 0, fontSize: "1.75rem" }}
            animate={{ x: [-140, -50, 48, 58], y: [15, -15, 15, 42], rotate: [-30, -20, 5, 12] }}
            transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1], repeat: Infinity, repeatDelay: 1.2 }}
          >
            ✈️
          </motion.div>
        </div>

        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Buduję plan dla {city}
          </p>
          {hasProgress && (
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {currentDay < totalDays ? `Generuję dzień ${currentDay + 1} z ${totalDays}…` : "Finalizuję…"}
            </p>
          )}
        </div>

        {/* Day progress list */}
        {hasProgress && (
          <div className="w-full max-w-xs flex flex-col gap-2">
            {Array.from({ length: Math.min(totalDays, 7) }).map((_, i) => {
              const done = i + 1 <= currentDay;
              const active = i + 1 === currentDay + 1;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-500"
                    style={{
                      background: done ? "var(--accent)" : active ? "var(--accent-light)" : "var(--border)",
                      color: done ? "#fff" : "var(--text-muted)",
                      border: active ? "2px solid var(--accent)" : "none",
                    }}
                  >
                    {done ? "✓" : active ? (
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)", display: "block" }} />
                    ) : ""}
                  </div>
                  <p className="text-sm transition-all duration-500" style={{
                    color: done ? "var(--text-muted)" : active ? "var(--text-primary)" : "var(--border)",
                    fontWeight: active ? 600 : 400,
                    textDecoration: done ? "line-through" : "none",
                  }}>
                    Dzień {i + 1}
                  </p>
                </div>
              );
            })}
            {totalDays > 7 && (
              <p className="text-xs pl-8" style={{ color: "var(--text-muted)" }}>+ {totalDays - 7} kolejnych dni…</p>
            )}
          </div>
        )}

        {/* Activity preview when first day arrives */}
        <AnimatePresence mode="wait">
          {previewActivities.length > 0 ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full max-w-xs rounded-2xl px-4 py-3"
              style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.2)" }}
            >
              <p className="text-xs font-bold mb-2" style={{ color: "var(--accent)" }}>📍 Dzień 1 gotowy</p>
              <div className="flex flex-col gap-1.5">
                {previewActivities.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-10 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{a.time}</span>
                    <span className="text-sm">{a.emoji}</span>
                    <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{a.title}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="fact"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="w-full max-w-xs px-4 py-3 rounded-2xl"
              style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.2)" }}
            >
              <p className="text-xs font-bold mb-1" style={{ color: "var(--accent)" }}>💡 Czy wiesz, że…</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {CITY_FACTS_GENERIC[factIndex % CITY_FACTS_GENERIC.length]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 pb-10">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {hasProgress ? `${currentDay} / ${totalDays} dni` : "Łączę się z AI…"}
          </p>
          <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{progress}%</p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: "var(--accent)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Companion options ──────────────────────────────────────────────────────────

const COMPANION_OPTIONS: { value: Companion; Icon: IconFC; label: string; desc: string }[] = [
  { value: "solo",    Icon: IconSolo,    label: "Sam/a",           desc: "Solo — porady bezpieczeństwa, miejsca do poznania ludzi" },
  { value: "couple",  Icon: IconCouple,  label: "Para",            desc: "Romantyczne kolacje, wspólne aktywności" },
  { value: "family",  Icon: IconFamily,  label: "Rodzina",         desc: "Family-friendly, spokojne tempo, bezpieczne dzielnice" },
  { value: "friends", Icon: IconFriends, label: "Znajomi",         desc: "Aktywności grupowe, wieczorne wyjścia, podział kosztów" },
];

// ── Vibe options ──────────────────────────────────────────────────────────────

const VIBE_OPTIONS: { value: TravelVibe; label: string; desc: string }[] = [
  { value: "chill",   label: "Luz",           desc: "Kawiarnie, spacery, własne tempo" },
  { value: "intense", label: "Full program",  desc: "Jak najwięcej atrakcji" },
  { value: "social",  label: "Towarzyski",    desc: "Poznawanie ludzi, bary" },
  { value: "active",  label: "Aktywny",       desc: "Trasy, sport, ruch" },
];

const STYLE_OPTIONS: { value: TravelStyle; label: string }[] = [
  { value: "history",      label: "Historia" },
  { value: "architecture", label: "Architektura" },
  { value: "food",         label: "Jedzenie" },
  { value: "nature",       label: "Natura" },
  { value: "beach",        label: "Plaża" },
  { value: "nightlife",    label: "Nightlife" },
];

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

const TOTAL_STEPS = 4;

// ── Main page ─────────────────────────────────────────────────────────────────

export default function QuickPage() {
  const router = useRouter();
  const { setCurrentTrip, setIsGeneratingPlan, isGeneratingPlan } = useAppStore();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  // Form state
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("12:00");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("10:00");
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [vibe, setVibe] = useState<TravelVibe | null>(null);
  const [styles, setStyles] = useState<TravelStyle[]>([]);

  // Generate state
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });
  const [previewActivities, setPreviewActivities] = useState<{ time: string; emoji: string; title: string }[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  const toggleStyle = (s: TravelStyle) => {
    setStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const canNext = () => {
    if (step === 0) return city.trim().length >= 2 && country.trim().length >= 2;
    if (step === 1) return !!arrivalDate && !!returnDate && arrivalDate < returnDate;
    if (step === 2) return !!companion;
    return true; // step 3 — vibe+style optional
  };

  const next = () => {
    if (!canNext()) return;
    if (step < TOTAL_STEPS - 1) {
      setDir(1);
      setStep((s) => s + 1);
    } else {
      void handleGenerate();
    }
  };

  const back = () => {
    if (step === 0) { router.push("/start"); return; }
    setDir(-1);
    setStep((s) => s - 1);
  };

  const handleGenerate = async () => {
    const profile = await fetch("/api/profile").then((r) => r.json()).catch(() => ({}));
    if (!profile.authenticated) {
      router.push("/login?next=/quick");
      return;
    }
    if (!profile.can_generate) {
      setGenError("Brak kredytów. Kup Pack lub przejdź na Pro.");
      return;
    }

    const duration = Math.max(1, Math.round(
      (new Date(returnDate).getTime() - new Date(arrivalDate).getTime()) / 86400000
    ));

    const dest: DestinationRecommendation = {
      city: city.trim(),
      country: country.trim(),
      countryFlag: "🌍",
      tags: styles,
      budgetLevel: "medium",
      coverImage: "🌍",
      description: `Podróż do ${city.trim()}, ${country.trim()}`,
      estimatedFlightCost: "—",
    };

    const quiz: QuizAnswers = {
      budget: "medium",
      vibe: vibe,
      styles,
      placeType: null,
      month: new Date(arrivalDate).getMonth() + 1,
      duration,
      airports: ["WRO"],
      companion,
    };

    const flightDetails: FlightDetails = {
      arrivalDate,
      arrivalTime,
      returnDate,
      returnTime,
    };

    setIsGeneratingPlan(true);
    setGenProgress({ current: 0, total: 0 });
    setPreviewActivities([]);
    setGenError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: dest, quizAnswers: quiz, flightDetails }),
      });

      if (!res.ok || !res.body) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j.error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let msg: Record<string, unknown>;
          try { msg = JSON.parse(line); } catch { continue; }
          if (msg.error) throw new Error(`${msg.error as string}`);
          if (msg.status === "generating" && typeof msg.total === "number") {
            setGenProgress({ current: 0, total: msg.total as number });
          }
          if (msg.status === "day" && typeof msg.current === "number" && typeof msg.total === "number") {
            setGenProgress({ current: msg.current as number, total: msg.total as number });
            if (msg.current === 1 && msg.day) {
              const day = msg.day as { activities?: { time: string; emoji: string; title: string }[] };
              setPreviewActivities(day.activities?.slice(0, 3) ?? []);
            }
          }
          if (msg.done) {
            setCurrentTrip({
              id: msg.tripId as string,
              destination: dest,
              quizAnswers: quiz,
              plan: msg.plan as import("@/types").TripPlan,
              createdAt: new Date().toISOString(),
            });
            setIsGeneratingPlan(false);
            router.push(`/plan/${msg.tripId as string}`);
            return;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nieznany błąd";
      setIsGeneratingPlan(false);
      setGenError(`Nie udało się wygenerować planu: ${msg}`);
    }
  };

  if (isGeneratingPlan) {
    return (
      <GeneratingOverlay
        city={city.trim()}
        currentDay={genProgress.current}
        totalDays={genProgress.total}
        previewActivities={previewActivities}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 px-5 pb-8">
      {/* Top bar */}
      <div className="pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={back}
            className="text-sm font-medium transition-opacity hover:opacity-60"
            style={{ color: "var(--text-muted)" }}
          >
            ← Wstecz
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  transition: "all 0.2s",
                  background: i === step
                    ? "var(--accent)"
                    : i < step
                    ? "rgba(196,98,45,0.35)"
                    : "var(--border)",
                }}
              />
            ))}
          </div>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{ background: "var(--accent)" }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          {step === 0 && (
            <motion.div key="step-dest" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <StepDestination
                city={city} setCity={setCity}
                country={country} setCountry={setCountry}
              />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="step-dates" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <StepDates
                arrivalDate={arrivalDate} setArrivalDate={setArrivalDate}
                arrivalTime={arrivalTime} setArrivalTime={setArrivalTime}
                returnDate={returnDate} setReturnDate={setReturnDate}
                returnTime={returnTime} setReturnTime={setReturnTime}
              />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="step-companion" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <StepCompanion companion={companion} setCompanion={setCompanion} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="step-style" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <StepStyle vibe={vibe} setVibe={setVibe} styles={styles} toggleStyle={toggleStyle} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      {genError && (
        <div className="mb-3 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
          {genError}
        </div>
      )}

      {/* CTA */}
      <button
        className="btn-primary"
        disabled={!canNext()}
        onClick={next}
      >
        {step < TOTAL_STEPS - 1 ? "Dalej →" : `Stwórz plan dla ${city || "miasta"} ✨`}
      </button>
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function StepDestination({
  city, setCity, country, setCountry,
}: {
  city: string; setCity: (v: string) => void;
  country: string; setCountry: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Dokąd lecisz?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Podaj miasto i kraj — AI ułoży plan dopasowany do tej destynacji.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Miasto
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="np. Paryż"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl text-base outline-none transition-all"
            style={{
              background: "var(--bg-surface)",
              border: city.length >= 2 ? "2px solid var(--accent)" : "2px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Kraj
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="np. Francja"
            className="w-full px-4 py-3 rounded-2xl text-base outline-none transition-all"
            style={{
              background: "var(--bg-surface)",
              border: country.length >= 2 ? "2px solid var(--accent)" : "2px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {city.length >= 2 && country.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 p-4 rounded-2xl flex items-center gap-3"
          style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.25)" }}
        >
          <img
            src={getCityPhotoUrl(city, 400)}
            alt={city}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          />
          <div>
            <p className="font-bold text-base">{city}, {country}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>AI wygeneruje plan dla tej destynacji</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StepDates({
  arrivalDate, setArrivalDate, arrivalTime, setArrivalTime,
  returnDate, setReturnDate, returnTime, setReturnTime,
}: {
  arrivalDate: string; setArrivalDate: (v: string) => void;
  arrivalTime: string; setArrivalTime: (v: string) => void;
  returnDate: string; setReturnDate: (v: string) => void;
  returnTime: string; setReturnTime: (v: string) => void;
}) {
  const duration = arrivalDate && returnDate && returnDate > arrivalDate
    ? Math.round((new Date(returnDate).getTime() - new Date(arrivalDate).getTime()) / 86400000)
    : null;

  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Kiedy lecisz?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        AI dopasuje plan do Twoich godzin przylotu i wylotu.
      </p>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Przylot do destynacji
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="flex-1 px-3 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
            />
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-28 px-3 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Wylot (powrót)
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={returnDate}
              min={arrivalDate || undefined}
              onChange={(e) => setReturnDate(e.target.value)}
              className="flex-1 px-3 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
            />
            <input
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="w-28 px-3 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {duration !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl text-center"
            style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.25)" }}
          >
            <p className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{duration} {duration === 1 ? "dzień" : duration <= 4 ? "dni" : "dni"}</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Plan będzie dopasowany do {duration === 1 ? "1 dnia" : `${duration} dni`} w {duration <= 2 ? "tym mieście" : "tej destynacji"}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StepCompanion({
  companion, setCompanion,
}: {
  companion: Companion | null;
  setCompanion: (v: Companion) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Kto leci?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        AI dopasuje restauracje, atrakcje i wskazówki do Twojej grupy.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {COMPANION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`option-card ${companion === opt.value ? "selected" : ""}`}
            onClick={() => setCompanion(opt.value)}
            aria-pressed={companion === opt.value}
          >
            <span style={{ color: companion === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
              <opt.Icon size={24} />
            </span>
            <p className="font-semibold text-sm mt-2">{opt.label}</p>
            <p className="text-xs mt-0.5 leading-tight" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepStyle({
  vibe, setVibe, styles, toggleStyle,
}: {
  vibe: TravelVibe | null;
  setVibe: (v: TravelVibe) => void;
  styles: TravelStyle[];
  toggleStyle: (s: TravelStyle) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Jaki styl?</h2>
      <p className="text-sm mt-2 mb-5" style={{ color: "var(--text-muted)" }}>
        Opcjonalne — AI lepiej dopasuje atrakcje.
      </p>

      <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Energia wyjazdu
      </p>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {VIBE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setVibe(opt.value)}
            aria-pressed={vibe === opt.value}
            className="px-3 py-2.5 rounded-2xl text-left transition-all"
            style={vibe === opt.value ? {
              background: "var(--accent-light)",
              border: "1.5px solid var(--accent)",
            } : {
              background: "var(--bg-surface)",
              border: "1.5px solid var(--border)",
            }}
          >
            <p className="font-semibold text-sm" style={{ color: vibe === opt.value ? "var(--accent)" : "var(--text-primary)" }}>
              {opt.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Zainteresowania
      </p>
      <div className="flex flex-wrap gap-2">
        {STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggleStyle(opt.value)}
            aria-pressed={styles.includes(opt.value)}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={styles.includes(opt.value) ? {
              background: "var(--accent)",
              color: "#fff",
              border: "1.5px solid var(--accent)",
            } : {
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1.5px solid var(--border)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
