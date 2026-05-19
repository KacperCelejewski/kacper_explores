"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { DestinationRecommendation, FlightDetails } from "@/types";
import { getCityPhotoUrl } from "@/lib/cityPhotos";

interface UserStatus {
  authenticated: boolean;
  can_generate?: boolean;
  credits_remaining?: number;
  is_pro?: boolean;
}

const TAG_LABELS: Record<string, string> = {
  nature:       "natura",
  history:      "historia",
  architecture: "architektura",
  food:         "jedzenie",
  beach:        "plaża",
  nightlife:    "nocne życie",
};

function buildGoogleFlightsUrl(dest: DestinationRecommendation, airports: string[], month: number | null): string {
  const origin = airports[0] ?? "WRO";
  const base = "https://www.google.com/travel/flights";
  const params = new URLSearchParams({
    q: `Loty z ${origin} do ${dest.city}`,
  });
  if (month) params.set("hl", "pl");
  return `${base}?${params}`;
}

function buildSkyscannerUrl(dest: DestinationRecommendation, airports: string[]): string {
  const origin = airports[0] ?? "WRO";
  return `https://www.skyscanner.pl/transport/flights/${origin.toLowerCase()}/${dest.city.toLowerCase().replace(/\s/g, "-")}/`;
}

// ── Generating overlay (shown during plan generation) ─────────────────────────

const STEPS = [
  "Analizuję Twoje preferencje…",
  "Szukam najtańszych noclegów…",
  "Dobieram atrakcje do Twojego stylu…",
  "Układam plan dzień po dniu…",
  "Obliczam budżet podróży…",
  "Dodaję wskazówki dla podróżujących solo…",
];

const STEP_DELAYS = [0, 5, 12, 22, 35, 50];

const CITY_FACTS: Record<string, string[]> = {
  barcelona: ["Sagrada Família buduje się od 1882 roku i wciąż nie jest gotowa","Barcelona ma 4,2 km plaż w samym centrum","Antoni Gaudí zaprojektował 7 budynków wpisanych na listę UNESCO","Mercat de la Boqueria istnieje od XIII wieku"],
  lizbona: ["Lizbona leży na 7 wzgórzach — tak samo jak Rzym","Tramwaj linii 28 kursuje nieprzerwanie od 1914 roku","Pastéis de nata kosztują ~1,20€ w każdej lokalnej piekarni","Fado jest wpisane na listę niematerialnego dziedzictwa UNESCO"],
  porto: ["Port pochodzi wyłącznie z winnic w dolinie Douro","Most Dom Luís I zbudował uczeń Eiffla w 1886 roku","Porto dało nazwę całemu krajowi — Portugalia","Francesi to bułka za ~0,10€ jedzona przez miejscowych każdego ranka"],
  wiedeń: ["Wiedeń przez 6 lat z rzędu zajmuje 1. miejsce w rankingu jakości życia","Lipizzańskie konie w Spanischer Reitschule ćwiczą 6 lat przed pierwszym pokazem","Kawa z mlekiem wynaleziono w Wiedniu po oblężeniu tureckim w 1683 roku","Metro w Wiedniu jest niezwykle punktualne — opóźnienie >2 min to rzadkość"],
  budapeszt: ["Budapeszt powstał z połączenia trzech miast w 1873 roku","Terme Széchenyi to jedne z największych term w Europie","Ruin bary w dzielnicy VII to fenomen kulturalny na skalę światową","Bulwar Dunaju wpisany jest na listę UNESCO"],
  praga: ["Praga zachowała średniowieczne centrum dzięki temu, że nie była bombardowana w II WŚ","Zegar astronomiczny na Rynku Starego Miasta działa od 1410 roku","Piwo w Pradze jest tańsze niż woda w wielu restauracjach","Most Karola ma 30 figur świętych — każda ma swoją historię"],
  rzym: ["Rzym ma ponad 2800 fontann — więcej niż jakiekolwiek inne miasto na świecie","Do Fontanny di Trevi wrzuca się rocznie ~1,5 mln euro — pieniądze trafiają na cele charytatywne","Wejście do Koloseum jest bezpłatne pierwszą niedzielę miesiąca","Pizza al taglio sprzedawana jest na wagę — idealna opcja budżetowa"],
  amsterdam: ["Amsterdam ma więcej rowerów niż mieszkańców — ok. 900 tys. vs 820 tys.","Domy przy kanałach celowo pochylają się do przodu — łatwiej wnosić meble","Anne Frank House rezerwuj z kilkumiesięcznym wyprzedzeniem","Rijksmuseum jest bezpłatne dla osób poniżej 18 lat"],
  berlin: ["Berlin ma 3x więcej mostów niż Wenecja — ponad 1700","Mur Berliński stał zaledwie 28 lat — tyle co 1 pokolenie","Street food: currywurst to klasyk za ~3-4€","Wszystkie muzea na Wyspie Muzeów są bezpłatne w czwartkowy wieczór"],
  krakow: ["Kraków jest jednym z niewielu miast Europy, które przetrwało II WŚ prawie bez zniszczeń","Legenda o smoku Wawelskim ma ponad 700 lat","Bar mleczny to relikt PRL — zupa i drugie danie za ok. 15 PLN","Kazimierz to jedna z najlepiej zachowanych dzielnic żydowskich w Europie"],
};

const GENERIC_FACTS = [
  "Lokalny targ jest zawsze 2-3x tańszy niż restauracje przy atrakcjach",
  "Komunikacja miejska jest zazwyczaj 4-5x tańsza niż Uber",
  "Centra europejskich miast wyglądają najpiękniej o 7 rano — zanim przybędą turyści",
  "Hostelowe wspólne kuchnie i bary to najlepszy sposób na poznanie innych podróżnych",
  "Aplikacja Rome2Rio pomoże znaleźć najtańszy transport między miastami",
  "Free walking tours są w niemal każdym europejskim mieście — płacisz napiwek",
  "Muzea państwowe są często bezpłatne w pierwszy lub ostatni weekend miesiąca",
  "Śniadanie w kawiarni za rogiem kosztuje 2-3x mniej niż w hotelu",
];

function getFacts(city?: string): string[] {
  if (!city) return GENERIC_FACTS;
  const key = city.toLowerCase().replace(/\s+/g, "");
  return CITY_FACTS[key] ?? GENERIC_FACTS;
}

function GeneratingOverlay({ city }: { city?: string }) {
  const [step, setStep] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const facts = getFacts(city);

  // Advance steps on schedule
  useEffect(() => {
    const timers = STEP_DELAYS.slice(1).map((delay, i) =>
      setTimeout(() => setStep(i + 1), delay * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Rotate facts every 8s
  useEffect(() => {
    const t = setInterval(() => setFactIndex((f) => (f + 1) % facts.length), 8000);
    return () => clearInterval(t);
  }, [facts.length]);

  // Smooth progress bar — fills to 95% over 110s, never reaches 100%
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setProgress(Math.min(95, Math.round((elapsed / 110) * 95)));
    }, 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="flex flex-col flex-1 items-center justify-center px-6 gap-8">
        {/* Plane animation */}
        <div className="relative" style={{ width: 180, height: 130 }}>
          <div className="absolute bottom-0 select-none" style={{ left: "50%", transform: "translateX(-50%)", fontSize: "3.5rem" }}>
            🗼
          </div>
          <motion.div
            className="absolute select-none"
            style={{ left: 0, top: 0, fontSize: "1.75rem" }}
            animate={{ x: [-160, -60, 52, 64], y: [20, -20, 20, 48], rotate: [-30, -20, 5, 12] }}
            transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1], repeat: Infinity, repeatDelay: 1.2 }}
          >
            ✈️
          </motion.div>
        </div>

        {/* Title */}
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {city ? `Buduję plan dla ${city}` : "Buduję Twój plan podróży"}
          </p>
        </div>

        {/* Steps */}
        <div className="w-full max-w-xs flex flex-col gap-2.5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-500"
                style={{
                  background: i < step ? "var(--accent)" : i === step ? "var(--accent-light)" : "var(--border)",
                  color: i < step ? "#fff" : i === step ? "var(--accent)" : "var(--text-muted)",
                  border: i === step ? "2px solid var(--accent)" : "none",
                }}
              >
                {i < step ? "✓" : i === step ? (
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)", display: "block" }} />
                ) : ""}
              </div>
              <p
                className="text-sm transition-all duration-500"
                style={{
                  color: i < step ? "var(--text-muted)" : i === step ? "var(--text-primary)" : "var(--border)",
                  fontWeight: i === step ? 600 : 400,
                  textDecoration: i < step ? "line-through" : "none",
                }}
              >
                {s}
              </p>
            </div>
          ))}
        </div>

        {/* Fact box */}
        <AnimatePresence mode="wait">
          <motion.div
            key={factIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-xs px-4 py-3 rounded-2xl"
            style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.2)" }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: "var(--accent)" }}>💡 Czy wiesz, że…</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {facts[factIndex]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="px-6 pb-10">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Generowanie planu</p>
          <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{progress}%</p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "var(--accent)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Loading animation ─────────────────────────────────────────────────────────

function PlaneAnimation({ city }: { city?: string }) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-6">
      {/* Scene */}
      <div className="relative" style={{ width: 200, height: 160 }}>
        {/* Tower */}
        <div
          className="absolute bottom-0 select-none leading-none"
          style={{ left: "50%", transform: "translateX(-50%)", fontSize: "4rem" }}
        >
          🗼
        </div>

        {/* Plane — flies in from top-left, arcs down to tower tip */}
        <motion.div
          className="absolute select-none leading-none"
          style={{ left: 0, top: 0, fontSize: "1.75rem" }}
          animate={{
            x: [-180, -80, 60, 72],
            y: [20,  -20, 20, 55],
            rotate: [-30, -20, 5, 12],
          }}
          transition={{
            duration: 2.4,
            ease: [0.4, 0, 0.2, 1],
            repeat: Infinity,
            repeatDelay: 1.2,
          }}
        >
          ✈️
        </motion.div>
      </div>

      {/* Label */}
      <div className="text-center px-8">
        <motion.p
          className="text-base font-semibold"
          animate={{ opacity: [1, 0.45, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ color: "var(--text-primary)" }}
        >
          {city ? `Przygotowuję plan dla ${city}` : "Dobieram destynacje dla Ciebie"}
        </motion.p>
        <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
          Zazwyczaj zajmuje to ~30 sekund
        </p>
      </div>
    </div>
  );
}

// ── Destination card ──────────────────────────────────────────────────────────

function DestCard({
  dest,
  onPlan,
  airports,
  month,
}: {
  dest: DestinationRecommendation;
  onPlan: (dest: DestinationRecommendation) => void;
  airports: string[];
  month: number | null;
}) {
  const highlights = (dest as DestinationRecommendation & { highlights?: string[] }).highlights ?? [];
  const [photoUrl, setPhotoUrl] = useState(() => getCityPhotoUrl(dest.city, 800));
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch(`/api/city-photo?city=${encodeURIComponent(dest.city)}`)
      .then((r) => r.json())
      .then((d) => { if (d.url) setPhotoUrl(d.url); })
      .catch(() => {});
  }, [dest.city]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Photo */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={photoUrl}
          alt={dest.city}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.style.background = "linear-gradient(135deg, #FF6B35 0%, #ff8c5a 100%)";
              parent.style.display = "flex";
              parent.style.alignItems = "center";
              parent.style.justifyContent = "center";
              parent.innerHTML = `<span style="font-size:4rem">${dest.coverImage}</span>`;
            }
          }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)" }}
        />
        {/* City name */}
        <div className="absolute bottom-0 left-0 p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{dest.coverImage}</span>
            <div>
              <h2 className="text-white font-bold text-xl leading-tight">{dest.city}</h2>
              <p className="text-white/75 text-sm">{dest.country}</p>
            </div>
          </div>
        </div>
        {/* Budget badge */}
        <div className="absolute top-3 right-3">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: dest.budgetLevel === "low" ? "rgba(34,197,94,0.9)" : "rgba(251,191,36,0.9)",
              color: "#fff",
            }}
          >
            {dest.budgetLevel === "low" ? "Tanie" : "Średnie"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {dest.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,107,53,0.1)", color: "var(--accent)" }}
            >
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
          {dest.description}
        </p>

        {/* Highlights */}
        {highlights.length > 0 && (
          <ul className="mb-4 space-y-1">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm" style={{ color: "var(--text-primary)" }}>
                <span style={{ color: "var(--accent)" }}>✓</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Flight cost + actions */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Szacowany lot</p>
            <p className="font-bold text-sm" style={{ color: "var(--accent)" }}>
              {dest.estimatedFlightCost ?? "—"}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={buildSkyscannerUrl(dest, airports)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium px-3 py-2 rounded-xl transition-opacity hover:opacity-70"
              style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Szukaj lotów ↗
            </a>
            <button
              onClick={() => onPlan(dest)}
              className="text-xs font-bold px-3 py-2 rounded-xl transition-opacity hover:opacity-85"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Planuj wyjazd →
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Flight details modal ──────────────────────────────────────────────────────

function FlightModal({
  dest,
  airports,
  onClose,
  onGenerate,
  isGenerating,
}: {
  dest: DestinationRecommendation;
  airports: string[];
  onClose: () => void;
  onGenerate: (dest: DestinationRecommendation, details: FlightDetails | null) => void;
  isGenerating: boolean;
}) {
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [returnDate, setReturnDate]   = useState("");
  const [returnTime, setReturnTime]   = useState("");

  const hasFlightData = arrivalDate && arrivalTime && returnDate && returnTime;

  const handleSubmit = () => {
    const details: FlightDetails | null = hasFlightData
      ? { arrivalDate, arrivalTime, returnDate, returnTime }
      : null;
    onGenerate(dest, details);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="text-3xl">{dest.coverImage}</span>
          <div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              {dest.city}, {dest.country}
            </h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Podaj daty lotu — plan będzie idealnie dopasowany
            </p>
          </div>
        </div>

        {/* Flight details form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Przylot do {dest.city}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                placeholder="14:30"
                className="w-24 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Wylot z {dest.city} (powrót)
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <input
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                placeholder="08:00"
                className="w-24 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
        </div>

        {!hasFlightData && (
          <p className="text-xs mb-4 text-center" style={{ color: "var(--text-muted)" }}>
            Możesz też wygenerować plan bez podawania dat — będzie mniej dopasowany godzinowo.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium text-sm transition-opacity hover:opacity-70"
            style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            disabled={isGenerating}
            className="flex-[2] py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {isGenerating
              ? "Generuję plan…"
              : hasFlightData
              ? "Wygeneruj plan ✨"
              : "Generuj bez dat"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Upgrade modal ─────────────────────────────────────────────────────────────

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="text-4xl mb-3">✈️</div>
        <h3 className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
          Skończyły się kredyty
        </h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          Kup Pack lub przejdź na Pro, żeby generować kolejne plany.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            Wróć
          </button>
          <button
            onClick={() => router.push("/pricing")}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Zobacz plany →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DestinationsPage() {
  const router = useRouter();
  const {
    quizAnswers,
    selectDestination,
    setFlightDetails,
    setCurrentTrip,
    setIsGeneratingPlan,
    isGeneratingPlan,
    setCurrentQuizStep,
    _hasHydrated,
  } = useAppStore();

  const [destinations, setDestinations] = useState<DestinationRecommendation[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [userStatus, setUserStatus]     = useState<UserStatus | null>(null);
  const [fetchKey, setFetchKey]         = useState(0);

  const [planModal, setPlanModal]       = useState<DestinationRecommendation | null>(null);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  // Fetch destinations + profile
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!quizAnswers.budget) {
      router.replace("/quiz");
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizAnswers),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        return data;
      }),
      fetch("/api/profile").then((r) => r.json()),
    ])
      .then(([destData, profileData]) => {
        if (!destData.destinations?.length) {
          setError("AI nie zwróciło rekomendacji. Spróbuj ponownie.");
        } else {
          setDestinations(destData.destinations);
        }
        setUserStatus(profileData);
        if (profileData?.authenticated) {
          setShowSavePrompt(true);
        }
      })
      .catch((err: Error) => setError(err.message || "Nie udało się załadować rekomendacji."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, fetchKey, router]);

  const handlePlanClick = (dest: DestinationRecommendation) => {
    if (!userStatus?.authenticated) {
      router.push(`/login?next=/destinations`);
      return;
    }
    if (!userStatus?.can_generate) {
      setUpgradeModal(true);
      return;
    }
    setPlanModal(dest);
  };

  const handleGenerate = async (dest: DestinationRecommendation, details: FlightDetails | null) => {
    setPlanModal(null);
    selectDestination(dest);
    setFlightDetails(details);
    setIsGeneratingPlan(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: dest, quizAnswers, flightDetails: details }),
      });

      if (!res.ok || !res.body) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j.error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let navigated = false;

      while (!navigated) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let msg: Record<string, unknown>;
          try { msg = JSON.parse(line); } catch { continue; }
          if (msg.error) throw new Error(msg.error as string);
          if (msg.done) {
            setCurrentTrip({
              id: msg.tripId as string,
              destination: dest,
              quizAnswers,
              plan: msg.plan as import("@/types").TripPlan,
              createdAt: new Date().toISOString(),
            });
            router.push(`/plan/${msg.tripId as string}`);
            navigated = true;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nieznany błąd";
      setIsGeneratingPlan(false);
      setGenerateError(`Nie udało się wygenerować planu: ${msg}`);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <PlaneAnimation city={quizAnswers.preferredCity} />
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4 px-8 text-center">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{error}</p>
        <button
          onClick={() => setFetchKey((k) => k + 1)}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 px-5 pb-8">
      {/* Header */}
      <div className="pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => { setCurrentQuizStep(4); router.push("/quiz"); }}
            className="text-sm font-medium transition-opacity hover:opacity-60"
            style={{ color: "var(--text-muted)" }}
          >
            ← Zmień odpowiedzi
          </button>
          {userStatus?.authenticated && (
            <button
              onClick={() => router.push("/profile")}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{
                background: userStatus.is_pro
                  ? "var(--accent)"
                  : (userStatus.credits_remaining ?? 0) === 0
                  ? "#ef4444"
                  : "var(--surface)",
                color: userStatus.is_pro || (userStatus.credits_remaining ?? 0) === 0
                  ? "#fff"
                  : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {userStatus.is_pro
                ? "Pro ✨"
                : `${userStatus.credits_remaining ?? 0} planów`}
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Twoje destynacje
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Dopasowane do Twojego budżetu i stylu. Kliknij &ldquo;Planuj wyjazd&rdquo; i podaj daty lotu.
        </p>
      </div>

      {/* Save preferences prompt */}
      <AnimatePresence>
        {showSavePrompt && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3"
            style={{ background: "var(--accent-light)", border: "1px solid rgba(196,98,45,0.25)" }}
          >
            <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              Zapisać te preferencje? Następnym razem pominiesz quiz.
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowSavePrompt(false)}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                Nie
              </button>
              <button
                onClick={() => {
                  fetch("/api/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ quiz_preferences: quizAnswers }),
                  }).catch(() => {});
                  setShowSavePrompt(false);
                }}
                className="text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Zapisz ✓
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      {generateError && (
        <div
          className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          {generateError}
        </div>
      )}

      {/* Generating overlay */}
      {isGeneratingPlan && (
        <GeneratingOverlay city={planModal?.city ?? quizAnswers.preferredCity} />
      )}

      {/* Destination cards */}
      <div className="flex flex-col gap-4">
        {destinations.map((dest) => (
          <DestCard
            key={`${dest.city}-${dest.country}`}
            dest={dest}
            onPlan={handlePlanClick}
            airports={quizAnswers.airports}
            month={quizAnswers.month}
          />
        ))}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {planModal && (
          <FlightModal
            key="flight-modal"
            dest={planModal}
            airports={quizAnswers.airports}
            onClose={() => setPlanModal(null)}
            onGenerate={handleGenerate}
            isGenerating={isGeneratingPlan}
          />
        )}
        {upgradeModal && (
          <UpgradeModal key="upgrade-modal" onClose={() => setUpgradeModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
