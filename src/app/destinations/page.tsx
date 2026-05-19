"use client";

import { useEffect, useState } from "react";
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
          src={getCityPhotoUrl(dest.city, 800)}
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
          fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quiz_preferences: quizAnswers }),
          }).catch(() => {});
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
            onClick={() => router.push("/quiz")}
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
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="w-16 h-16 rounded-full border-4 border-transparent animate-spin"
            style={{ borderTopColor: "var(--accent)" }}
          />
          <p className="text-white font-semibold text-lg">Układam Twój plan…</p>
          <p className="text-white/60 text-sm">Za chwilę wiesz dokąd lecisz.</p>
        </div>
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
