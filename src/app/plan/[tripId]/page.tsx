"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { DayPlan, DayActivity, TripPlan, DestinationRecommendation } from "@/types";

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

export default function PlanPage() {
  const router = useRouter();
  const params = useParams<{ tripId: string }>();
  const { currentTrip, setCurrentTrip, resetQuiz } = useAppStore();
  const [activeDay, setActiveDay] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShare = () => {
    if (!currentTrip?.id) return;
    const url = `${window.location.origin}/share/${currentTrip.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => window.print();

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
          className="text-sm mb-5 block transition-opacity hover:opacity-60"
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

      {/* Day tabs */}
      <div className="px-5 mb-4">
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

      {/* Active day */}
      {plan.days[activeDay] && (
        <div
          role="tabpanel"
          id={`tabpanel-day-${activeDay}`}
          aria-labelledby={`tab-day-${activeDay}`}
        >
          <DayPlanView day={plan.days[activeDay]} city={plan.city} />
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

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: copied ? "#DCFCE7" : "#F0F0F0",
              color: copied ? "#16A34A" : "var(--text-secondary)",
            }}
          >
            {copied ? "✓ Skopiowano!" : "🔗 Udostępnij"}
          </button>
          <button
            onClick={handlePrint}
            className="py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
            style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
          >
            📄 Pobierz PDF
          </button>
        </div>

        <button
          className="btn-primary"
          onClick={() => { resetQuiz(); router.push("/"); }}
        >
          Zaplanuj nową podróż →
        </button>
      </div>
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

function DayPlanView({ day, city }: { day: DayPlan; city: string }) {
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
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
            style={{ background: "#E8F4FD", color: "#1A73E8", textDecoration: "none" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Trasa dnia
          </a>
        )}
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
              className="text-xs font-semibold ml-2 flex-shrink-0 transition-opacity hover:opacity-70"
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
