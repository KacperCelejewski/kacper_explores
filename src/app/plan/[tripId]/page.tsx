"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { DayPlan, DayActivity } from "@/types";

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

export default function PlanPage() {
  const router = useRouter();
  const { currentTrip, resetQuiz } = useAppStore();
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    if (!currentTrip?.plan) router.replace("/");
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
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {plan.days.map((day, i) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(i)}
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
      {plan.days[activeDay] && <DayPlanView day={plan.days[activeDay]} />}

      {/* New trip CTA */}
      <div className="px-5 mt-6">
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="px-5"
    >
      <div
        className="px-4 py-3 mb-4 rounded-2xl"
        style={{ background: "#F7F7F5", border: "1px solid var(--border)" }}
      >
        <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{day.date}</p>
        <p className="text-sm font-medium mt-0.5">{day.theme}</p>
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
        <span className="text-lg">{activity.emoji}</span>
        <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>
          {activity.time}
        </p>
      </div>

      <div
        className="flex-1 rounded-2xl px-4 py-3 mb-1"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{activity.title}</p>
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
          <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--accent)" }}>
            📍 {activity.location}
          </p>
        )}
      </div>
    </motion.div>
  );
}
