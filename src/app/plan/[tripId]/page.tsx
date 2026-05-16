"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { downloadICS } from "@/lib/ics";
import ChatPanel from "@/app/components/ChatPanel";
import BudgetTracker from "@/app/components/BudgetTracker";
import type { DayPlan, DayActivity, TripPlan, DestinationRecommendation } from "@/types";

function buildBookingUrl(city: string, country: string, checkin?: string, checkout?: string): string {
  const params = new URLSearchParams({ ss: `${city}, ${country}`, group_adults: "1", no_rooms: "1" });
  if (checkin) params.set("checkin", checkin);
  if (checkout) params.set("checkout", checkout);
  return `https://www.booking.com/search.html?${params}`;
}

function buildHostelworldUrl(city: string): string {
  return `https://www.hostelworld.com/search?search=${encodeURIComponent(city)}`;
}

const ACTIVITY_COLORS: Record<string, string> = {
  attraction: "rgba(255,107,53,0.07)",
  food: "rgba(255,107,53,0.05)",
  transport: "#F7F7F5",
  tip: "rgba(255,107,53,0.06)",
  accommodation: "rgba(59,130,246,0.07)",
};

const ACTIVITY_BORDER: Record<string, string> = {
  attraction: "rgba(255,107,53,0.25)",
  food: "rgba(255,107,53,0.2)",
  transport: "#EBEBEB",
  tip: "rgba(255,107,53,0.2)",
  accommodation: "rgba(59,130,246,0.25)",
};

const ACTIVITY_LABELS: Record<string, string> = {
  attraction: "Atrakcja",
  food: "Jedzenie",
  transport: "Transport",
  tip: "Wskazówka",
  accommodation: "Nocleg",
};

interface PackingCategory {
  name: string;
  emoji: string;
  items: string[];
}

export default function PlanPage() {
  const router = useRouter();
  const params = useParams<{ tripId: string }>();
  const { currentTrip, setCurrentTrip, updateTripDay, resetQuiz } = useAppStore();
  const [activeDay, setActiveDay] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // is_public toggle
  const [isPublic, setIsPublic] = useState(false);
  const [publicToggling, setPublicToggling] = useState(false);

  const handleTogglePublic = async () => {
    if (!currentTrip?.id || publicToggling) return;
    setPublicToggling(true);
    try {
      const res = await fetch(`/api/trips/${currentTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !isPublic }),
      });
      if (res.ok) setIsPublic((p) => !p);
    } finally {
      setPublicToggling(false);
    }
  };

  // Packing list state
  const [packingOpen, setPackingOpen] = useState(false);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingList, setPackingList] = useState<PackingCategory[] | null>(null);
  const [packingError, setPackingError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Regenerate day state — keyed by day index
  const [regenLoading, setRegenLoading] = useState<Record<number, boolean>>({});

  const handleShare = () => {
    if (!currentTrip?.id) return;
    const url = `${window.location.origin}/share/${currentTrip.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => window.print();

  const handleICS = () => {
    if (!currentTrip?.plan) return;
    const startDate = currentTrip.destination?.bestOffer?.departureDate;
    downloadICS(currentTrip.plan, startDate);
  };

  const handlePackingList = async () => {
    if (packingList) { setPackingOpen((o) => !o); return; }
    setPackingOpen(true);
    setPackingLoading(true);
    setPackingError(null);
    try {
      const res = await fetch("/api/packing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: currentTrip?.plan?.city,
          country: currentTrip?.plan?.country,
          quizAnswers: currentTrip?.quizAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd generowania");
      setPackingList(data.categories);
    } catch (err) {
      setPackingError(err instanceof Error ? err.message : "Błąd sieci");
    } finally {
      setPackingLoading(false);
    }
  };

  const toggleChecked = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleRegenerateDay = async (dayIndex: number) => {
    if (!currentTrip?.id) return;
    setRegenLoading((prev) => ({ ...prev, [dayIndex]: true }));
    try {
      const res = await fetch("/api/regenerate-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: currentTrip.id, dayIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd regeneracji");
      updateTripDay(dayIndex, data.day);
    } catch {
      // silently fail — user can retry
    } finally {
      setRegenLoading((prev) => ({ ...prev, [dayIndex]: false }));
    }
  };

  // Store-first, Supabase fallback (active session required)
  useEffect(() => {
    const tripId = params?.tripId;
    if (!tripId) { router.replace("/"); return; }
    if (currentTrip?.id === tripId && currentTrip.plan) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/trips/${tripId}`)
      .then((r) => {
        if (r.status === 401) { router.replace(`/login?next=/plan/${tripId}`); return null; }
        if (!r.ok) { router.replace("/"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setCurrentTrip({
          id: data.id,
          destination: data.destination,
          quizAnswers: data.quizAnswers,
          plan: data.plan as TripPlan,
          createdAt: new Date().toISOString(),
        });
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [params?.tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !currentTrip?.plan) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4" aria-busy="true" aria-label="Ładowanie planu podróży">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-3xl"
          aria-hidden="true"
        >
          ✈️
        </motion.div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ładowanie planu…</p>
      </div>
    );
  }

  const { plan, destination } = currentTrip;
  const dest = destination as DestinationRecommendation | null;

  return (
    <div className="flex flex-col flex-1 pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <button
          onClick={() => router.push("/flights")}
          className="text-sm mb-5 block transition-opacity hover:opacity-60 no-print"
          style={{ color: "var(--text-muted)" }}
        >
          ← Zmień kierunek
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{dest?.coverImage ?? "🗺️"}</span>
            <div>
              <h1 className="text-xl font-bold">
                {plan.city} {dest?.countryFlag ?? ""}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                {plan.duration} dni · {plan.country}
              </p>
            </div>
          </div>

          {/* Budget breakdown */}
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: "var(--border)" }}>
            <BudgetItem label="Loty" value={plan.budgetBreakdown.flights} emoji="✈️" />
            <BudgetItem label="Nocleg" value={plan.budgetBreakdown.accommodation} emoji="🛏️" />
            <BudgetItem label="Jedzenie" value={plan.budgetBreakdown.food} emoji="🍽️" />
            <BudgetItem label="Atrakcje" value={plan.budgetBreakdown.attractions} emoji="🎟️" />
          </div>

          <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Szacowany całkowity koszt
            </span>
            <span className="text-base font-bold" style={{ color: "var(--accent)" }}>
              {plan.totalBudgetEstimate}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Hotel suggestions */}
      <div className="px-5 mb-4 no-print">
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
          Noclegi w {plan.city}
        </p>
        <div className="flex flex-col gap-2">
          {[
            {
              label: "🛏️ Booking.com",
              sub: "Hotele i apartamenty",
              url: buildBookingUrl(
                plan.city, plan.country,
                dest?.bestOffer?.departureDate,
                dest?.bestOffer?.returnDate,
              ),
              color: "#003580",
              bg: "#EEF3FF",
            },
            {
              label: "🏕️ Hostelworld",
              sub: "Hostele dla backpackerów",
              url: buildHostelworldUrl(plan.city),
              color: "#FF6C2F",
              bg: "#FFF0E8",
            },
          ].map((opt) => (
            <a
              key={opt.label}
              href={opt.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl transition-opacity hover:opacity-80"
              style={{ background: opt.bg, textDecoration: "none", border: `1px solid ${opt.color}22` }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: opt.color }}>{opt.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.sub}</p>
              </div>
              <span className="text-xs font-semibold" style={{ color: opt.color }}>Szukaj →</span>
            </a>
          ))}
        </div>
      </div>

      {/* Tips */}
      {plan.generalTips?.length > 0 && (
        <div className="px-5 mb-4">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
            Wskazówki budżetowe
          </p>
          <div className="flex flex-col gap-2">
            {plan.generalTips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.06 }}
                className="flex items-start gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.15)" }}
              >
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14, lineHeight: "20px", flexShrink: 0 }}>✦</span>
                <p className="text-xs leading-relaxed">{tip}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Day tabs — hidden in print */}
      <div className="px-5 mb-4 no-print" data-day-tabs>
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
          Plan dzienny
        </p>
        <div
          role="tablist"
          aria-label="Dni podróży"
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {plan.days.map((day, i) => (
            <button
              key={day.day}
              role="tab"
              id={`tab-day-${i}`}
              aria-selected={activeDay === i}
              aria-controls={`tabpanel-day-${i}`}
              tabIndex={activeDay === i ? 0 : -1}
              onClick={() => setActiveDay(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setActiveDay((prev) => Math.min(prev + 1, plan.days.length - 1));
                if (e.key === "ArrowLeft")  setActiveDay((prev) => Math.max(prev - 1, 0));
              }}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: activeDay === i ? "var(--accent)" : "#F0F0F0",
                color: activeDay === i ? "white" : "var(--text-secondary)",
              }}
            >
              Dzień {day.day}
            </button>
          ))}
        </div>
      </div>

      {/* Day panels — all rendered, only active shown on screen, all visible in print */}
      {plan.days.map((day, i) => (
        <div
          key={day.day}
          role="tabpanel"
          id={`tabpanel-day-${i}`}
          aria-labelledby={`tab-day-${i}`}
          data-print-day
          style={{ display: activeDay === i ? "block" : "none" }}
        >
          <DayPlanView
            day={day}
            city={plan.city}
            dayIndex={i}
            tripId={currentTrip.id}
            regenLoading={!!regenLoading[i]}
            onRegenerate={handleRegenerateDay}
          />
        </div>
      ))}

      {/* Print-only day label */}
      <style>{`
        @media print {
          [data-print-day] { display: block !important; }
          [data-day-tabs] { display: none !important; }
        }
      `}</style>

      {/* Packing list */}
      <div className="px-5 mt-4 no-print">
        <button
          onClick={handlePackingList}
          disabled={packingLoading}
          className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid rgba(196,98,45,0.2)" }}
        >
          {packingLoading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              Generuję listę…
            </>
          ) : (
            <>{packingOpen && packingList ? "🧳 Lista rzeczy ↑" : "🧳 Wygeneruj listę do spakowania"}</>
          )}
        </button>

        <AnimatePresence>
          {packingOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                {packingError && (
                  <p className="text-sm text-center py-3" style={{ color: "var(--error)" }}>{packingError}</p>
                )}
                {packingList && (
                  <div className="flex flex-col gap-3">
                    {packingList.map((cat) => (
                      <div key={cat.name} className="glass-card p-4">
                        <p className="text-sm font-bold mb-2">{cat.emoji} {cat.name}</p>
                        <div className="flex flex-col gap-1.5">
                          {cat.items.map((item) => {
                            const key = `${cat.name}::${item}`;
                            const checked = checkedItems.has(key);
                            return (
                              <button
                                key={item}
                                onClick={() => toggleChecked(key)}
                                className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-70"
                              >
                                <span
                                  className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border text-xs"
                                  style={{
                                    background: checked ? "var(--accent)" : "transparent",
                                    borderColor: checked ? "var(--accent)" : "var(--border)",
                                    color: "white",
                                  }}
                                >
                                  {checked ? "✓" : ""}
                                </span>
                                <span
                                  className="text-sm"
                                  style={{
                                    textDecoration: checked ? "line-through" : "none",
                                    color: checked ? "var(--text-muted)" : "var(--text-primary)",
                                  }}
                                >
                                  {item}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Budget tracker */}
      {currentTrip && (
        <div className="px-5 mt-4 no-print">
          <BudgetTracker
            tripId={currentTrip.id}
            plannedBreakdown={plan.budgetBreakdown}
            plannedTotal={plan.totalBudgetEstimate}
          />
        </div>
      )}

      {/* Actions */}
      <div className="px-5 mt-6 flex flex-col gap-3">
        {/* Saved indicator */}
        <div
          className="flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold"
          style={{ background: "#DCFCE7", color: "#16A34A" }}
        >
          <span>✓</span>
          <span>Plan zapisany na Twoim koncie</span>
        </div>

        <div className="grid grid-cols-3 gap-2 no-print">
          <button
            onClick={handleShare}
            className="py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            style={{
              background: copied ? "#DCFCE7" : "#F0F0F0",
              color: copied ? "#16A34A" : "var(--text-secondary)",
            }}
          >
            {copied ? "✓ Skopiowano!" : "🔗 Udostępnij"}
          </button>
          <button
            onClick={handlePrint}
            className="py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1 transition-all hover:opacity-80"
            style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
          >
            📄 PDF
          </button>
          <button
            onClick={handleICS}
            className="py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1 transition-all hover:opacity-80"
            style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
          >
            📅 Kalendarz
          </button>
        </div>

        {/* Map link */}
        <button
          onClick={() => router.push(`/plan/${currentTrip?.id}/mapa`)}
          className="py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80 no-print"
          style={{ background: "#E8F4FD", color: "#1A73E8" }}
        >
          🗺️ Mapa atrakcji
        </button>

        {/* is_public toggle */}
        <button
          onClick={handleTogglePublic}
          disabled={publicToggling}
          className="py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80 no-print disabled:opacity-40"
          style={{
            background: isPublic ? "#DCFCE7" : "#F0F0F0",
            color: isPublic ? "#16A34A" : "var(--text-secondary)",
          }}
        >
          {publicToggling ? "…" : isPublic ? "✓ Plan widoczny w galerii" : "🌍 Udostępnij w galerii Odkryj"}
        </button>

        <button
          className="btn-primary no-print"
          onClick={() => { resetQuiz(); router.push("/"); }}
        >
          Zaplanuj nową podróż →
        </button>
      </div>

      {/* Floating chat panel */}
      {currentTrip && (
        <ChatPanel tripId={currentTrip.id} city={plan.city} />
      )}
    </div>
  );
}

function BudgetItem({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base" aria-hidden="true">{emoji}</span>
      <div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function buildMapsRouteUrl(activities: DayActivity[], city: string): string | null {
  const locations = activities
    .filter((a) => a.location && a.type !== "tip" && a.type !== "transport")
    .map((a) => encodeURIComponent(`${a.location}, ${city}`));
  if (locations.length < 1) return null;
  if (locations.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${locations[0]}`;
  }
  return `https://www.google.com/maps/dir/${locations.join("/")}`;
}

function DayPlanView({
  day,
  city,
  dayIndex,
  tripId,
  regenLoading,
  onRegenerate,
}: {
  day: DayPlan;
  city: string;
  dayIndex: number;
  tripId: string;
  regenLoading: boolean;
  onRegenerate: (i: number) => void;
}) {
  const mapsUrl = buildMapsRouteUrl(day.activities, city);

  return (
    <motion.div
      key={day.day}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="px-5"
    >
      <div
        className="px-4 py-3 mb-3 rounded-2xl flex items-center justify-between gap-3"
        style={{ background: "#F7F7F5", border: "1px solid var(--border)" }}
      >
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{day.date}</p>
          <p className="text-sm font-medium mt-0.5">{day.theme}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-70 no-print"
              style={{ background: "#E8F4FD", color: "#1A73E8", textDecoration: "none" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Trasa
            </a>
          )}
          <button
            onClick={() => onRegenerate(dayIndex)}
            disabled={regenLoading}
            title="Zaproponuj inny plan tego dnia"
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-70 disabled:opacity-40 no-print"
            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
          >
            {regenLoading ? (
              <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            ) : (
              "↻"
            )}
            {regenLoading ? "…" : "Inny pomysł"}
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          className="absolute left-[22px] top-0 bottom-0 w-px"
          style={{ background: "var(--border)" }}
        />
        <div className="flex flex-col gap-3">
          {day.activities.map((activity, i) => (
            <ActivityCard key={i} activity={activity} index={i} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ActivityCard({ activity, index }: { activity: DayActivity; index: number }) {
  const bg = ACTIVITY_COLORS[activity.type] ?? ACTIVITY_COLORS.transport;
  const border = ACTIVITY_BORDER[activity.type] ?? ACTIVITY_BORDER.transport;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex gap-3 relative"
    >
      <div className="flex-shrink-0 w-11 text-center relative z-10">
        <span className="text-lg" aria-hidden="true">{activity.emoji}</span>
        <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>
          {activity.time}
        </p>
      </div>

      <div
        className="flex-1 rounded-2xl px-4 py-3 mb-1"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold leading-tight">{activity.title}</p>
            <span
              className="inline-block text-xs mt-0.5 px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}
            >
              {ACTIVITY_LABELS[activity.type] ?? activity.type}
            </span>
          </div>
          <span
            className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              background:
                activity.cost === "Free" || activity.cost === "Bezpłatnie"
                  ? "rgba(34,197,94,0.12)"
                  : "#F0F0F0",
              color:
                activity.cost === "Free" || activity.cost === "Bezpłatnie"
                  ? "#16A34A"
                  : "var(--text-muted)",
            }}
          >
            {activity.cost}
          </span>
        </div>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {activity.description}
        </p>
        {activity.location && (
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              <span aria-hidden="true">📍 </span>{activity.location}
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-semibold ml-2 flex-shrink-0 transition-opacity hover:opacity-70 no-print"
              style={{ color: "#1A73E8", textDecoration: "none" }}
            >
              Nawiguj →
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
