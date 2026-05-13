"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { TravelStyle, TripDuration } from "@/types";
import { MONTH_NAMES } from "@/lib/mockFlights";

const TOTAL_STEPS = 4;

const STYLE_OPTIONS: { value: TravelStyle; label: string; emoji: string; desc: string }[] = [
  { value: "history", label: "Historia", emoji: "🏛️", desc: "Muzea, zamki, starówki" },
  { value: "architecture", label: "Architektura", emoji: "🏗️", desc: "Katedry, mosty, design" },
  { value: "food", label: "Jedzenie", emoji: "🍜", desc: "Street food, lokalne bary" },
  { value: "nature", label: "Natura", emoji: "🌿", desc: "Parki, góry, jeziora" },
  { value: "beach", label: "Plaża", emoji: "🏖️", desc: "Morze, słońce, relaks" },
  { value: "nightlife", label: "Nightlife", emoji: "🎶", desc: "Bary, kluby, koncerty" },
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
  const {
    quizAnswers,
    currentQuizStep,
    setQuizAnswer,
    toggleStyle,
    nextQuizStep,
    prevQuizStep,
  } = useAppStore();

  const progress = ((currentQuizStep + 1) / TOTAL_STEPS) * 100;

  const canProceed = () => {
    if (currentQuizStep === 0) return quizAnswers.budget !== null;
    if (currentQuizStep === 1) return quizAnswers.styles.length > 0;
    if (currentQuizStep === 2) return quizAnswers.month !== null;
    if (currentQuizStep === 3) return quizAnswers.duration !== null;
    return false;
  };

  const handleNext = () => {
    if (currentQuizStep < TOTAL_STEPS - 1) {
      nextQuizStep();
    } else {
      router.push("/flights");
    }
  };

  return (
    <div className="flex flex-col flex-1 px-5 pb-8">
      {/* Top bar */}
      <div className="pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => currentQuizStep === 0 ? router.push("/") : prevQuizStep()}
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            ← Wstecz
          </button>
          <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
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

      {/* Steps */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={1}>
          {currentQuizStep === 0 && (
            <motion.div
              key="step-budget"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <StepBudget />
            </motion.div>
          )}
          {currentQuizStep === 1 && (
            <motion.div
              key="step-style"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <StepStyle styles={quizAnswers.styles} toggleStyle={toggleStyle} />
            </motion.div>
          )}
          {currentQuizStep === 2 && (
            <motion.div
              key="step-month"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <StepMonth
                month={quizAnswers.month}
                setMonth={(m) => setQuizAnswer("month", m)}
              />
            </motion.div>
          )}
          {currentQuizStep === 3 && (
            <motion.div
              key="step-duration"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <StepDuration
                duration={quizAnswers.duration}
                setDuration={(d) => setQuizAnswer("duration", d)}
                includeBerlin={quizAnswers.includeBerlin}
                setIncludeBerlin={(v) => setQuizAnswer("includeBerlin", v)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <motion.div layout className="mt-6">
        <button
          className="btn-primary"
          disabled={!canProceed()}
          onClick={handleNext}
        >
          {currentQuizStep < TOTAL_STEPS - 1 ? "Dalej →" : "Znajdź loty ✈️"}
        </button>
      </motion.div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepBudget() {
  const { quizAnswers, setQuizAnswer } = useAppStore();
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Jaki masz budżet?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Chodzi o całkowity koszt wyjazdu (loty + hotel + jedzenie).
      </p>
      <div className="flex flex-col gap-3">
        <button
          className={`option-card ${quizAnswers.budget === "low" ? "selected" : ""}`}
          onClick={() => setQuizAnswer("budget", "low")}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎒</span>
            <div>
              <p className="font-semibold text-sm">Backpacker</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Do 1500 PLN · hostele, street food, darmowe atrakcje
              </p>
            </div>
          </div>
        </button>
        <button
          className={`option-card ${quizAnswers.budget === "medium" ? "selected" : ""}`}
          onClick={() => setQuizAnswer("budget", "medium")}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧳</span>
            <div>
              <p className="font-semibold text-sm">Komfortowy</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                1500–3000 PLN · airbnb / 3★ hotel, restauracje
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function StepStyle({
  styles,
  toggleStyle,
}: {
  styles: TravelStyle[];
  toggleStyle: (s: TravelStyle) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Czym się interesujesz?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Wybierz co najmniej jedno — AI dopasuje plan do Twoich gustów.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`option-card ${styles.includes(opt.value) ? "selected" : ""}`}
            onClick={() => toggleStyle(opt.value)}
          >
            <span className="text-xl">{opt.emoji}</span>
            <p className="font-semibold text-sm mt-2">{opt.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {opt.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepMonth({
  month,
  setMonth,
}: {
  month: number | null;
  setMonth: (m: number) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Kiedy lecisz?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Miesiąc wyjazdu — AI uwzględni pogodę i sezon.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {MONTH_NAMES.map((name, i) => (
          <button
            key={name}
            className={`option-card text-center py-3 ${month === i + 1 ? "selected" : ""}`}
            onClick={() => setMonth(i + 1)}
          >
            <p className="font-semibold text-sm">{name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDuration({
  duration,
  setDuration,
  includeBerlin,
  setIncludeBerlin,
}: {
  duration: TripDuration | null;
  setDuration: (d: TripDuration) => void;
  includeBerlin: boolean;
  setIncludeBerlin: (v: boolean) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Ile dni?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Czas trwania wyjazdu bez podróży.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`option-card text-center ${duration === opt.value ? "selected" : ""}`}
            onClick={() => setDuration(opt.value)}
          >
            <p className="font-bold text-lg">{opt.label}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {opt.desc}
            </p>
          </button>
        ))}
      </div>

      {/* Berlin toggle */}
      <button
        className="glass-card w-full mt-5 p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIncludeBerlin(!includeBerlin)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🇩🇪</span>
          <div className="text-left">
            <p className="text-sm font-semibold">Loty z Berlina</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Dojazd ~100 PLN · często oszczędność 200+ PLN
            </p>
          </div>
        </div>
        <div
          className="w-12 h-6 rounded-full flex items-center transition-all duration-300 px-1"
          style={{
            background: includeBerlin
              ? "linear-gradient(135deg, #f59e0b, #f97316)"
              : "rgba(255,255,255,0.1)",
          }}
        >
          <motion.div
            className="w-4 h-4 bg-white rounded-full shadow"
            animate={{ x: includeBerlin ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </div>
      </button>
    </div>
  );
}
