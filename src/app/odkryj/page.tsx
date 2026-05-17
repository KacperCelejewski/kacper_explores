"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import SiteNav from "@/app/components/SiteNav";
import { CONTINENTS, getContinent, type Continent } from "@/lib/continents";

interface GalleryTrip {
  id: string;
  city: string;
  country: string;
  destination_data: { coverImage?: string; countryFlag?: string } | null;
  quiz_answers: { duration?: number; budget?: string } | null;
  created_at: string;
}

const SHORT_MONTHS = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function OdkryjPage() {
  const [trips, setTrips] = useState<GalleryTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => setTrips(d.trips ?? []))
      .finally(() => setLoading(false));
  }, []);

  // continents that have at least one trip (for graying out)
  const continentsWithTrips = useMemo(() => {
    const set = new Set<Continent>();
    trips.forEach((t) => {
      const c = getContinent(t.country);
      if (c) set.add(c);
    });
    return set;
  }, [trips]);

  // countries within selected continent
  const countriesInContinent = useMemo(() => {
    if (!activeContinent) return [];
    const set = new Set<string>();
    trips.forEach((t) => {
      if (getContinent(t.country) === activeContinent) set.add(t.country);
    });
    return Array.from(set).sort();
  }, [trips, activeContinent]);

  const filtered = useMemo(() => {
    if (!activeContinent) return trips;
    return trips.filter((t) => {
      if (getContinent(t.country) !== activeContinent) return false;
      if (activeCountry && t.country !== activeCountry) return false;
      return true;
    });
  }, [trips, activeContinent, activeCountry]);

  function selectContinent(c: Continent) {
    if (activeContinent === c) {
      setActiveContinent(null);
      setActiveCountry(null);
    } else {
      setActiveContinent(c);
      setActiveCountry(null);
    }
  }

  function selectCountry(country: string) {
    setActiveCountry(activeCountry === country ? null : country);
  }

  return (
    <div className="flex flex-col flex-1">
      <SiteNav />
      <div className="px-5 pt-6 pb-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>
            Odkryj
          </p>
          <h1 className="text-2xl font-bold mb-1">Plany innych podróżników</h1>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Przeglądaj trasy wygenerowane przez społeczność Włóczykij
          </p>
        </motion.div>

        {/* Continent filter */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-3"
          >
            <div className="flex flex-wrap gap-2">
              {CONTINENTS.map((c) => {
                const hasTrips = continentsWithTrips.has(c);
                const isActive = activeContinent === c;
                return (
                  <button
                    key={c}
                    onClick={() => hasTrips && selectContinent(c)}
                    disabled={!hasTrips}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: isActive ? "var(--accent)" : "var(--glass-bg, rgba(255,255,255,0.07))",
                      color: isActive ? "#fff" : hasTrips ? "var(--text-muted)" : "var(--text-muted)",
                      border: `1px solid ${isActive ? "var(--accent)" : "var(--border-color, rgba(255,255,255,0.12))"}`,
                      opacity: hasTrips ? 1 : 0.35,
                      cursor: hasTrips ? "pointer" : "default",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Country filter (shown when continent selected) */}
        <AnimatePresence>
          {activeContinent && countriesInContinent.length > 1 && (
            <motion.div
              key="country-filter"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 pt-1">
                {countriesInContinent.map((country) => (
                  <button
                    key={country}
                    onClick={() => selectCountry(country)}
                    className="text-xs px-2.5 py-1 rounded-full transition-all"
                    style={{
                      background: activeCountry === country ? "var(--accent-muted, rgba(var(--accent-rgb),0.2))" : "transparent",
                      color: activeCountry === country ? "var(--accent)" : "var(--text-muted)",
                      border: `1px solid ${activeCountry === country ? "var(--accent)" : "var(--border-color, rgba(255,255,255,0.1))"}`,
                    }}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          </div>
        ) : filtered.length === 0 && trips.length > 0 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-medium">Brak planów dla tego regionu</p>
            <button
              onClick={() => { setActiveContinent(null); setActiveCountry(null); }}
              className="text-xs mt-3 font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Pokaż wszystkie →
            </button>
          </motion.div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🗺️</p>
            <p className="text-sm font-medium">Brak publicznych planów</p>
            <p className="text-xs mt-1 mb-6" style={{ color: "var(--text-muted)" }}>
              Bądź pierwszy — udostępnij swój plan z planu podróży
            </p>
            <Link href="/quiz" className="btn-primary" style={{ display: "inline-block", width: "auto", padding: "12px 24px", textDecoration: "none" }}>
              Stwórz plan →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((trip, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/share/${trip.id}`} style={{ textDecoration: "none" }}>
                  <div className="glass-card p-4 flex items-center gap-4 transition-opacity hover:opacity-80">
                    <span className="text-3xl flex-shrink-0">
                      {trip.destination_data?.coverImage ?? "🗺️"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base leading-tight">
                        {trip.city} {trip.destination_data?.countryFlag ?? ""}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {trip.country}
                        {trip.quiz_answers?.duration ? ` · ${trip.quiz_answers.duration} dni` : ""}
                        {trip.quiz_answers?.budget === "low" ? " · 🎒 Backpacker" : " · 🧳 Komfort"}
                        {" · "}{formatDate(trip.created_at)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>
                      Zobacz →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
