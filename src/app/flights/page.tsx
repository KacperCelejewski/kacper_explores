"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { DestinationRecommendation } from "@/types";
import type { RealFlight } from "@/lib/flights/rapidapi";
import { CONTINENTS, getContinent, type Continent } from "@/lib/continents";

interface UserStatus {
  authenticated: boolean;
  can_generate?: boolean;
  credits_remaining?: number;
  is_pro?: boolean;
}

type SortKey = "best_match" | "cheapest" | "flight_time";

const TAG_LABELS: Record<string, string> = {
  history: "historia",
  food: "jedzenie",
  architecture: "architektura",
  beach: "plaża",
  nightlife: "nocne życie",
  nature: "natura",
};

const INITIAL_VISIBLE = 5;

export default function FlightsPage() {
  const router = useRouter();
  const { quizAnswers, selectDestination, setCurrentTrip, setIsGeneratingPlan, isGeneratingPlan, _hasHydrated } =
    useAppStore();

  const [allRecs, setAllRecs] = useState<DestinationRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("best_match");
  const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [flightModal, setFlightModal] = useState<{
    dest: DestinationRecommendation;
    flights: RealFlight[];
    loading: boolean;
  } | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!quizAnswers.budget) {
      router.replace("/quiz");
      return;
    }
    Promise.all([
      fetch("/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizAnswers),
      }).then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]).then(([flightsData, profileData]) => {
      setAllRecs(flightsData.recommendations ?? []);
      setUserStatus(profileData);
      if (profileData?.authenticated) {
        fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quiz_preferences: quizAnswers }),
        }).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [_hasHydrated, quizAnswers, router]);

  // Reset visible count when sort or continent filter changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setVisibleCount(INITIAL_VISIBLE); }, [sortKey, activeContinent]);

  const continentsWithRecs = useMemo(() => {
    const set = new Set<Continent>();
    allRecs.forEach((r) => { const c = getContinent(r.country); if (c) set.add(c); });
    return set;
  }, [allRecs]);

  const sorted = useMemo(() => {
    const base = activeContinent
      ? allRecs.filter((r) => getContinent(r.country) === activeContinent)
      : allRecs;
    if (sortKey === "cheapest") return [...base].sort((a, b) => a.bestOffer.realCost - b.bestOffer.realCost);
    if (sortKey === "flight_time") return [...base].sort((a, b) => a.bestOffer.durationMinutes - b.bestOffer.durationMinutes);
    return base;
  }, [allRecs, sortKey, activeContinent]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const handleSelect = async (dest: DestinationRecommendation) => {
    if (!userStatus?.authenticated) {
      router.push(`/login?next=/flights`);
      return;
    }
    if (!userStatus?.can_generate) {
      router.push("/pricing");
      return;
    }

    setGenerateError(null);
    setFlightModal({ dest, flights: [], loading: true });

    // Fetch real flights in background while modal opens
    if (quizAnswers.month) {
      const origin = dest.bestOffer.origin.code;
      const destination = dest.bestOffer.destination.code;
      fetch(
        `/api/real-flights?origin=${origin}&dest=${destination}&month=${quizAnswers.month}&duration=${quizAnswers.duration ?? 3}`
      )
        .then((r) => r.json())
        .then((data: { flights?: RealFlight[] }) => {
          setFlightModal((prev) => prev ? { ...prev, flights: data.flights ?? [], loading: false } : null);
        })
        .catch(() => {
          setFlightModal((prev) => prev ? { ...prev, flights: [], loading: false } : null);
        });
    } else {
      setFlightModal((prev) => prev ? { ...prev, loading: false } : null);
    }
  };

  const handleGenerate = async (dest: DestinationRecommendation, selectedFlight: RealFlight | null) => {
    setFlightModal(null);
    const id = dest.city;
    setSelectedId(id);
    selectDestination(dest);
    setIsGeneratingPlan(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: dest, quizAnswers, selectedFlight }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Serwer zwrócił nieprawidłową odpowiedź. Spróbuj ponownie.");
      }

      if (!res.ok) throw new Error((data.error as string | undefined) ?? `HTTP ${res.status}`);
      if (data.plan) {
        setCurrentTrip({
          id: data.tripId as string,
          destination: dest,
          quizAnswers,
          plan: data.plan as import("@/types").TripPlan,
          createdAt: new Date().toISOString(),
        });
        router.push(`/plan/${data.tripId as string}`);
      } else {
        throw new Error((data.error as string | undefined) ?? "Nieznany błąd");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nieznany błąd";
      setIsGeneratingPlan(false);
      setSelectedId(null);
      setGenerateError(`Nie udało się wygenerować planu: ${msg}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-6 px-8">
        <StepProgress
          steps={[
            "Sprawdzamy Twoje preferencje…",
            "Szukamy najtańszych lotów…",
            "Dopasowujemy kierunki…",
            "Sortujemy wyniki…",
          ]}
          intervalMs={1800}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-5 pb-8">
      {/* Header */}
      <div className="pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/quiz")}
            className="text-sm font-medium transition-opacity hover:opacity-60"
            style={{ color: "var(--text-muted)" }}
          >
            ← Zmień odpowiedzi
          </button>
          {userStatus?.authenticated ? (
            <button
              onClick={() => router.push("/profile")}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{
                background: userStatus.is_pro
                  ? "var(--accent)"
                  : userStatus.credits_remaining === 0
                  ? "#FEE2E2"
                  : "#DCFCE7",
                color: userStatus.is_pro
                  ? "white"
                  : userStatus.credits_remaining === 0
                  ? "#DC2626"
                  : "#16A34A",
              }}
            >
              {userStatus.is_pro
                ? "✦ Pro"
                : `${userStatus.credits_remaining ?? 0} ${(userStatus.credits_remaining ?? 0) === 1 ? "plan" : (userStatus.credits_remaining ?? 0) <= 4 ? "plany" : "planów"}`}
            </button>
          ) : (
            <button
              onClick={() => router.push("/login?next=/flights")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
            >
              Zaloguj się
            </button>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Twoje destynacje</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {activeContinent ? `${sorted.length} z ${allRecs.length}` : allRecs.length} kierunków · wybierz i wygeneruj plan z AI
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer banner */}
      {allRecs.length > 0 && (
        <div className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: "#F8F8F8", border: "1px solid var(--border)" }}>
          <span className="text-sm flex-shrink-0">ℹ️</span>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Ceny i terminy są orientacyjne — kliknij <strong>Sprawdź cenę</strong> aby zobaczyć aktualną dostępność
          </p>
        </div>
      )}

      {/* Continent filter */}
      {allRecs.length > 0 && continentsWithRecs.size > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {CONTINENTS.filter((c) => continentsWithRecs.has(c)).map((c) => (
            <button
              key={c}
              onClick={() => setActiveContinent(activeContinent === c ? null : c)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: activeContinent === c ? "var(--accent)" : "#F0F0F0",
                color: activeContinent === c ? "white" : "var(--text-secondary)",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Sort bar */}
      {allRecs.length > 1 && (
        <div className="flex gap-2 mt-3 mb-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {(
            [
              { key: "best_match", label: "✦ Najlepsze" },
              { key: "cheapest",   label: "💸 Najtańsze" },
              { key: "flight_time", label: "⚡ Najkrótszy lot" },
            ] as { key: SortKey; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: sortKey === key ? "var(--accent)" : "#F0F0F0",
                color: sortKey === key ? "white" : "var(--text-secondary)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {generateError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-2xl text-center"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <p className="text-sm" style={{ color: "#EF4444" }}>{generateError}</p>
        </motion.div>
      )}

      {allRecs.length === 0 && (
        <div className="flex flex-col flex-1 items-center justify-center gap-3 text-center py-12">
          <span className="text-4xl">🔍</span>
          <p className="text-sm font-medium">Brak wyników</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Zmień odpowiedzi w quizie i spróbuj ponownie.
          </p>
          <button
            onClick={() => router.push("/quiz")}
            className="text-xs font-semibold mt-2"
            style={{ color: "var(--accent)" }}
          >
            ← Wróć do quizu
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {visible.map((dest, i) => (
          <DestinationCard
            key={`${dest.city}-${sortKey}`}
            dest={dest}
            index={i}
            isTop={sortKey === "best_match" && i === 0}
            isLoading={isGeneratingPlan && selectedId === dest.city}
            isDisabled={isGeneratingPlan && selectedId !== dest.city}
            onSelect={() => handleSelect(dest)}
          />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + 5)}
          className="mt-4 w-full py-3 rounded-2xl text-sm font-semibold transition-all"
          style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
        >
          Pokaż więcej ({sorted.length - visibleCount} pozostałych)
        </button>
      )}

      {isGeneratingPlan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-5 p-5 rounded-2xl"
          style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.2)" }}
        >
          <StepProgress
            steps={[
              "Analizujemy kierunek i preferencje…",
              "Szukamy lokalnych atrakcji i restauracji…",
              "Układamy plan godzina po godzinie…",
              "Dobieramy budżetowe opcje i triki…",
              "Ostatnie szlify — prawie gotowe!",
            ]}
            intervalMs={4500}
            accentColor="var(--accent)"
            barColor="rgba(255,107,53,0.25)"
            barFillColor="var(--accent)"
          />
        </motion.div>
      )}

      <AnimatePresence>
        {flightModal && (
          <FlightSelectModal
            dest={flightModal.dest}
            flights={flightModal.flights}
            loading={flightModal.loading}
            onConfirm={(flight) => handleGenerate(flightModal.dest, flight)}
            onClose={() => setFlightModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DestinationCard({
  dest, index, isTop, isLoading, isDisabled, onSelect,
}: {
  dest: DestinationRecommendation;
  index: number;
  isTop: boolean;
  isLoading: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}) {
  const best = dest.bestOffer;
  // Show hub savings badge when best offer is via a hub and saves meaningfully vs WRO direct
  const hubSavings =
    best.savingsVsWro !== null && best.savingsVsWro > 150 ? best.savingsVsWro : null;

  const buyLabel = best.affiliateUrl ? "Sprawdź na Skyscanner ↗" : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 4) * 0.07 }}
      className="glass-card overflow-hidden"
      style={{ opacity: isDisabled ? 0.4 : 1, transition: "opacity 0.2s" }}
    >
      {/* Top */}
      <div
        className="px-4 pt-4 pb-3"
        style={{ background: isTop ? "var(--accent-light)" : "transparent" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{dest.coverImage}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base leading-tight">{dest.city}</h3>
                <span className="text-sm">{dest.countryFlag}</span>
                {isTop && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    #1
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{dest.country}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold" style={{ color: "var(--accent)" }}>
              ~{best.realCost} PLN
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>cena orientacyjna</p>
          </div>
        </div>

        <p
          className="text-xs mt-2 leading-relaxed"
          style={{
            color: "var(--text-muted)",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
          }}
        >
          {dest.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {dest.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
            >
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
          {hubSavings && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "#EFF6FF", color: "#1D4ED8" }}
            >
              −{hubSavings} PLN via {best.origin.city}
            </span>
          )}
        </div>
      </div>

      {/* Flight row */}
      <div
        className="px-4 py-2.5 flex items-center justify-between gap-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-medium truncate">
            {best.origin.code} → {best.destination.code}
            {best.departureDate && (
              <span className="font-normal" style={{ color: "var(--text-muted)" }}>
                {" · "}{new Date(best.departureDate).toLocaleDateString("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" })}
              </span>
            )}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {best.airline} · {Math.floor(best.durationMinutes / 60)}h {best.durationMinutes % 60}m
          </p>
          {best.transitToHub && (
            <p className="text-xs font-medium" style={{ color: "#1D4ED8" }}>
              {best.transitToHub.mode === "bus" ? "🚌" : best.transitToHub.mode === "train" ? "🚂" : "✈️"}{" "}
              {best.transitToHub.carrier} ~{best.transitToHub.costPln} PLN · {best.transitToHub.durationH}h dojazd
            </p>
          )}
        </div>

        {best.affiliateUrl && buyLabel && (
          <a
            href={best.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-70 whitespace-nowrap flex-shrink-0"
            style={{ background: "#F0F0F0", color: "var(--text-secondary)", textDecoration: "none" }}
          >
            {buyLabel}
          </a>
        )}
      </div>

      {/* CTA */}
      <div className="px-4 pb-4 pt-2.5">
        <button
          className="btn-primary flex items-center justify-center gap-2"
          disabled={isDisabled || isLoading}
          onClick={onSelect}
        >
          {isLoading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                ⏳
              </motion.span>
              Generuję plan…
            </>
          ) : (
            "Wygeneruj plan AI →"
          )}
        </button>
      </div>
    </motion.div>
  );
}

function FlightSelectModal({
  dest,
  flights,
  loading,
  onConfirm,
  onClose,
}: {
  dest: DestinationRecommendation;
  flights: RealFlight[];
  loading: boolean;
  onConfirm: (flight: RealFlight | null) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number | "skip" | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const noFlights = !loading && flights.length === 0;
  const effectiveSelected = noFlights ? "skip" : selected;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" });

  const content = (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.65)", zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl"
        style={{ background: "#F5EFE0", maxHeight: "88vh", overflowY: "auto" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Wybór lotu do ${dest.city}`}
      >
        {/* Drag handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold leading-tight">Loty do {dest.city}</h2>
            <p className="text-xs mt-1 font-medium" style={{ color: "var(--text-muted)" }}>
              {dest.bestOffer.origin.code} → {dest.bestOffer.destination.code} · {formatDate(dest.bestOffer.departureDate ?? "")}
            </p>
          </div>
          {dest.bestOffer.affiliateUrl && (
            <a
              href={dest.bestOffer.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 mt-0.5"
              style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              onClick={(e) => e.stopPropagation()}
            >
              Skyscanner ↗
            </a>
          )}
        </div>

        <div className="h-px mx-5" style={{ background: "var(--border)" }} />

        {/* Loading */}
        {loading && (
          <div className="px-5 py-10">
            <StepProgress
              steps={[
                "Sprawdzamy dostępność lotów…",
                "Pobieramy aktualne ceny…",
                "Sortujemy wyniki…",
              ]}
              intervalMs={1600}
            />
          </div>
        )}

        {/* No flights */}
        {noFlights && (
          <div className="px-5 py-8 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-semibold">Brak danych lotów dla tej trasy</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Plan wygenerujemy z typowymi godzinami lotów budżetowych.{" "}
              {dest.bestOffer.affiliateUrl && (
                <a
                  href={dest.bestOffer.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                  style={{ color: "var(--accent)" }}
                >
                  Sprawdź loty na Skyscanner ↗
                </a>
              )}
            </p>
          </div>
        )}

        {/* Flight list — radio group */}
        {!loading && flights.length > 0 && (
          <div role="radiogroup" aria-label="Wybierz lot">
            {flights.map((f, i) => {
              const isSelected = selected === i;
              return (
                <div key={i}>
                  <button
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelected(i)}
                    className="w-full text-left px-5 py-4 transition-colors"
                    style={{ background: isSelected ? "var(--accent-light)" : "transparent" }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Radio indicator */}
                      <div
                        className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors"
                        style={{
                          borderColor: isSelected ? "var(--accent)" : "var(--border)",
                          background: isSelected ? "var(--accent)" : "transparent",
                        }}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold">{f.airline}</p>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                              ~{Math.round(f.price)} PLN
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>tam i z powrotem</p>
                          </div>
                        </div>
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          ✈️ {formatDate(f.departureDate)} · {f.departureTime}–{f.arrivalTime}
                          <span style={{ color: "var(--text-muted)" }}>
                            {" "}({Math.floor(f.durationMinutes / 60)}h {f.durationMinutes % 60}m)
                          </span>
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          Powrót {formatDate(f.returnDate)} · wylot {f.returnDepartureTime}
                        </p>
                        {dest.bestOffer.affiliateUrl && (
                          <a
                            href={dest.bestOffer.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1.5 text-xs font-semibold"
                            style={{ color: "var(--accent)" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Kup na Skyscanner ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="h-px mx-5" style={{ background: "var(--border)" }} />
                </div>
              );
            })}

            {/* Skip option */}
            <button
              role="radio"
              aria-checked={selected === "skip"}
              onClick={() => setSelected("skip")}
              className="w-full text-left px-5 py-4 transition-colors"
              style={{ background: selected === "skip" ? "#F5F5F3" : "transparent" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors"
                  style={{
                    borderColor: selected === "skip" ? "var(--text-secondary)" : "var(--border)",
                    background: selected === "skip" ? "var(--text-secondary)" : "transparent",
                  }}
                >
                  {selected === "skip" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Nie wiem jeszcze
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Wygeneruj plan, godziny uzupełnisz po zakupie biletu
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* CTA footer */}
        {!loading && (
          <div className="px-5 pt-3 pb-6">
            <div className="h-px mb-4" style={{ background: "var(--border)" }} />
            {effectiveSelected === null && (
              <p className="text-xs text-center mb-3" style={{ color: "var(--text-muted)" }}>
                Wybierz opcję powyżej aby kontynuować
              </p>
            )}
            {!noFlights && effectiveSelected !== null && (
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                ℹ️ Ceny orientacyjne — po zakupie biletu plan AI dopasuje godziny
              </p>
            )}
            <button
              className="btn-primary"
              disabled={effectiveSelected === null}
              onClick={() => {
                if (effectiveSelected === null) return;
                onConfirm(effectiveSelected === "skip" ? null : flights[effectiveSelected as number] ?? null);
              }}
            >
              Wygeneruj plan AI →
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

function StepProgress({
  steps,
  intervalMs = 2000,
  accentColor = "var(--accent)",
  barColor = "rgba(0,0,0,0.08)",
  barFillColor = "var(--accent)",
}: {
  steps: string[];
  intervalMs?: number;
  accentColor?: string;
  barColor?: string;
  barFillColor?: string;
}) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const tick = 50;
    const increment = (tick / intervalMs) * 100;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setStep((s) => Math.min(s + 1, steps.length - 1));
          return 0;
        }
        return p + increment;
      });
    }, tick);
    return () => clearInterval(timer);
  }, [intervalMs, steps.length]);

  const currentStep = Math.min(step, steps.length - 1);

  return (
    <div className="w-full">
      <p className="text-sm font-semibold mb-3 text-center" style={{ color: accentColor }}>
        {steps[currentStep]}
      </p>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: barColor }}>
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: currentStep === steps.length - 1 ? "100%" : `${progress}%`,
            background: barFillColor,
            transition: "width 50ms linear",
          }}
        />
      </div>
      <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
        Krok {currentStep + 1} z {steps.length}
      </p>
    </div>
  );
}
