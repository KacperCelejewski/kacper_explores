"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { DayPlan, DayActivity } from "@/types";

const ACTIVITY_COLORS: Record<string, string> = {
  attraction: "rgba(245,158,11,0.15)",
  food: "rgba(249,115,22,0.15)",
  transport: "rgba(255,255,255,0.05)",
  tip: "rgba(124,58,237,0.15)",
  accommodation: "rgba(59,130,246,0.15)",
};

const ACTIVITY_BORDER: Record<string, string> = {
  attraction: "rgba(245,158,11,0.35)",
  food: "rgba(249,115,22,0.35)",
  transport: "rgba(255,255,255,0.1)",
  tip: "rgba(124,58,237,0.35)",
  accommodation: "rgba(59,130,246,0.35)",
};

export default function PlanPage() {
  const router = useRouter();
  const { currentTrip, resetQuiz } = useAppStore();
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    if (!currentTrip?.plan) {
      router.replace("/");
    }
  }, [currentTrip, router]);

  if (!currentTrip?.plan) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <p style={{ color: "var(--text-muted)" }}>Ładowanie planu…</p>
      </div>
    );
  }

  const { plan, destination } = currentTrip;

  return (
    <div className="flex flex-col flex-1 pb-8">
      {/* Hero header */}
      <div className="px-5 pt-6 pb-4">
        <button
          onClick={() => router.push("/flights")}
          className="text-sm mb-4 block transition-opacity hover:opacity-70"
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
            <span className="text-4xl">{destination.coverImage}</span>
            <div>
              <h1 className="text-xl font-bold">
                {plan.city} {destination.countryFlag}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                {plan.duration} dni · {plan.country}
              </p>
            </div>
          </div>

          {/* Budget breakdown */}
          <div
            className="mt-4 pt-4 border-t grid grid-cols-2 gap-3"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <BudgetItem label="Loty" value={plan.budgetBreakdown.flights} emoji="✈️" />
            <BudgetItem label="Nocleg" value={plan.budgetBreakdown.accommodation} emoji="🛏️" />
            <BudgetItem label="Jedzenie" value={plan.budgetBreakdown.food} emoji="🍽️" />
            <BudgetItem label="Atrakcje" value={plan.budgetBreakdown.attractions} emoji="🎟️" />
          </div>

          <div
            className="mt-3 pt-3 border-t flex items-center justify-between"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Szacowany całkowity koszt
            </span>
            <span className="text-base font-bold gradient-text">
              {plan.totalBudgetEstimate}
            </span>
          </div>
        </motion.div>
      </div>

      {/* General tips */}
      {plan.generalTips?.length > 0 && (
        <div className="px-5 mb-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
            💡 WSKAZÓWKI BUDŻETOWE
          </h2>
          <div className="flex flex-col gap-2">
            {plan.generalTips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="glass-card px-4 py-3 flex items-start gap-2"
              >
                <span className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>✦</span>
                <p className="text-xs leading-relaxed">{tip}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Day tabs */}
      <div className="px-5 mb-4">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
          📅 PLAN DZIENNY
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {plan.days.map((day, i) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(i)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background:
                  activeDay === i
                    ? "linear-gradient(135deg, #f59e0b, #f97316)"
                    : "rgba(255,255,255,0.07)",
                color: activeDay === i ? "white" : "var(--text-muted)",
              }}
            >
              Dzień {day.day}
            </button>
          ))}
        </div>
      </div>

      {/* Active day plan */}
      {plan.days[activeDay] && (
        <DayPlanView day={plan.days[activeDay]} />
      )}

      {/* New trip CTA */}
      <div className="px-5 mt-6">
        <button
          className="btn-primary"
          onClick={() => {
            resetQuiz();
            router.push("/");
          }}
        >
          🌍 Zaplanuj nową podróż
        </button>
      </div>
    </div>
  );
}

function BudgetItem({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{emoji}</span>
      <div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function DayPlanView({ day }: { day: DayPlan }) {
  return (
    <motion.div
      key={day.day}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-5"
    >
      <div className="glass-card px-4 py-3 mb-4">
        <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          {day.date}
        </p>
        <p className="text-sm font-medium mt-0.5">{day.theme}</p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div
          className="absolute left-[22px] top-0 bottom-0 w-px"
          style={{ background: "rgba(255,255,255,0.08)" }}
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
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex gap-3 relative"
    >
      {/* Time bubble */}
      <div className="flex-shrink-0 w-11 text-center relative z-10">
        <span
          className="text-lg"
          style={{
            filter: "drop-shadow(0 0 6px rgba(245,158,11,0.4))",
          }}
        >
          {activity.emoji}
        </span>
        <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>
          {activity.time}
        </p>
      </div>

      {/* Content */}
      <div
        className="flex-1 rounded-2xl px-4 py-3 mb-1"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{activity.title}</p>
          <span
            className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: activity.cost === "Free" || activity.cost === "Bezpłatnie"
                ? "#4ade80"
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
          <p className="text-xs mt-1.5" style={{ color: "rgba(167,139,250,0.8)" }}>
            📍 {activity.location}
          </p>
        )}
      </div>
    </motion.div>
  );
}
