"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { TravelStyle, TripDuration, TravelVibe, PlaceType, QuizAnswers } from "@/types";
import { MONTH_NAMES } from "@/lib/mockFlights";
import { POLISH_AIRPORTS, HUB_AIRPORTS } from "@/lib/airports";

const TOTAL_STEPS = 6;

const STYLE_OPTIONS: { value: TravelStyle; label: string; emoji: string; desc: string }[] = [
  { value: "history", label: "Historia", emoji: "🏛️", desc: "Muzea, zamki, starówki" },
  { value: "architecture", label: "Architektura", emoji: "🏗️", desc: "Katedry, mosty, design" },
  { value: "food", label: "Jedzenie", emoji: "🍜", desc: "Street food, lokalne bary" },
  { value: "nature", label: "Natura", emoji: "🌿", desc: "Parki, góry, jeziora" },
  { value: "beach", label: "Plaża", emoji: "🏖️", desc: "Morze, słońce, relaks" },
  { value: "nightlife", label: "Nightlife", emoji: "🎶", desc: "Bary, kluby, koncerty" },
];

const VIBE_OPTIONS: { value: TravelVibe; emoji: string; label: string; desc: string }[] = [
  { value: "chill", emoji: "☕", label: "Reset", desc: "Własne tempo, kawiarnie, luz" },
  { value: "intense", emoji: "🔥", label: "Full program", desc: "Jak najwięcej, każda chwila gra" },
  { value: "social", emoji: "🎉", label: "Towarzyski", desc: "Poznawanie ludzi, bary, imprezy" },
  { value: "active", emoji: "🥾", label: "Aktywny", desc: "Piesze trasy, sport, przyroda" },
];

const PLACE_OPTIONS: { value: PlaceType; emoji: string; label: string; desc: string }[] = [
  { value: "big_city", emoji: "🏙️", label: "Duże miasto", desc: "Metro, muzea, energia tłumu" },
  { value: "charming", emoji: "🏘️", label: "Kameralne", desc: "Małe uliczki, autentyczność, spokój" },
  { value: "beach_sun", emoji: "🏖️", label: "Słońce i woda", desc: "Plaże, morze, ciepło przede wszystkim" },
];

const DURATION_OPTIONS: { value: TripDuration; label: string; desc: string }[] = [
  { value: 3, label: "3 dni", desc: "Długi weekend" },
  { value: 5, label: "5 dni", desc: "Krótki urlop" },
  { value: 7, label: "7 dni", desc: "Tydzień" },
  { value: 10, label: "10 dni", desc: "Dłuższy wyjazd" },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function QuizPage() {
  const router = useRouter();
  const [dir, setDir] = useState(1);
  const [savedPrefs, setSavedPrefs] = useState<QuizAnswers | null>(null);
  const { quizAnswers, currentQuizStep, setQuizAnswer, toggleStyle, nextQuizStep, prevQuizStep, resetQuiz } =
    useAppStore();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.quiz_preferences) setSavedPrefs(d.quiz_preferences);
      })
      .catch(() => {});
  }, []);

  const handleUseSaved = () => {
    if (!savedPrefs) return;
    resetQuiz();
    if (savedPrefs.budget) setQuizAnswer("budget", savedPrefs.budget);
    if (savedPrefs.vibe) setQuizAnswer("vibe", savedPrefs.vibe);
    if (savedPrefs.placeType) setQuizAnswer("placeType", savedPrefs.placeType);
    if (savedPrefs.month) setQuizAnswer("month", savedPrefs.month);
    if (savedPrefs.duration) setQuizAnswer("duration", savedPrefs.duration);
    if (savedPrefs.airports?.length) setQuizAnswer("airports", savedPrefs.airports);
    savedPrefs.styles.forEach((s) => toggleStyle(s));
    router.push("/flights");
  };

  const progress = ((currentQuizStep + 1) / TOTAL_STEPS) * 100;

  const canProceed = () => {
    if (currentQuizStep === 0) return quizAnswers.budget !== null;
    if (currentQuizStep === 1) return quizAnswers.vibe !== null;
    if (currentQuizStep === 2) return quizAnswers.styles.length > 0;
    if (currentQuizStep === 3) return quizAnswers.placeType !== null;
    if (currentQuizStep === 4) return quizAnswers.month !== null;
    if (currentQuizStep === 5) return quizAnswers.duration !== null;
    return false;
  };

  const handleNext = () => {
    setDir(1);
    if (currentQuizStep < TOTAL_STEPS - 1) nextQuizStep();
    else router.push("/flights");
  };

  const handleBack = () => {
    setDir(-1);
    if (currentQuizStep === 0) router.push("/");
    else prevQuizStep();
  };

  return (
    <div className="flex flex-col flex-1 px-5 pb-8">
      {/* Top bar */}
      <div className="pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="text-sm font-medium transition-opacity hover:opacity-60"
            style={{ color: "var(--text-muted)" }}
          >
            ← Wstecz
          </button>
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {currentQuizStep + 1} / {TOTAL_STEPS}
          </span>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Saved prefs shortcut — only on step 0 */}
      <AnimatePresence>
        {savedPrefs && currentQuizStep === 0 && (
          <motion.button
            key="saved-prefs"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onClick={handleUseSaved}
            className="w-full mb-4 p-4 rounded-2xl text-left transition-opacity hover:opacity-90"
            style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.25)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                  Użyj poprzednich ustawień ↗
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Pomiń quiz — załaduj zapisane preferencje i przejdź do lotów
                </p>
              </div>
              <span className="text-xl ml-3">✦</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Steps */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          {currentQuizStep === 0 && (
            <motion.div key="step-budget" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeInOut" }}>
              <StepBudget />
            </motion.div>
          )}
          {currentQuizStep === 1 && (
            <motion.div key="step-vibe" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeInOut" }}>
              <StepVibe />
            </motion.div>
          )}
          {currentQuizStep === 2 && (
            <motion.div key="step-style" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeInOut" }}>
              <StepStyle styles={quizAnswers.styles} toggleStyle={toggleStyle} />
            </motion.div>
          )}
          {currentQuizStep === 3 && (
            <motion.div key="step-placetype" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeInOut" }}>
              <StepPlaceType />
            </motion.div>
          )}
          {currentQuizStep === 4 && (
            <motion.div key="step-month" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeInOut" }}>
              <StepMonth month={quizAnswers.month} setMonth={(m) => setQuizAnswer("month", m)} />
            </motion.div>
          )}
          {currentQuizStep === 5 && (
            <motion.div key="step-duration" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeInOut" }}>
              <StepDuration
                duration={quizAnswers.duration}
                setDuration={(d) => setQuizAnswer("duration", d)}
                airports={quizAnswers.airports}
                setAirports={(v) => setQuizAnswer("airports", v)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div layout className="mt-6">
        <button className="btn-primary" disabled={!canProceed()} onClick={handleNext}>
          {currentQuizStep < TOTAL_STEPS - 1 ? "Dalej →" : "Znajdź loty ✈️"}
        </button>
      </motion.div>
    </div>
  );
}

function StepBudget() {
  const { quizAnswers, setQuizAnswer } = useAppStore();
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Jaki masz budżet?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Całkowity koszt wyjazdu — loty, noclegi, jedzenie.
      </p>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Wybierz budżet">
        {[
          { value: "low" as const, emoji: "🎒", label: "Backpacker", desc: "Do 1500 PLN · hostele, street food, darmowe atrakcje" },
          { value: "medium" as const, emoji: "🧳", label: "Komfortowy", desc: "1500–3000 PLN · Airbnb lub 3★ hotel, restauracje" },
        ].map((opt) => (
          <button
            key={opt.value}
            className={`option-card ${quizAnswers.budget === opt.value ? "selected" : ""}`}
            onClick={() => setQuizAnswer("budget", opt.value)}
            aria-pressed={quizAnswers.budget === opt.value}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepVibe() {
  const { quizAnswers, setQuizAnswer } = useAppStore();
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Jaka energia wyjazdu?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Jak wyobrażasz sobie typowy dzień na miejscu.
      </p>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Wybierz energię wyjazdu">
        {VIBE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`option-card ${quizAnswers.vibe === opt.value ? "selected" : ""}`}
            onClick={() => setQuizAnswer("vibe", opt.value)}
            aria-pressed={quizAnswers.vibe === opt.value}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <p className="font-semibold text-sm mt-2">{opt.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepStyle({ styles, toggleStyle }: { styles: TravelStyle[]; toggleStyle: (s: TravelStyle) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Czym się interesujesz?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Wybierz co najmniej jedno.
      </p>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wybierz zainteresowania">
        {STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`option-card ${styles.includes(opt.value) ? "selected" : ""}`}
            onClick={() => toggleStyle(opt.value)}
            aria-pressed={styles.includes(opt.value)}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <p className="font-semibold text-sm mt-2">{opt.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepPlaceType() {
  const { quizAnswers, setQuizAnswer } = useAppStore();
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Jaki typ miejsca?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Gdzie czujesz się najlepiej.
      </p>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Wybierz typ miejsca">
        {PLACE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`option-card ${quizAnswers.placeType === opt.value ? "selected" : ""}`}
            onClick={() => setQuizAnswer("placeType", opt.value)}
            aria-pressed={quizAnswers.placeType === opt.value}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepMonth({ month, setMonth }: { month: number | null; setMonth: (m: number) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Kiedy lecisz?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Miesiąc wyjazdu — AI uwzględni pogodę i sezon.
      </p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Wybierz miesiąc">
        {MONTH_NAMES.map((name, i) => (
          <button
            key={name}
            className={`option-card text-center py-3 ${month === i + 1 ? "selected" : ""}`}
            onClick={() => setMonth(i + 1)}
            aria-pressed={month === i + 1}
          >
            <p className="font-semibold text-sm">{name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDuration({
  duration, setDuration, airports, setAirports,
}: {
  duration: TripDuration | null;
  setDuration: (d: TripDuration) => void;
  airports: string[];
  setAirports: (v: string[]) => void;
}) {
  const toggleAirport = (code: string) => {
    if (airports.includes(code)) {
      if (airports.length === 1) return; // keep at least one
      setAirports(airports.filter((a) => a !== code));
    } else {
      setAirports([...airports, code]);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Ile dni?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Czas trwania wyjazdu bez podróży.
      </p>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Wybierz czas trwania">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`option-card text-center ${duration === opt.value ? "selected" : ""}`}
            onClick={() => setDuration(opt.value)}
            aria-pressed={duration === opt.value}
          >
            <p className="font-bold text-xl">{opt.label}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold mb-1">Skąd lecisz?</p>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Wybierz jedno lub więcej lotnisk.
        </p>

        {/* Polish airports */}
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Polskie lotniska">
          {POLISH_AIRPORTS.map((ap) => {
            const selected = airports.includes(ap.code);
            return (
              <button
                key={ap.code}
                onClick={() => toggleAirport(ap.code)}
                aria-pressed={selected}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: selected ? "var(--accent)" : "var(--surface)",
                  color: selected ? "#fff" : "var(--text-primary)",
                  border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {ap.flag} {ap.city}
              </button>
            );
          })}
        </div>

        {/* European hubs */}
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
          🌍 Huby europejskie — taniej do Azji, USA i Afryki
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Huby europejskie">
          {HUB_AIRPORTS.map((ap) => {
            const selected = airports.includes(ap.code);
            const modeIcon = ap.transit?.mode === "bus" ? "🚌" : ap.transit?.mode === "train" ? "🚂" : "✈️";
            return (
              <button
                key={ap.code}
                onClick={() => toggleAirport(ap.code)}
                aria-pressed={selected}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: selected ? "#1D4ED8" : "var(--surface)",
                  color: selected ? "#fff" : "var(--text-primary)",
                  border: `1.5px solid ${selected ? "#1D4ED8" : "var(--border)"}`,
                }}
              >
                {ap.flag} {ap.city}
                {ap.transit && (
                  <span className="ml-1 text-xs opacity-70">
                    {modeIcon} ~{ap.transit.costPln} PLN
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
