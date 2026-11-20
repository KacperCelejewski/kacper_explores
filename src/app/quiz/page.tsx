"use client";

import { dropAttributionFromParams, dropEventName, rememberDropAttribution, reportDropEvent } from "@/lib/drop/attribution";
import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import styles from "./quiz.module.css";
import { QUIZ_STEPS, quizStepsFor, quizStepIndex, parseQuizStep, resolveQuizStep, canCompleteQuizStep, firstIncompleteQuizStep, quizAnalyticsStep, type QuizStepId } from "@/lib/quizSteps";
import { useAppStore } from "@/lib/store";
import type { TravelStyle, TripDuration, TravelVibe, QuizAnswers, Region, BudgetLevel, TripType, Transport } from "@/types";
import { MONTH_NAMES } from "@/lib/constants";
import { monthYearLabel, monthYearShort, upcomingMonthsByYear } from "@/lib/tripMonth";
import { trackEvent, quizGaEventName, quizFoundationParams } from "@/lib/analytics";
import { normalizeFoundation, effectiveRegions, highBudgetAvailable, regionLabel, REGION_OPTIONS, REGION_ANY_LABEL, REGION_ANY_HINT, TRIP_TYPE_OPTIONS, tripTypeLabel, TRANSPORT_OPTIONS, TRANSPORT_VALUES, transportLabel } from "@/lib/quizOptions";
import { tripTypeSeason } from "@/lib/tripType";
import { usesFlights } from "@/lib/transport";
import { captureEntry, entryEventParams, entryStorage, landingReferrer, type EntryAttribution } from "@/lib/entryAttribution";
import { cityAfterLogin, quizLoginNext } from "@/lib/quizLogin";
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
  IconPin,
  IconCar,
  IconBus,
  IconGlobe,
  IconPlane,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCity,
  IconHouseSmall,
  IconSunWave,
} from "@/app/components/Icons";
import type { Companion, GroupComposition } from "@/types";
import GroupSizePicker from "@/app/components/GroupSizePicker";
import { groupFromCompanion } from "@/lib/group";
import { CREW_COPY, companionTrailLabel, crewBudgetTogether } from "@/lib/groupFlow";
import { parseHomeParams, parseFoundationParams, homeFriendsAnswers, homeDreamAnswers, parseHomeDream, srcEventName, keepUtmQuery } from "@/lib/homeParams";

type IconFC = React.FC<{ size?: number }>;

// ── Region definitions ────────────────────────────────────────────────────────

type RegionId = "wroclaw" | "slaskie" | "krakow" | "warszawa" | "poznan" | "trojmiasto";
type Willingness = "local" | "poland" | "europe";

const REGIONS: { id: RegionId; label: string; subLabel: string; code: string; local: string[] }[] = [
  { id: "wroclaw",    label: "Wrocław",     subLabel: "Dolny Śląsk",       code: "WRO", local: ["WRO"] },
  { id: "slaskie",   label: "Katowice",    subLabel: "Śląsk / Zagłębie",  code: "KTW", local: ["KTW"] },
  { id: "krakow",    label: "Kraków",      subLabel: "Małopolska",         code: "KRK", local: ["KRK"] },
  { id: "warszawa",  label: "Warszawa",    subLabel: "Mazowsze",           code: "WAW", local: ["WAW", "WMI"] },
  { id: "poznan",    label: "Poznań",      subLabel: "Wielkopolska",       code: "POZ", local: ["POZ"] },
  { id: "trojmiasto",label: "Trójmiasto",  subLabel: "Gdańsk / Gdynia",    code: "GDN", local: ["GDN"] },
];

// Nearby Polish airports added when willingness = "poland"
const NEARBY: Record<RegionId, string[]> = {
  wroclaw:    ["WRO", "KTW"],
  slaskie:    ["KTW", "KRK", "WRO"],
  krakow:     ["KRK", "KTW"],
  warszawa:   ["WAW", "WMI"],
  poznan:     ["POZ", "WRO"],
  trojmiasto: ["GDN"],
};

const HUB_CODES = ["BER", "BUD", "VIE", "AMS", "LGW", "IST"];

function airportsFor(region: RegionId, willingness: Willingness): string[] {
  if (willingness === "local")   return REGIONS.find(r => r.id === region)!.local;
  if (willingness === "poland")  return NEARBY[region];
  return [...NEARBY[region], ...HUB_CODES];
}

function inferRegion(airports: string[]): RegionId {
  return REGIONS.find((region) => region.local.includes(airports[0]))?.id ?? "wroclaw";
}

function inferWillingness(airports: string[]): Willingness {
  if (airports.some(a => HUB_CODES.includes(a))) return "europe";
  const local = REGIONS.find((region) => region.id === inferRegion(airports))!.local;
  if (airports.some((airport) => !local.includes(airport))) return "poland";
  return "local";
}

// ── Shared ────────────────────────────────────────────────────────────────────

const STYLE_OPTIONS: { value: TravelStyle; label: string; Icon: IconFC; desc: string }[] = [
  { value: "history",      label: "Muzea i zabytki",     Icon: IconArch,     desc: "Muzea, zamki, starówki" },
  { value: "architecture", label: "Architektura", Icon: IconBuilding, desc: "Katedry, mosty, design" },
  { value: "food",         label: "Lokalne jedzenie",     Icon: IconFork,     desc: "Street food, lokalne bary" },
  { value: "nature",       label: "Przyroda i spacery",       Icon: IconLeaf,     desc: "Parki, góry, jeziora" },
  { value: "beach",        label: "Plaża",        Icon: IconWave,     desc: "Morze, słońce, relaks" },
  { value: "nightlife",    label: "Wieczorne wyjścia",    Icon: IconMoon,     desc: "Bary, kluby, koncerty" },
];

const VIBE_OPTIONS: { value: TravelVibe; Icon: IconFC; label: string; desc: string }[] = [
  { value: "chill",   Icon: IconSun,       label: "Odpocząć",        desc: "Własne tempo, kawiarnie, luz" },
  { value: "intense", Icon: IconLightning, label: "Dużo zobaczyć", desc: "Zabytki, muzea i pełniejsze dni" },
  { value: "social",  Icon: IconPeople,    label: "Poznać ludzi",   desc: "Poznawanie ludzi, bary, imprezy" },
  { value: "active",  Icon: IconMountain,  label: "Spędzić czas aktywnie",      desc: "Piesze trasy, sport, przyroda" },
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
const BUDGET_LABELS: Record<BudgetLevel, string> = { low: "Do 1500 zł / os.", medium: "1500–3000 zł / os.", high: "Powyżej 3000 zł / os." };
const VIBE_LABELS: Record<TravelVibe, string> = {
  chill: "Reset", intense: "Pełny program", social: "Towarzyski", active: "Aktywny",
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
function answeredLabels(a: QuizAnswers, previous: readonly QuizStepId[]): string[] {
  return previous.flatMap((id): string[] => {
    switch (id) {
      case "companion": return a.companion ? [companionTrailLabel(a.companion, a.group, COMPANION_LABELS[a.companion])] : [];
      case "region": {
        const regions = effectiveRegions(a);
        return regions.length === 0 ? [] : [regions.length > 2 ? `${regions.length} regiony` : regions.map(regionLabel).join(", ")];
      }
      case "tripType": return a.tripType ? [tripTypeLabel(a.tripType)] : [];
      case "transport": return a.transport?.length ? [a.transport.map(transportLabel).join(", ")] : [];
      case "vibe": return a.vibe ? [VIBE_LABELS[a.vibe]] : [];
      case "styles": return a.styles.length ? [`${a.styles.length} zainteresowań`] : [];
      case "when": return a.month ? [`${monthYearShort(a.month)} · ${a.duration ?? 5} dni`] : [];
      case "departure": return a.airports.length ? [a.airports.join(", ")] : [];
      case "budget": return a.budget ? [BUDGET_LABELS[a.budget]] : [];
    }
  });
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
  const { quizAnswers, currentQuizStep: storeStep, setQuizAnswer, toggleStyle, setCurrentQuizStep, resetQuiz } = useAppStore();
  const dropPrefill = useMemo(() => parseDropParams(searchParams), [searchParams]);
  const homeParams = useMemo(() => parseHomeParams(searchParams), [searchParams]);
  const steps = quizStepsFor({ drop: Boolean(dropPrefill), preferredCity: quizAnswers.preferredCity });
  const stepId = resolveQuizStep(storeStep, quizAnswers, steps);
  const position = steps.indexOf(stepId);
  const [entryReady, setEntryReady] = useState(false);
  const ready = entryReady;
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [hasMoved, setHasMoved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [savedPrefs, setSavedPrefs] = useState<QuizAnswers | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const autoStarted = useRef(false);
  const sessionId = useRef(crypto.randomUUID());
  const reducedMotion = useReducedMotion();

  const entryRef = useRef<EntryAttribution | null>(null);

  const track = (event: string, id?: QuizStepId) => {
    const step = id ? quizAnalyticsStep(id) : undefined;
    trackEvent(quizGaEventName(event), {
      step, step_id: id, step_position: id ? steps.indexOf(id) + 1 : undefined,
      flow_version: "human_v1",
      ...(event === "quiz_complete" ? quizFoundationParams(useAppStore.getState().quizAnswers) : {}),
      ...entryEventParams(entryRef.current),
    });
    void fetch("/api/track", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId.current, event, step }),
    }).catch(() => {});
  };

  useEffect(() => {
    // Skąd wejście (kanał i materiał), zanim URL zostanie oczyszczony; dopisywane do zdarzeń aż do planu.
    entryRef.current = captureEntry(searchParams, entryStorage(), landingReferrer(), window.location.origin);
    // Powrót z logowania (afterLogin) to ciąg dalszy tego samego wejścia, nie nowe wejście.
    if (searchParams.get("afterLogin") !== "1") trackEvent("quiz_entry", { ...entryEventParams(entryRef.current), has_src: Boolean(homeParams.src || dropPrefill), flow_version: "human_v1" });
    if (dropPrefill) {
      setQuizAnswer("preferredCity", dropPrefill.preferredCity);
      setQuizAnswer("airports", dropPrefill.airports);
      setQuizAnswer("month", dropPrefill.month);
      setQuizAnswer("duration", dropPrefill.duration);
      setCurrentQuizStep(quizStepIndex("companion"));
      trackEvent("drop_plan_started", { city: dropPrefill.preferredCity, ...entryEventParams(entryRef.current) });
      const attribution = dropAttributionFromParams(searchParams, sessionId.current);
      if (attribution) {
        rememberDropAttribution(typeof window === "undefined" ? null : window.sessionStorage, attribution);
        reportDropEvent(dropEventName("start", attribution), sessionId.current);
      }
    } else if (searchParams.get("afterLogin") === "1") {
      setQuizAnswer("preferredCity", cityAfterLogin(searchParams.get("city"), quizAnswers.preferredCity));
    } else if (!parseQuizStep(searchParams.get("step"))) {
      setQuizAnswer("preferredCity", searchParams.get("city") ?? undefined);
    }
    if (homeParams.companion === "friends" && !dropPrefill) {
      const next = homeFriendsAnswers({ companion: quizAnswers.companion, group: quizAnswers.group });
      setQuizAnswer("companion", next.companion);
      setQuizAnswer("group", next.group);
      setCurrentQuizStep(quizStepIndex("companion"));
    }
    // Karta-marzenie ze strony głównej: miasto, ekipa i budżet są już znane, quiz zaczyna od pierwszego brakującego pytania.
    const dream = dropPrefill ? null : parseHomeDream(searchParams);
    if (dream) {
      const next = homeDreamAnswers(dream);
      setQuizAnswer("preferredCity", next.preferredCity);
      setQuizAnswer("companion", next.companion);
      setQuizAnswer("group", next.group);
      setQuizAnswer("budget", next.budget);
      const missing = firstIncompleteQuizStep({ ...quizAnswers, ...next }, QUIZ_STEPS);
      setCurrentQuizStep(quizStepIndex(missing ?? "budget"));
    }
    // Rodzaj wyjazdu z adresu (?trip=narty, np. z reklamy): tylko wartość z listy; pytanie zostaje do potwierdzenia.
    const entryTripType = dropPrefill ? undefined : parseFoundationParams(searchParams).tripType;
    if (entryTripType) setQuizAnswer("tripType", entryTripType);
    const requested = parseQuizStep(searchParams.get("step"));
    if (requested && !dropPrefill) setCurrentQuizStep(quizStepIndex(requested));
    if (homeParams.src) track(srcEventName(homeParams.src));
    if (homeParams.companion || homeParams.src || requested || entryTripType) {
      router.replace(`/quiz${keepUtmQuery(searchParams)}`, { scroll: false });
    }
    setEntryReady(true);
    fetch("/api/profile").then((r) => r.json()).then((d) => {
      setAuthed(Boolean(d.authenticated));
      if (d.authenticated && d.quiz_preferences) setSavedPrefs(d.quiz_preferences);
      if (d.authenticated && searchParams.get("afterLogin") === "1" && !autoStarted.current) {
        autoStarted.current = true;
        router.replace("/destinations");
      }
    }).catch(() => setAuthed(false));
  // Entry parameters are applied once; subsequent query cleanup must not reset answers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Commit a migration fallback before answering it, so filling it does not
    // silently jump to the old saved position without pressing Dalej.
    if (storeStep !== quizStepIndex(stepId)) setCurrentQuizStep(quizStepIndex(stepId));
    setMaxVisitedStep((previous) => Math.max(previous, position));
    track("step_view", stepId);
    if (hasMoved) window.scrollTo({ top: 0, behavior: "instant" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stepId]);

  // Wybrane miasto (galeria, okazje) wygrywa z regionem, a pytanie o region wtedy odpada: stary wybór nie może
  // po cichu zawężać propozycji ani odsłaniać wyższego budżetu z powodu regionu, którego nie widać.
  useEffect(() => {
    if (!ready || !quizAnswers.preferredCity || !quizAnswers.regions?.length) return;
    setQuizAnswer("regions", undefined);
    if (quizAnswers.budget === "high") setQuizAnswer("budget", null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, quizAnswers.preferredCity, quizAnswers.regions, quizAnswers.budget]);

  const goTo = (id: QuizStepId) => {
    setDir(steps.indexOf(id) > position ? 1 : -1);
    setHasMoved(true);
    setCurrentQuizStep(quizStepIndex(id));
  };
  const jumpToStep = (next: number) => {
    if (next <= maxVisitedStep && next !== position) goTo(steps[next]);
  };
  const handleBack = () => {
    if (position === 0) router.push("/");
    else goTo(steps[position - 1]);
  };
  const handleUseSaved = () => {
    if (!savedPrefs) return;
    const foundation = normalizeFoundation(savedPrefs);
    const answers: QuizAnswers = {
      ...quizAnswers, ...savedPrefs,
      preferredCity: quizAnswers.preferredCity,
      companion: savedPrefs.companion ?? quizAnswers.companion,
      group: savedPrefs.group,
      styles: savedPrefs.styles ?? [],
      airports: savedPrefs.airports?.length ? savedPrefs.airports : ["WRO"],
      // Nowe pola tylko z zapisanych preferencji: starsze ich nie mają, a stan bieżący nie może ich podtrzymać.
      regions: foundation.regions, tripType: foundation.tripType, transport: foundation.transport,
    };
    resetQuiz();
    (Object.keys(answers) as (keyof QuizAnswers)[]).forEach((key) => setQuizAnswer(key, answers[key]));
    const missing = firstIncompleteQuizStep(answers, QUIZ_STEPS);
    if (missing) goTo(missing);
    else router.push("/destinations");
  };
  const pickRegion = (value: Region | "any") => {
    const current = effectiveRegions(quizAnswers);
    const next = value === "any" ? [] : current.includes(value) ? current.filter((r) => r !== value) : [...current, value];
    // Kolejność opcji, nie kolejność klikania: ten sam wybór daje te same kierunki i ten sam klucz cache.
    const ordered = REGION_OPTIONS.map((o) => o.value).filter((r) => next.includes(r));
    setQuizAnswer("regions", ordered.length > 0 ? ordered : undefined);
    // Wyższy przedział budżetu istnieje tylko dla dalekich regionów; bez nich stary wybór trzeba zrobić na nowo.
    if (quizAnswers.budget === "high" && !highBudgetAvailable(ordered)) setQuizAnswer("budget", null);
  };
  const pickCompanion = (value: Companion) => {
    if (quizAnswers.companion === value) return;
    setQuizAnswer("companion", value);
    setQuizAnswer("group", value === "friends" || value === "family" ? groupFromCompanion(value) : undefined);
  };
  const isLast = position === steps.length - 1;
  const handleNext = async () => {
    if (submittingRef.current || !canCompleteQuizStep(stepId, quizAnswers)) return;
    track("step_complete", stepId);
    if (!isLast) { goTo(steps[position + 1]); return; }
    const missing = firstIncompleteQuizStep(quizAnswers, QUIZ_STEPS);
    if (missing) { goTo(missing); return; }
    submittingRef.current = true;
    setSubmitting(true);
    track("quiz_complete");
    const profile = await fetch("/api/profile").then((r) => r.json()).catch(() => ({}));
    router.push(profile.authenticated ? "/destinations" : `/login?next=${encodeURIComponent(quizLoginNext(quizAnswers.preferredCity, entryStorage() ? entryRef.current : null))}`);
    submittingRef.current = false;
    setSubmitting(false);
  };
  const trail = answeredLabels(quizAnswers, steps.slice(0, position));
  // Bez samolotu nie pytamy o lotniska, a w budżecie nie ma lotów (brak wyboru = samolot).
  const flying = usesFlights(quizAnswers);
  const ctaLabel = submitting ? "Przechodzimy dalej…" : isLast
    ? quizAnswers.preferredCity ? `Zaplanuj wyjazd: ${quizAnswers.preferredCity}` : "Dobierz kierunki"
    : (stepId === "styles" && quizAnswers.styles.length === 0) || (stepId === "tripType" && !quizAnswers.tripType) ? "Pomiń to pytanie" : "Dalej";

  if (!ready) return <div className={styles.loading} role="status">Przygotowujemy quiz…</div>;

  return (
    <div className={`quiz-root ${styles.root}`}>
      <div className={styles.brand}>Włóczykij<span>.</span><span className={styles.tagline}>Twój kolejny wyjazd</span></div>
      <div className={styles.topbar}>
        <button type="button" onClick={handleBack} className={styles.back} disabled={submitting}>
          <IconArrowLeft size={16} /> Wstecz
        </button>
        <span className={styles.counter}>Pytanie {position + 1} z {steps.length}</span>
      </div>
      <QuizProgress total={steps.length} current={position} maxVisited={maxVisitedStep} onJump={jumpToStep} />
      {trail.length > 0 && <div className={styles.trail} aria-label="Twoje odpowiedzi">{trail.map((label) => <span key={label}>{label}</span>)}</div>}
      {quizAnswers.preferredCity && <p className={styles.city}><IconPlane size={16} /> Kierunek: {quizAnswers.preferredCity}</p>}
      {savedPrefs && !dropPrefill && stepId === "companion" && <button type="button" onClick={handleUseSaved} className={styles.saved}>Użyj poprzednich ustawień <IconArrowRight size={16} /></button>}
      <div className={styles.questions}>
        <TitleFocusContext.Provider value={hasMoved}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={stepId} custom={dir} variants={reducedMotion ? undefined : slideVariants}
              initial={reducedMotion ? false : "enter"} animate="center" exit="exit" transition={slideTransition}>
              {stepId === "companion" && <StepCompanion companion={quizAnswers.companion} group={quizAnswers.group} onPick={pickCompanion} onGroupChange={(group) => setQuizAnswer("group", group)} />}
              {stepId === "region" && <StepRegion regions={effectiveRegions(quizAnswers)} plural={quizAnswers.companion !== "solo"} onPick={pickRegion} />}
              {stepId === "tripType" && <StepTripType tripType={quizAnswers.tripType} onPick={(v) => setQuizAnswer("tripType", quizAnswers.tripType === v ? undefined : v)} />}
              {stepId === "transport" && <StepTransport transport={quizAnswers.transport} plural={quizAnswers.companion !== "solo"} onChange={(next) => setQuizAnswer("transport", next)} />}
              {stepId === "vibe" && <StepVibe vibe={quizAnswers.vibe} plural={quizAnswers.companion !== "solo"} onPick={(v) => setQuizAnswer("vibe", v)} />}
              {stepId === "styles" && <StepStyle styles={quizAnswers.styles} toggleStyle={toggleStyle} />}
              {stepId === "when" && <StepWhen tripType={quizAnswers.tripType} month={quizAnswers.month} setMonth={(m) => setQuizAnswer("month", m)} duration={quizAnswers.duration} setDuration={(d) => setQuizAnswer("duration", d)} />}
              {stepId === "departure" && <StepDeparture airports={quizAnswers.airports} setAirports={(v) => setQuizAnswer("airports", v)} flying={flying} />}
              {stepId === "budget" && <StepBudget budget={quizAnswers.budget} flying={flying} regions={effectiveRegions(quizAnswers)} together={(level) => crewBudgetTogether(level, quizAnswers.companion, quizAnswers.group)} onPick={(v) => setQuizAnswer("budget", v)} />}
            </motion.div>
          </AnimatePresence>
        </TitleFocusContext.Provider>
      </div>
      <div className="quiz-actions">
        {isLast && <p className={styles.priceNote}>To budżet do dopasowania propozycji, nie wycena wyjazdu. {flying ? "Cenę lotu potwierdzisz u sprzedawcy — może się zmienić." : "Koszt dojazdu podajemy orientacyjnie, warto go sprawdzić przed wyjazdem."}</p>}
        <button type="button" className="btn-primary" disabled={submitting || !canCompleteQuizStep(stepId, quizAnswers)} onClick={handleNext}>
          {ctaLabel} <IconArrowRight size={18} />
        </button>
        {isLast && authed === false && <p className={styles.footnote}>Dalej założysz darmowe konto lub się zalogujesz. Bez karty.</p>}
        {stepId === "companion" && <p className={styles.footnote}>{steps.length} pytań · około 2 minuty{authed === false ? " · na końcu darmowe konto" : ""}</p>}
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

function StepHeader({ title, hint }: { title: string; hint?: string }) {
  const focusOnMount = useContext(TitleFocusContext);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) titleRef.current?.focus({ preventScroll: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <h2 ref={titleRef} className="quiz-title" tabIndex={-1}>{title}</h2>
      {hint && <p className={styles.hint}>{hint}</p>}
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

const COMPANION_OPTIONS: { value: Companion; label: string; Icon: CompanionIconFC }[] = [
  { value: "friends", label: "Ze znajomymi", Icon: IconGroupFriends },
  { value: "couple", label: "We dwoje", Icon: IconCouple },
  { value: "solo", label: "Solo", Icon: IconSolo },
  { value: "family", label: "Z rodziną", Icon: IconFamily },
];

function StepCompanion({
  companion,
  group,
  onPick,
  onGroupChange,
}: {
  companion: Companion | null;
  group: GroupComposition | undefined;
  onPick: (v: Companion) => void;
  onGroupChange: (g: GroupComposition) => void;
}) {
  const sizeRef = useRef<HTMLDivElement>(null);
  const needsSize = companion === "friends" || companion === "family";
  // Liczba osób nie może zostać pod lepkim przyciskiem "Dalej": po wyborze ekipy pokazujemy ją od razu.
  useEffect(() => {
    if (!needsSize) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sizeRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [needsSize, companion]);
  return (
    <div>
      <figure className={styles.introPhoto}>
        <Image src="/quiz/together.jpg" alt="Znajomi spędzający wieczór nad oceanem" fill sizes="(max-width: 448px) calc(100vw - 40px), 408px" loading="eager" style={{ objectFit: "cover", objectPosition: "50% 61%" }} />
        <figcaption>Dobrze czasem<br />gdzieś pojechać.</figcaption>
      </figure>
      <StepHeader title="Z kim jedziesz?" hint="Dobierzemy kierunek i plan wyjazdu." />
      <div className={`grid grid-cols-2 gap-3 ${styles.companions}`} role="group" aria-label="Wybierz kto podróżuje">
        {COMPANION_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} selected={companion === opt.value} onClick={() => onPick(opt.value)}>
            <span style={{ color: companion === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
              <opt.Icon size={26} />
            </span>
            <p className="font-semibold text-[15px] mt-2">{opt.label}</p>
          </OptionCard>
        ))}
      </div>
      {(companion === "friends" || companion === "family") && (
        <div ref={sizeRef} className="mt-4" style={{ scrollMarginBottom: 140 }}>
          <GroupSizePicker companion={companion} group={group} onChange={onGroupChange} />
        </div>
      )}
    </div>
  );
}

const TripSnowflake: IconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" /><path d="M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2" />
  </svg>
);

const TRIP_TYPE_ICONS: Record<TripType, IconFC> = {
  zwiedzanie: IconCity,
  wypoczynek: IconHouseSmall,
  narty: TripSnowflake,
  gory: IconMountain,
  plaza: IconSunWave,
  aktywny: IconLightning,
  wieczory: IconMoon,
};

function StepTripType({ tripType, onPick }: { tripType: TripType | undefined; onPick: (v: TripType) => void }) {
  return (
    <div>
      <StepHeader title="Jaki to wyjazd?" hint="To cel całego wyjazdu: pod niego dobieramy miejsce i plan każdego dnia. Bez wyboru układamy zwiedzanie." />
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wybierz rodzaj wyjazdu">
        {TRIP_TYPE_OPTIONS.map((opt, i) => {
          const Icon = TRIP_TYPE_ICONS[opt.value];
          const last = i === TRIP_TYPE_OPTIONS.length - 1 && TRIP_TYPE_OPTIONS.length % 2 === 1;
          return (
            <OptionCard key={opt.value} className={last ? "col-span-2" : ""} selected={tripType === opt.value} onClick={() => onPick(opt.value)}>
              <span style={{ color: tripType === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
                <Icon size={26} />
              </span>
              <p className="font-semibold text-[15px] mt-2">{opt.label}</p>
              <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.hint}</p>
            </OptionCard>
          );
        })}
      </div>
    </div>
  );
}

function StepBudget({
  budget,
  flying,
  regions,
  together,
  onPick,
}: {
  budget: BudgetLevel | null;
  flying: boolean;
  regions: readonly Region[];
  together: (level: BudgetLevel) => string | null;
  onPick: (v: BudgetLevel) => void;
}) {
  const far = highBudgetAvailable(regions);
  const opts: { value: BudgetLevel; Icon: IconFC; label: string; desc: string }[] = [
    { value: "low",    Icon: IconBackpack,  label: "Do 1500 zł",  desc: "Hostele, lokalne jedzenie, darmowe atrakcje" },
    { value: "medium", Icon: IconSuitcase,  label: "1500–3000 zł",  desc: "Apartament lub hotel, restauracje" },
    // Wyższy przedział tylko dla dalekich regionów: tam sam lot potrafi zjeść zwykły budżet.
    ...(far && flying ? [{ value: "high" as const, Icon: IconPlane, label: "Powyżej 3000 zł", desc: "Dalekie wyprawy: dłuższy lot, więcej dni na miejscu" }] : []),
  ];

  return (
    <div>
      <StepHeader title="Jaki budżet na osobę?" hint={flying ? "Za cały wyjazd: loty, noclegi i wydatki na miejscu." : "Za cały wyjazd: dojazd, noclegi i wydatki na miejscu."} />
      {far && flying && <p className="text-xs mb-3 leading-snug" style={{ color: "var(--text-secondary)" }}>Do dalekich regionów lot potrafi kosztować więcej niż niższe przedziały, dlatego jest też wyższy. Ceny lotu pokażemy na karcie tylko, gdy je mamy; w innym razie sprawdzisz je w wyszukiwarce.</p>}
      <div className="flex flex-col gap-3" role="group" aria-label="Wybierz budżet">
        {opts.map((opt) => (
          <OptionCard key={opt.value} className="quiz-option--roomy" selected={budget === opt.value} onClick={() => onPick(opt.value)}>
            <div className="flex items-center gap-3">
              <span style={{ color: budget === opt.value ? "var(--accent)" : "var(--text-muted)" }}>
                <opt.Icon size={26} />
              </span>
              <div>
                <p className="font-semibold text-[15px]">{opt.label}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.desc}</p>
                {together(opt.value) && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {CREW_COPY.total} {together(opt.value)}
                  </p>
                )}
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function StepRegion({
  regions,
  plural,
  onPick,
}: {
  regions: readonly Region[];
  plural: boolean;
  onPick: (v: Region | "any") => void;
}) {
  const far = highBudgetAvailable(regions);
  return (
    <div>
      <StepHeader
        title={plural ? "Dokąd chcecie jechać?" : "Dokąd chcesz jechać?"}
        hint="Wybierz jeden region albo kilka. Dobierzemy kierunki tylko stamtąd."
      />
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wybierz regiony świata">
        {REGION_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} selected={regions.includes(opt.value)} onClick={() => onPick(opt.value)}>
            <p className="font-semibold text-[15px]">{opt.label}</p>
            <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.hint}</p>
          </OptionCard>
        ))}
        <OptionCard className="col-span-2" selected={regions.length === 0} onClick={() => onPick("any")}>
          <p className="font-semibold text-[15px]">{REGION_ANY_LABEL}</p>
          <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{REGION_ANY_HINT}</p>
        </OptionCard>
      </div>
      <p className="text-xs mt-3 leading-snug" style={{ color: "var(--text-secondary)" }} aria-live="polite">
        {far ? "Dalekie regiony to dłuższy lot, więc przyda się więcej dni. W budżecie pojawi się wyższy przedział." : ""}
      </p>
    </div>
  );
}

const IconBike: IconFC = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="5.5" cy="17" r="3.5" /><circle cx="18.5" cy="17" r="3.5" />
    <path d="M5.5 17 9 9h5l4.5 8M9 9 12 17M14 9l-1-3h-2" />
  </svg>
);

const TRANSPORT_ICONS: Record<Transport, IconFC> = { samolot: IconPlane, auto: IconCar, pociag_bus: IconBus, rower: IconBike };

function StepTransport({
  transport,
  plural,
  onChange,
}: {
  transport: Transport[] | undefined;
  plural: boolean;
  onChange: (next: Transport[] | undefined) => void;
}) {
  const chosen = transport ?? [];
  const toggle = (value: Transport) => {
    const next = TRANSPORT_VALUES.filter((v) => (v === value ? !chosen.includes(v) : chosen.includes(v)));
    onChange(next.length ? next : undefined);
  };
  return (
    <div>
      <StepHeader title={plural ? "Czym jedziecie?" : "Czym jedziesz?"} hint="Możesz wybrać kilka. Bez wyboru szukamy lotów." />
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wybierz środki transportu">
        {TRANSPORT_OPTIONS.map((opt) => {
          const Icon = TRANSPORT_ICONS[opt.value];
          const selected = chosen.includes(opt.value);
          return (
            <OptionCard key={opt.value} selected={selected} onClick={() => toggle(opt.value)}>
              <span style={{ color: selected ? "var(--accent)" : "var(--text-muted)" }}><Icon size={26} /></span>
              <p className="font-semibold text-[15px] mt-2">{opt.label}</p>
              <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{opt.hint}</p>
            </OptionCard>
          );
        })}
      </div>
    </div>
  );
}

function StepVibe({
  vibe,
  plural,
  onPick,
}: {
  vibe: TravelVibe | null;
  plural: boolean;
  onPick: (v: TravelVibe) => void;
}) {
  return (
    <div>
      <StepHeader title={plural ? "Na co macie ochotę?" : "Na co masz ochotę?"} />
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wybierz energię wyjazdu">
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
        title="Co lubisz robić na wyjeździe?"
        hint="Możesz wybrać kilka odpowiedzi albo pominąć."
      />
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Wybierz zainteresowania">
        {STYLE_OPTIONS.map((opt) => (
          <OptionCard key={opt.value} selected={styles.includes(opt.value)} onClick={() => toggleStyle(opt.value)}>
            <span style={{ color: styles.includes(opt.value) ? "var(--accent)" : "var(--text-muted)" }}>
              <opt.Icon size={26} />
            </span>
            <p className="font-semibold text-[15px] mt-2">{opt.label}</p>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function StepWhen({
  tripType, month, setMonth, duration, setDuration,
}: {
  tripType: TripType | undefined;
  month: number | null;
  setMonth: (m: number) => void;
  duration: TripDuration | null;
  setDuration: (d: TripDuration) => void;
}) {
  const value = duration ?? 5;
  const [monthPrefilled, setMonthPrefilled] = useState(false);
  // Jedno "dzisiaj" dla całego kroku: miesiące, rok w nagłówkach i podsumowanie liczą się od niego
  const [now] = useState(() => new Date());
  const yearGroups = useMemo(() => upcomingMonthsByYear(now), [now]);
  const nearest = yearGroups[0].months[0];

  useEffect(() => {
    if (duration === null) setDuration(5);
    // Thursday-night decision: start from the nearest month so the step is already answerable
    if (month === null) {
      setMonth(nearest);
      setMonthPrefilled(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const season = tripTypeSeason(tripType, month);
  return (
    <div>
      <StepHeader
        title="Kiedy i na ile dni?"
        hint={
          monthPrefilled
            ? `Zaznaczono najbliższy miesiąc (${monthYearLabel(nearest, now)}). Zmień go, jeśli jedziesz później.`
            : undefined
        }
      />

      {/* Month picker: chronologicznie od najbliższego, z rokiem w nagłówku każdej grupy */}
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Miesiąc wyjazdu</p>
      <div className="mb-6" role="group" aria-label="Wybierz miesiąc wyjazdu">
        {yearGroups.map(({ year, months }) => (
          <div key={year} role="group" aria-labelledby={`when-year-${year}`} className="mb-3 last:mb-0">
            <p
              id={`when-year-${year}`}
              className="text-sm font-bold mb-1.5"
              style={{ color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}
            >
              {year}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {months.map((m) => (
                <button
                  key={`${year}-${m}`}
                  type="button"
                  className={`quiz-option quiz-option--center ${month === m ? "selected" : ""}`}
                  style={{ padding: "0 4px", minHeight: 48, textAlign: "center" }}
                  onClick={() => setMonth(m)}
                  aria-pressed={month === m}
                  aria-label={`${MONTH_NAMES[m - 1].toLowerCase()} ${year}`}
                >
                  <span className="font-semibold text-sm">{MONTH_SHORT[m - 1]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {season.message && tripType && (
        <p role="status" className="text-sm leading-snug mb-6 -mt-3" style={{ color: "var(--text-secondary)" }}>
          <strong>{tripTypeLabel(tripType)}:</strong> {season.message}
        </p>
      )}

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
        {month !== null && <span className="font-semibold">{monthYearLabel(month, now)} · </span>}
        <span className="font-bold" style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{value} dni</span>

      </p>
    </div>
  );
}

function StepDeparture({
  airports, setAirports, flying,
}: {
  airports: string[];
  setAirports: (v: string[]) => void;
  flying: boolean;
}) {
  const [regionId, setRegionId]       = useState<RegionId>(() => inferRegion(airports));
  const [willingness, setWillingness] = useState<Willingness>(() => inferWillingness(airports));

  const select = (r: RegionId, w: Willingness) => {
    setRegionId(r);
    setWillingness(w);
    setAirports(airportsFor(r, w));
  };
  // Bez samolotu liczy się samo miasto startu: lotniska zostają tylko lokalnym identyfikatorem miasta.
  useEffect(() => {
    if (flying) return;
    const local = airportsFor(regionId, "local");
    if (airports.join() !== local.join()) setAirports(local);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flying, regionId]);

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
      desc: "Berlin, Budapeszt, Wiedeń, Amsterdam, Londyn i Stambuł",
    },
  ];

  return (
    <div>
      <StepHeader title="Skąd ruszasz?" hint={flying ? undefined : "Od tego miasta liczymy czas dojazdu."} />

      {/* Region grid */}
      <div className="grid grid-cols-3 gap-2 mb-6" role="group" aria-label="Wybierz miasto">
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

      {/* Willingness: tylko przy locie, bo dotyczy dojazdu do lotniska */}
      {flying && <>
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Jak daleko dojedziesz do lotniska?</p>
      <div className="flex flex-col gap-2" role="group" aria-label="Gotowość do dojazdu">
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
      </>}
    </div>
  );
}
