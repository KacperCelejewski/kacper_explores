"use client";

import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { TravelStyle, TripDuration, TravelVibe, PlaceType, QuizAnswers } from "@/types";
import { MONTH_NAMES } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { parseDropParams } from "@/lib/drop/quizParams";
import QuizProgress from "@/components/quiz/QuizProgress";
import {
  IconBackpack,
  IconSuitcase,
  IconSun,
  IconLightning,
  IconPeople,
  IconMountain,
  IconArch,
  IconBuilding,
  IconFork,
  IconLeaf,
  IconWave,
  IconMoon,
  IconCity,
  IconHouseSmall,
  IconSunWave,
  IconPin,
  IconCar,
  IconGlobe,
  IconPlane,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
} from "@/app/components/Icons";
import type { Companion } from "@/types";

type IconFC = React.FC<{ size?: number }>;

const TOTAL_STEPS = 6;
// Link ze zrzutu zna już miesiąc, długość i lotnisko, więc pomija kroki 4 i 5
const DROP_TOTAL_STEPS = 4;
// Single-choice steps move on by themselves right after the tap
const AUTO_ADVANCE_STEPS = [0, 1, 2];
const AUTO_ADVANCE_MS = 340;

// ── Region definitions ────────────────────────────────────────────────────────

type RegionId = "wroclaw" | "slaskie" | "krakow" | "warszawa" | "poznan" | "trojmiasto" | "inne";
type Willingness = "local" | "poland" | "europe";

const REGIONS: { id: RegionId; label: string; subLabel: string; code: string; local: string[] }[] = [
  { id: "wroclaw",    label: "Wrocław",     subLabel: "Dolny Śląsk",       code: "WRO", local: ["WRO"] },
  { id: "slaskie",   label: "Katowice",    subLabel: "Śląsk / Zagłębie",  code: "KTW", local: ["KTW"] },
  { id: "krakow",    label: "Kraków",      subLabel: "Małopolska",         code: "KRK", local: ["KRK"] },
  { id: "warszawa",  label: "Warszawa",    subLabel: "Mazowsze",           code: "WAW", local: ["WAW", "WMI"] },
  { id: "poznan",    label: "Poznań",      subLabel: "Wielkopolska",       code: "POZ", local: ["POZ"] },
  { id: "trojmiasto",label: "Trójmiasto",  subLabel: "Gdańsk / Gdynia",    code: "GDN", local: ["GDN"] },
  { id: "inne",      label: "Inne miasto", subLabel: "Najbliższe lotnisko", code: "—", local: ["WRO"] },
];

// Nearby Polish airports added when willingness = "poland"
const NEARBY: Record<RegionId, string[]> = {
  wroclaw:    ["WRO", "KTW"],
  slaskie:    ["KTW", "KRK", "WRO"],
  krakow:     ["KRK", "KTW"],
  warszawa:   ["WAW", "WMI"],
  poznan:     ["POZ", "WRO"],
  trojmiasto: ["GDN"],
  inne:       ["WRO", "KTW", "KRK", "WAW"],
};

const HUB_CODES = ["BER", "BUD", "VIE", "AMS", "LGW", "IST"];

function airportsFor(region: RegionId, willingness: Willingness): string[] {
  if (willingness === "local")   return REGIONS.find(r => r.id === region)!.local;
  if (willingness === "poland")  return NEARBY[region];
  return [...NEARBY[region], ...HUB_CODES];
}

function inferRegion(airports: string[]): RegionId {
  if (airports.includes("GDN")) return "trojmiasto";
  if (airports.includes("POZ") && !airports.includes("WRO")) return "poznan";
  if ((airports.includes("WAW") || airports.includes("WMI")) && !airports.includes("KTW")) return "warszawa";
  if (airports.includes("KRK") && !airports.includes("KTW")) return "krakow";
  if (airports.includes("KTW") && !airports.includes("WRO")) return "slaskie";
  return "wroclaw";
}

function inferWillingness(airports: string[]): Willingness {
  if (airports.some(a => HUB_CODES.includes(a))) return "europe";
  if (airports.length > 2) return "poland";
  return "local";
}

// ── Shared ────────────────────────────────────────────────────────────────────

const STYLE_OPTIONS: { value: TravelStyle; label: string; Icon: IconFC; desc: string }[] = [
  { value: "history",      label: "Historia",     Icon: IconArch,     desc: "Muzea, zamki, starówki" },
  { value: "architecture", label: "Architektura", Icon: IconBuilding, desc: "Katedry, mosty, design" },
  { value: "food",         label: "Jedzenie",     Icon: IconFork,     desc: "Street food, lokalne bary" },
  { value: "nature",       label: "Natura",       Icon: IconLeaf,     desc: "Parki, góry, jeziora" },
  { value: "beach",        label: "Plaża",        Icon: IconWave,     desc: "Morze, słońce, relaks" },
  { value: "nightlife",    label: "Nightlife",    Icon: IconMoon,     desc: "Bary, kluby, koncerty" },
];

const VIBE_OPTIONS: { value: TravelVibe; Icon: IconFC; label: string; desc: string }[] = [
  { value: "chill",   Icon: IconSun,       label: "Reset",        desc: "Własne tempo, kawiarnie, luz" },
  { value: "intense", Icon: IconLightning, label: "Full program", desc: "Jak najwięcej, każda chwila gra" },
  { value: "social",  Icon: IconPeople,    label: "Towarzyski",   desc: "Poznawanie ludzi, bary, imprezy" },
  { value: "active",  Icon: IconMountain,  label: "Aktywny",      desc: "Piesze trasy, sport, przyroda" },
];

const PLACE_OPTIONS: { value: PlaceType; Icon: IconFC; label: string; desc: string }[] = [
  { value: "big_city",   Icon: IconCity,       label: "Duże miasto",   desc: "Metro, muzea, energia tłumu" },
  { value: "charming",   Icon: IconHouseSmall, label: "Kameralne",     desc: "Małe uliczki, autentyczność, spokój" },
  { value: "beach_sun",  Icon: IconSunWave,    label: "Słońce i woda", desc: "Plaże, morze, ciepło przede wszystkim" },
];

const DURATION_PRESETS: { value: number; label: string; sub?: string }[] = [
  { value: 2,  label: "Weekend",       sub: "2 dni" },
  { value: 3,  label: "Długi weekend", sub: "3 dni" },
  { value: 5,  label: "Krótki urlop",  sub: "5 dni" },
  { value: 7,  label: "Tydzień",       sub: "7 dni" },
  { value: 10, label: "10 dni" },
  { value: 14, label: "2 tygodnie",    sub: "14 dni" },
];

const COMPANION_LABELS: Record<Companion, string> = {
  solo: "Sam/a", couple: "Para", family: "Rodzina", friends: "Znajomi",
};
const BUDGET_LABELS = { low: "Backpacker", medium: "Komfortowy" } as const;
const VIBE_LABELS: Record<TravelVibe, string> = {
  chill: "Reset", intense: "Full program", social: "Towarzyski", active: "Aktywny",
};
const MONTH_SHORT = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];

// Once the visitor has moved between questions, each new title takes focus so keyboard
// and screen-reader users land on the question instead of a stale button
const TitleFocusContext = createContext(false);

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};
const slideTransition = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

// What the visitor has told us so far, in the order they told it
function answeredLabels(a: QuizAnswers, upTo: number): string[] {
  const out: string[] = [];
  if (upTo > 0 && a.companion) out.push(COMPANION_LABELS[a.companion]);
  if (upTo > 1 && a.budget)    out.push(BUDGET_LABELS[a.budget]);
  if (upTo > 2 && a.vibe)      out.push(VIBE_LABELS[a.vibe]);
  if (upTo > 3 && a.styles.length > 0) {
    out.push(
      a.styles.length <= 2
        ? a.styles.map((s) => STYLE_OPTIONS.find((o) => o.value === s)?.label ?? s).join(" + ")
        : `${a.styles.length} zainteresowań`,
    );
  }
  if (upTo > 4 && a.month) out.push(`${MONTH_SHORT[a.month - 1]} · ${a.duration ?? 5} dni`);
  return out;
}

function OptionCard({
  selected, onClick, className = "", style, children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`quiz-option ${selected ? "selected" : ""} ${className}`}
      style={style}
      onClick={onClick}
      aria-pressed={selected}
    >
      {children}
      <span className="quiz-check" aria-hidden="true"><IconCheck size={13} /></span>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function QuizPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dir, setDir] = useState(1);
  const [savedPrefs, setSavedPrefs] = useState<QuizAnswers | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const autoStarted = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const { quizAnswers, currentQuizStep: storeStep, setQuizAnswer, toggleStyle, nextQuizStep, prevQuizStep, setCurrentQuizStep, resetQuiz } =
    useAppStore();
  const dropPrefill = useMemo(() => parseDropParams(searchParams), [searchParams]);
  // Do czasu zresetowania kroku z poprzedniej wizyty link ze zrzutu zaczyna od pytania 0
  const [dropStepReset, setDropStepReset] = useState(false);
  const currentQuizStep = dropPrefill && !dropStepReset ? 0 : storeStep;
  const totalSteps = dropPrefill ? DROP_TOTAL_STEPS : TOTAL_STEPS;
  const [maxVisitedStep, setMaxVisitedStep] = useState(dropPrefill ? 0 : currentQuizStep);

  // Stable session ID for this quiz attempt (not persisted — resets on page refresh)
  const sessionId = useRef(crypto.randomUUID());

  const track = (event: string, step?: number) => {
    trackEvent(`quiz_${event}`, { step });
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId.current, event, step }),
    });
  };

  const cancelAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };

  useEffect(() => {
    if (dropPrefill) {
      setQuizAnswer("preferredCity", dropPrefill.preferredCity);
      setQuizAnswer("airports", dropPrefill.airports);
      setQuizAnswer("month", dropPrefill.month);
      setQuizAnswer("duration", dropPrefill.duration);
      // store trzyma krok z poprzedniej wizyty, a tu są tylko kroki 0-3
      setCurrentQuizStep(0);
      setDropStepReset(true);
      trackEvent("drop_plan_started", { city: dropPrefill.preferredCity });
    } else if (searchParams.get("afterLogin") !== "1") {
      // po powrocie z logowania zostaje miasto zapisane w store
      setQuizAnswer("preferredCity", searchParams.get("city") ?? undefined);
    }
    track("step_view", 0);

    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setAuthed(Boolean(d.authenticated));
        if (d.authenticated && d.quiz_preferences) setSavedPrefs(d.quiz_preferences);
        if (d.authenticated && searchParams.get("afterLogin") === "1" && !autoStarted.current) {
          autoStarted.current = true;
          router.replace("/destinations");
        }
      })
      .catch(() => {});

    return cancelAdvance;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentQuizStep > maxVisitedStep) {
      setMaxVisitedStep(currentQuizStep);
      track("step_view", currentQuizStep);
    }
  }, [currentQuizStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const jumpToStep = (step: number) => {
    if (step === currentQuizStep || step > maxVisitedStep) return;
    cancelAdvance();
    setHasMoved(true);
    setDir(step > currentQuizStep ? 1 : -1);
    setCurrentQuizStep(step);
  };

  const handleUseSaved = () => {
    if (!savedPrefs) return;
    resetQuiz();
    if (savedPrefs.budget)   setQuizAnswer("budget",    savedPrefs.budget);
    if (savedPrefs.vibe)     setQuizAnswer("vibe",      savedPrefs.vibe);
    if (savedPrefs.placeType) setQuizAnswer("placeType", savedPrefs.placeType);
    if (savedPrefs.month)    setQuizAnswer("month",     savedPrefs.month);
    if (savedPrefs.duration) setQuizAnswer("duration",  savedPrefs.duration);
    if (savedPrefs.airports?.length) setQuizAnswer("airports", savedPrefs.airports);
    savedPrefs.styles.forEach((s) => toggleStyle(s));
    router.push("/destinations");
  };

  const isLast = currentQuizStep === totalSteps - 1;
  const autoStep = AUTO_ADVANCE_STEPS.includes(currentQuizStep);

  const canProceed = () => {
    if (currentQuizStep === 0) return quizAnswers.companion !== null;
    if (currentQuizStep === 1) return quizAnswers.budget !== null;
    if (currentQuizStep === 2) return quizAnswers.vibe !== null;
    if (currentQuizStep === 3) return true; // styles are optional
    if (currentQuizStep === 4) return quizAnswers.month !== null; // duration has default
    if (currentQuizStep === 5) return quizAnswers.airports.length > 0;
    return false;
  };

  const handleNext = async () => {
    cancelAdvance();
    setHasMoved(true);
    setDir(1);
    track("step_complete", currentQuizStep);
    if (currentQuizStep < totalSteps - 1) {
      nextQuizStep();
    } else {
      track("quiz_complete");
      const profile = await fetch("/api/profile").then((r) => r.json()).catch(() => ({}));
      if (!profile.authenticated) {
        router.push("/login?next=/quiz%3FafterLogin%3D1");
      } else {
        router.push("/destinations");
      }
    }
  };

  const handleNextRef = useRef(handleNext);
  const stepRef = useRef(currentQuizStep);
  useEffect(() => {
    handleNextRef.current = handleNext;
    stepRef.current = currentQuizStep;
  });

  // Tap an answer, see it land, move on. Tapping another one inside the window restarts it.
  // forStep guards against a tap on a card that is still sliding out of the previous question
  const pick = (forStep: number, apply: () => void) => {
    if (forStep !== stepRef.current) return;
    apply();
    cancelAdvance();
    advanceTimer.current = setTimeout(() => { void handleNextRef.current(); }, AUTO_ADVANCE_MS);
  };

  const handleBack = () => {
    cancelAdvance();
    setHasMoved(true);
    setDir(-1);
    if (currentQuizStep === 0) router.push("/");
    else prevQuizStep();
  };

  const trail = answeredLabels(quizAnswers, currentQuizStep);

  const ctaLabel = isLast
    ? quizAnswers.preferredCity
      ? `Zaplanuj wyjazd do ${quizAnswers.preferredCity}`
      : "Dobierz kierunki"
    : currentQuizStep === 3 && quizAnswers.styles.length === 0
    ? "Pomiń to pytanie"
    : "Dalej";

  return (
    <div className="quiz-root flex flex-col flex-1 px-5" suppressHydrationWarning>
      {/* Top bar */}
      <div className="pt-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 -ml-2 px-2 text-sm font-medium transition-opacity hover:opacity-60"
            style={{ color: "var(--text-muted)", minHeight: 44 }}
          >
            <IconArrowLeft size={16} />
            Wstecz
          </button>
          <p
            className="text-sm font-semibold"
            style={{ color: isLast ? "var(--accent)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}
          >
            {isLast ? "Ostatnie pytanie" : `Pytanie ${currentQuizStep + 1} z ${totalSteps}`}
          </p>
        </div>
        <QuizProgress
          total={totalSteps}
          current={currentQuizStep}
          maxVisited={maxVisitedStep}
          onJump={jumpToStep}
        />

        {/* What you've told us so far, or what you get at the end */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5" style={{ minHeight: 28 }} aria-live="polite">
          {trail.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Na końcu: kierunki w Twoim budżecie i prawdziwe ceny lotów.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {trail.map((item) => (
                <motion.span
                  key={item}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  {item}
                </motion.span>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Preferred city banner */}
      {quizAnswers.preferredCity && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl mt-3"
          style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.25)" }}
        >
          <span style={{ color: "var(--accent)" }}><IconPlane size={16} /></span>
          <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            Kierunek: {quizAnswers.preferredCity}
          </p>
        </div>
      )}

      {/* Saved prefs shortcut */}
      <AnimatePresence>
        {savedPrefs && !dropPrefill && currentQuizStep === 0 && (
          <motion.button
            key="saved-prefs"
            type="button"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onClick={handleUseSaved}
            className="w-full mt-3 p-4 rounded-2xl text-left transition-opacity hover:opacity-90"
            style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.25)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>Użyj poprzednich ustawień</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Pomiń quiz — załaduj zapisane preferencje i przejdź do lotów
                </p>
              </div>
              <span style={{ color: "var(--accent)" }}><IconArrowRight size={18} /></span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Steps */}
      <div className="flex-1 relative overflow-hidden pt-4 -mx-1 px-1">
        <TitleFocusContext.Provider value={hasMoved}>
        <AnimatePresence mode="wait" custom={dir}>
          {currentQuizStep === 0 && (
            <motion.div key="step-companion" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={slideTransition}>
              <StepCompanion
                companion={quizAnswers.companion}
                onPick={(v) => pick(0, () => setQuizAnswer("companion", v))}
              />
            </motion.div>
          )}
          {currentQuizStep === 1 && (
            <motion.div key="step-budget" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={slideTransition}>
              <StepBudget
                budget={quizAnswers.budget}
                onPick={(v) => pick(1, () => setQuizAnswer("budget", v))}
              />
            </motion.div>
          )}
          {currentQuizStep === 2 && (
            <motion.div key="step-vibe" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={slideTransition}>
              <StepVibe
                vibe={quizAnswers.vibe}
                onPick={(v) => pick(2, () => setQuizAnswer("vibe", v))}
              />
            </motion.div>
          )}
          {currentQuizStep === 3 && (
            <motion.div key="step-style" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={slideTransition}>
              <StepStyle styles={quizAnswers.styles} toggleStyle={toggleStyle} />
            </motion.div>
          )}
          {currentQuizStep === 4 && (
            <motion.div key="step-when" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={slideTransition}>
              <StepWhen
                month={quizAnswers.month}
                setMonth={(m) => setQuizAnswer("month", m)}
                duration={quizAnswers.duration}
                setDuration={(d) => setQuizAnswer("duration", d)}
              />
            </motion.div>
          )}
          {currentQuizStep === 5 && (
            <motion.div key="step-departure" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={slideTransition}>
              <StepDeparture
                airports={quizAnswers.airports}
                setAirports={(v) => setQuizAnswer("airports", v)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </TitleFocusContext.Provider>
      </div>

      <div className="quiz-actions">
        {autoStep && !canProceed() ? (
          <p className="text-center text-sm" style={{ color: "var(--text-muted)", minHeight: 52, lineHeight: "52px" }}>
            Dotknij odpowiedzi — resztą zajmiemy się sami.
          </p>
        ) : (
          <button type="button" className="btn-primary" disabled={!canProceed()} onClick={handleNext}>
            {ctaLabel}
            <IconArrowRight size={18} />
          </button>
        )}
        {isLast && authed === false && (
          <p className="text-center text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Zaraz poprosimy o założenie konta — 2 plany w miesiącu dostajesz za darmo.
          </p>
        )}
        {currentQuizStep === 0 && (
          <p className="text-center text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            6 pytań, ok. 2 minuty. Nic nie kosztuje.
          </p>
        )}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense>
      <QuizPageInner />
    </Suspense>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function StepHeader({ title, hint }: { title: string; hint: string }) {
  const focusOnMount = useContext(TitleFocusContext);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) titleRef.current?.focus({ preventScroll: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <h2 ref={titleRef} className="quiz-title" tabIndex={-1}>{title}</h2>
      <p className="text-[15px] mt-2 mb-5 leading-snug" style={{ color: "var(--text-muted)" }}>{hint}</p>
    </>
  );
}

type CompanionIconFC = React.FC<{ size?: number }>;

const IconSolo: CompanionIconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <circle cx="12" cy="7" r="4" /><path d="M5 21a7 7 0 0 1 14 0" />
  </svg>
);
const IconCouple: CompanionIconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <circle cx="9" cy="7" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0" />
    <circle cx="17" cy="8" r="3" /><path d="M14 20h8" />
  </svg>
);
const IconFamily: CompanionIconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <circle cx="8" cy="6" r="3" /><circle cx="16" cy="6" r="3" /><circle cx="12" cy="16" r="2.5" />
    <path d="M2 19a6 6 0 0 1 12 0" /><path d="M10 19a6 6 0 0 1 12 0" />
  </svg>
);
const IconGroupFriends: CompanionIconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <circle cx="6" cy="7" r="3" /><circle cx="12" cy="5" r="3" /><circle cx="18" cy="7" r="3" />
    <path d="M0 21a6 6 0 0 1 12 0" /><path d="M12 21a6 6 0 0 1 12 0" />
  </svg>
);

const COMPANION_OPTIONS: { value: Companion; label: string; Icon: CompanionIconFC; desc: string }[] = [
  { value: "solo",    label: "Sam/a",    Icon: IconSolo,         desc: "Porady bezpieczeństwa, miejsca do poznania ludzi" },
  { value: "couple",  label: "Para",     Icon: IconCouple,       desc: "Romantyczne kolacje, wspólne aktywności" },
  { value: "family",  label: "Rodzina",  Icon: IconFamily,       desc: "Family-friendly, spokojne tempo, bezpieczeństwo" },
  { value: "friends", label: "Znajomi",  Icon: IconGroupFriends, desc: "Aktywności grupowe, wieczory w barach, podział kosztów" },
];

function StepCompanion({
  companion,
  onPick,
}: {
  companion: Companion | null;
  onPick: (v: Companion) => void;
}) {
  return (
    <div>
      <StepHeader title="Kto jedzie?" hint="AI dopasuje atrakcje, restauracje i wskazówki do Twojej grupy." />
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Wybierz kto podróżuje">
        {COMPANION_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} selected={companion === opt.value} onClick={() => onPick(opt.value)}>
            <span style={{ color: companion === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
              <opt.Icon size={26} />
            </span>
            <p className="font-semibold text-[15px] mt-2">{opt.label}</p>
            <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function StepBudget({
  budget,
  onPick,
}: {
  budget: "low" | "medium" | null;
  onPick: (v: "low" | "medium") => void;
}) {
  const opts: { value: "low" | "medium"; Icon: IconFC; label: string; desc: string }[] = [
    { value: "low",    Icon: IconBackpack,  label: "Backpacker",  desc: "Do 1500 zł · hostele, street food, darmowe atrakcje" },
    { value: "medium", Icon: IconSuitcase,  label: "Komfortowy",  desc: "1500–3000 zł · Airbnb lub 3★ hotel, restauracje" },
  ];

  return (
    <div>
      <StepHeader title="Jaki masz budżet?" hint="Całkowity koszt wyjazdu — loty, noclegi, jedzenie." />
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Wybierz budżet">
        {opts.map((opt) => (
          <OptionCard key={opt.value} className="quiz-option--roomy" selected={budget === opt.value} onClick={() => onPick(opt.value)}>
            <div className="flex items-center gap-3">
              <span style={{ color: budget === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
                <opt.Icon size={26} />
              </span>
              <div>
                <p className="font-semibold text-[15px]">{opt.label}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function StepVibe({
  vibe,
  onPick,
}: {
  vibe: TravelVibe | null;
  onPick: (v: TravelVibe) => void;
}) {
  return (
    <div>
      <StepHeader title="Jaka energia wyjazdu?" hint="Jak wyobrażasz sobie typowy dzień na miejscu." />
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Wybierz energię wyjazdu">
        {VIBE_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} selected={vibe === opt.value} onClick={() => onPick(opt.value)}>
            <span style={{ color: vibe === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
              <opt.Icon size={26} />
            </span>
            <p className="font-semibold text-[15px] mt-2">{opt.label}</p>
            <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function StepStyle({ styles, toggleStyle }: { styles: TravelStyle[]; toggleStyle: (s: TravelStyle) => void }) {
  return (
    <div>
      <StepHeader
        title="Czym się interesujesz?"
        hint="Wybierz ile chcesz albo pomiń — AI lepiej dopasuje kierunki, gdy coś zaznaczysz."
      />
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wybierz zainteresowania">
        {STYLE_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} selected={styles.includes(opt.value)} onClick={() => toggleStyle(opt.value)}>
            <span style={{ color: styles.includes(opt.value) ? "var(--accent)" : "var(--text-muted)" }}>
              <opt.Icon size={26} />
            </span>
            <p className="font-semibold text-[15px] mt-2">{opt.label}</p>
            <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function StepPlaceType() {
  const { quizAnswers, setQuizAnswer } = useAppStore();
  return (
    <div>
      <StepHeader title="Jaki typ miejsca?" hint="Gdzie czujesz się najlepiej." />
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Wybierz typ miejsca">
        {PLACE_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            className="quiz-option--roomy"
            selected={quizAnswers.placeType === opt.value}
            onClick={() => setQuizAnswer("placeType", opt.value)}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: quizAnswers.placeType === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
                <opt.Icon size={26} />
              </span>
              <div>
                <p className="font-semibold text-[15px]">{opt.label}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function durationNote(d: number): string {
  const full = d - 2;
  if (full <= 0) return "Lot tam i z powrotem — w sam raz na weekend";
  if (full === 1) return "1 pełny dzień na miejscu + przylot i powrót";
  return `${full} pełne dni na miejscu + przylot i powrót`;
}

function StepWhen({
  month, setMonth, duration, setDuration,
}: {
  month: number | null;
  setMonth: (m: number) => void;
  duration: TripDuration | null;
  setDuration: (d: TripDuration) => void;
}) {
  const value = duration ?? 5;
  const [monthPrefilled, setMonthPrefilled] = useState(false);

  useEffect(() => {
    if (duration === null) setDuration(5);
    // Thursday-night decision: start from this month so the step is already answerable
    if (month === null) {
      setMonth(new Date().getMonth() + 1);
      setMonthPrefilled(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <StepHeader
        title="Kiedy i jak długo?"
        hint={
          monthPrefilled
            ? "Zaznaczyłem bieżący miesiąc — zmień go, jeśli jedziesz później."
            : "Pogoda, sezon, ceny — wszystko pod uwagę."
        }
      />

      {/* Month grid */}
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Miesiąc wyjazdu</p>
      <div className="grid grid-cols-4 gap-2 mb-6" role="radiogroup" aria-label="Wybierz miesiąc">
        {MONTH_NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            className={`quiz-option quiz-option--center ${month === i + 1 ? "selected" : ""}`}
            style={{ padding: "0 4px", minHeight: 48, textAlign: "center" }}
            onClick={() => setMonth(i + 1)}
            aria-pressed={month === i + 1}
            aria-label={name}
          >
            <span className="font-semibold text-sm">{MONTH_SHORT[i]}</span>
          </button>
        ))}
      </div>

      {/* Duration presets */}
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Długość wyjazdu</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {DURATION_PRESETS.map((p) => {
          const sel = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setDuration(p.value)}
              aria-pressed={sel}
              className="quiz-chip"
              style={sel ? {
                background: "var(--accent)",
                color: "#fff",
                border: "1.5px solid var(--accent)",
              } : {
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1.5px solid var(--border)",
              }}
            >
              {p.label}{p.sub && <span className="ml-1.5 text-xs" style={{ opacity: 0.8 }}>{p.sub}</span>}
            </button>
          );
        })}
      </div>

      {/* Slider */}
      <div className="mb-3">
        <input
          type="range"
          min={2}
          max={21}
          step={1}
          value={value}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "var(--accent)", minHeight: 44 }}
          aria-label="Liczba dni"
        />
        <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>2 dni</span>
          <span>21 dni</span>
        </div>
      </div>

      <p className="text-sm" style={{ color: "var(--text-secondary)" }} aria-live="polite">
        <span className="font-bold" style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{value} dni</span>
        {" · "}{durationNote(value)}
      </p>
    </div>
  );
}

function StepDeparture({
  airports, setAirports,
}: {
  airports: string[];
  setAirports: (v: string[]) => void;
}) {
  const [regionId, setRegionId]       = useState<RegionId>(() => inferRegion(airports));
  const [willingness, setWillingness] = useState<Willingness>(() => inferWillingness(airports));

  const select = (r: RegionId, w: Willingness) => {
    setRegionId(r);
    setWillingness(w);
    setAirports(airportsFor(r, w));
  };

  const WILLINGNESS_OPTIONS: { value: Willingness; Icon: IconFC; label: string; desc: string }[] = [
    {
      value: "local",
      Icon: IconPin,
      label: "Tylko lokalnie",
      desc: "Lotnisko najbliżej mojego miasta",
    },
    {
      value: "poland",
      Icon: IconCar,
      label: "Mogę dojechać w Polsce",
      desc: `Porównam też ${NEARBY[regionId].filter(c => !REGIONS.find(r => r.id === regionId)!.local.includes(c)).join(", ") || "pobliskie lotniska"} — więcej opcji`,
    },
    {
      value: "europe",
      Icon: IconGlobe,
      label: "Też za granicę",
      desc: "Berlin, Budapeszt, Wiedeń, Amsterdam, Londyn, Stambuł — taniej do Azji i USA",
    },
  ];

  return (
    <div>
      <StepHeader title="Skąd startujesz?" hint="Dobiorę lotniska i porównam wszystkie opcje." />

      {/* Region grid */}
      <div className="grid grid-cols-3 gap-2 mb-6" role="radiogroup" aria-label="Wybierz miasto">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => select(r.id, willingness)}
            aria-pressed={regionId === r.id}
            className={`quiz-option quiz-option--center ${regionId === r.id ? "selected" : ""}`}
            style={{ padding: "10px 6px", textAlign: "center", minHeight: 68 }}
          >
            <p
              className="font-bold tracking-widest"
              style={{ color: regionId === r.id ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-heading), Georgia, serif", fontSize: 13 }}
            >
              {r.code}
            </p>
            <p className="font-semibold text-[13px] mt-0.5 leading-tight">{r.label}</p>
            <p className="mt-0.5 leading-tight" style={{ color: "var(--text-muted)", fontSize: 11 }}>
              {r.subLabel}
            </p>
          </button>
        ))}
      </div>

      {/* Willingness */}
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Jak daleko dojedziesz do lotniska?</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Gotowość do dojazdu">
        {WILLINGNESS_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            className="quiz-option--roomy"
            selected={willingness === opt.value}
            onClick={() => select(regionId, opt.value)}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0" style={{ color: willingness === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
                <opt.Icon size={22} />
              </span>
              <div>
                <p className="font-semibold text-[15px]">{opt.label}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>

      <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Będę porównywać: <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{airports.join(", ")}</span>
      </p>
    </div>
  );
}
