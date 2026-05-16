"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { TravelStyle, TripDuration, TravelVibe, PlaceType, QuizAnswers } from "@/types";
import { MONTH_NAMES } from "@/lib/mockFlights";
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
} from "@/app/components/Icons";

type IconFC = React.FC<{ size?: number }>;

const TOTAL_STEPS = 7;

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
  { id: "inne",      label: "Inne miasto", subLabel: "Najbliższe lotnisko", code: "...", local: ["WRO"] },
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

const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ── Page ──────────────────────────────────────────────────────────────────────

function QuizPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dir, setDir] = useState(1);
  const [savedPrefs, setSavedPrefs] = useState<QuizAnswers | null>(null);
  const autoStarted = useRef(false);
  const { quizAnswers, currentQuizStep, setQuizAnswer, toggleStyle, nextQuizStep, prevQuizStep, resetQuiz } =
    useAppStore();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.quiz_preferences) setSavedPrefs(d.quiz_preferences);
        if (d.authenticated && searchParams.get("afterLogin") === "1" && !autoStarted.current) {
          autoStarted.current = true;
          router.replace("/flights");
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (currentQuizStep === 6) return quizAnswers.airports.length > 0;
    return false;
  };

  const handleNext = async () => {
    setDir(1);
    if (currentQuizStep < TOTAL_STEPS - 1) {
      nextQuizStep();
    } else {
      const profile = await fetch("/api/profile").then((r) => r.json()).catch(() => ({}));
      if (!profile.authenticated) {
        router.push("/login?next=/quiz%3FafterLogin%3D1");
      } else {
        router.push("/flights");
      }
    }
  };

  const handleBack = () => {
    setDir(-1);
    if (currentQuizStep === 0) router.push("/");
    else prevQuizStep();
  };

  return (
    <div className="flex flex-col flex-1 px-5 pb-8" suppressHydrationWarning>
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

      {/* Saved prefs shortcut */}
      <AnimatePresence>
        {savedPrefs && currentQuizStep === 0 && (
          <motion.button
            key="saved-prefs"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onClick={handleUseSaved}
            className="w-full mb-4 p-4 rounded-2xl text-left transition-opacity hover:opacity-90"
            style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.25)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>Użyj poprzednich ustawień ↗</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Pomiń quiz — załaduj zapisane preferencje i przejdź do lotów
                </p>
              </div>
              <span className="text-xl ml-3" style={{ color: "var(--accent)" }}>✦</span>
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
              />
            </motion.div>
          )}
          {currentQuizStep === 6 && (
            <motion.div key="step-departure" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeInOut" }}>
              <StepDeparture
                airports={quizAnswers.airports}
                setAirports={(v) => setQuizAnswer("airports", v)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div layout className="mt-6">
        <button className="btn-primary" disabled={!canProceed()} onClick={handleNext}>
          {currentQuizStep < TOTAL_STEPS - 1 ? "Dalej →" : "Znajdź loty →"}
        </button>
      </motion.div>
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

function StepBudget() {
  const { quizAnswers, setQuizAnswer } = useAppStore();

  const opts: { value: "low" | "medium"; Icon: IconFC; label: string; desc: string }[] = [
    { value: "low",    Icon: IconBackpack,  label: "Backpacker",  desc: "Do 1500 PLN · hostele, street food, darmowe atrakcje" },
    { value: "medium", Icon: IconSuitcase,  label: "Komfortowy",  desc: "1500–3000 PLN · Airbnb lub 3★ hotel, restauracje" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Jaki masz budżet?</h2>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-muted)" }}>
        Całkowity koszt wyjazdu — loty, noclegi, jedzenie.
      </p>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Wybierz budżet">
        {opts.map((opt) => (
          <button
            key={opt.value}
            className={`option-card ${quizAnswers.budget === opt.value ? "selected" : ""}`}
            onClick={() => setQuizAnswer("budget", opt.value)}
            aria-pressed={quizAnswers.budget === opt.value}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: quizAnswers.budget === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
                <opt.Icon size={24} />
              </span>
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
            <span style={{ color: quizAnswers.vibe === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
              <opt.Icon size={24} />
            </span>
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
            <span style={{ color: styles.includes(opt.value) ? "var(--accent)" : "var(--text-muted)" }}>
              <opt.Icon size={24} />
            </span>
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
              <span style={{ color: quizAnswers.placeType === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
                <opt.Icon size={24} />
              </span>
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

function durationNote(d: number): string {
  const full = d - 2;
  if (full <= 0) return "Lot tam i z powrotem — idealny na weekend";
  if (full === 1) return "1 pełny dzień na miejscu + przylot i powrót";
  return `${full} pełne dni na miejscu + przylot i powrót`;
}

function StepDuration({ duration, setDuration }: { duration: TripDuration | null; setDuration: (d: TripDuration) => void }) {
  const value = duration ?? 5;

  useEffect(() => {
    if (duration === null) setDuration(5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mt-2">Ile dni?</h2>
      <p className="text-sm mt-2 mb-5" style={{ color: "var(--text-muted)" }}>
        Łączna długość wyjazdu od wylotu do powrotu.
      </p>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {DURATION_PRESETS.map((p) => {
          const sel = value === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setDuration(p.value)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
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
              {p.label}{p.sub && <span className="ml-1 opacity-70 text-xs">{p.sub}</span>}
            </button>
          );
        })}
      </div>

      {/* Slider */}
      <div className="mb-5">
        <input
          type="range"
          min={2}
          max={21}
          step={1}
          value={value}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "var(--accent)" }}
          aria-label="Liczba dni"
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          <span>2 dni</span>
          <span>21 dni</span>
        </div>
      </div>

      {/* Live readout */}
      <div className="p-4 rounded-2xl text-center" style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.2)" }}>
        <p className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{value} dni</p>
        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{durationNote(value)}</p>
      </div>
    </div>
  );
}

const MONTH_SHORT = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];

function QuizSummary() {
  const { quizAnswers } = useAppStore();
  const { budget, vibe, styles, placeType, month, duration } = quizAnswers;

  const items = [
    budget     && (budget === "low" ? "Backpacker" : "Komfortowy"),
    vibe       && ({ chill: "Reset", intense: "Full program", social: "Towarzyski", active: "Aktywny" }[vibe]),
    styles.length > 0 && `${styles.length} zainteresowania`,
    placeType  && ({ big_city: "Duże miasto", charming: "Kameralne", beach_sun: "Słońce i woda" }[placeType]),
    month      && MONTH_SHORT[month - 1],
    duration   && `${duration} dni`,
  ].filter(Boolean) as string[];

  if (items.length === 0) return null;

  return (
    <div className="mb-5 p-3 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Twoje wybory</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            {item}
          </span>
        ))}
      </div>
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
      <h2 className="text-2xl font-bold mt-2">Skąd startujesz?</h2>
      <p className="text-sm mt-2 mb-4" style={{ color: "var(--text-muted)" }}>
        Dobiorę lotniska i porównam wszystkie opcje.
      </p>
      <QuizSummary />

      {/* Region grid */}
      <div className="grid grid-cols-3 gap-2 mb-6" role="radiogroup" aria-label="Wybierz miasto">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => select(r.id, willingness)}
            aria-pressed={regionId === r.id}
            className="option-card text-center py-3 px-2"
            style={regionId === r.id ? {
              background: "var(--accent-light)",
              border: "1.5px solid var(--accent)",
            } : {}}
          >
            <p
              className="font-bold text-xs tracking-widest"
              style={{ color: regionId === r.id ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-heading), Georgia, serif", fontSize: "11px" }}
            >
              {r.code}
            </p>
            <p className="font-semibold text-xs mt-1 leading-tight">{r.label}</p>
            <p className="text-xs mt-0.5 leading-tight" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
              {r.subLabel}
            </p>
          </button>
        ))}
      </div>

      {/* Willingness */}
      <p className="text-sm font-semibold mb-3">Jak daleko dojedziesz do lotniska?</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Gotowość do dojazdu">
        {WILLINGNESS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => select(regionId, opt.value)}
            aria-pressed={willingness === opt.value}
            className="option-card"
            style={willingness === opt.value ? {
              background: "var(--accent-light)",
              border: "1.5px solid var(--accent)",
            } : {}}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0" style={{ color: willingness === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
                <opt.Icon size={20} />
              </span>
              <div className="text-left">
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
              </div>
              {willingness === opt.value && (
                <span className="ml-auto text-xs font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Summary chip */}
      <div className="mt-4 px-3 py-2 rounded-xl text-xs" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <span style={{ color: "var(--text-muted)" }}>Będę porównywać: </span>
        <span className="font-semibold">{airports.join(", ")}</span>
      </div>
    </div>
  );
}
