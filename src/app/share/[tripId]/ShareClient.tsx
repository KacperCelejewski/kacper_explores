"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { TripPlan, DayPlan, DayActivity, DestinationRecommendation } from "@/types";
import Link from "next/link";

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

function buildMapsRouteUrl(activities: DayActivity[], city: string): string | null {
  const locations = activities
    .filter((a) => a.location && a.type !== "tip" && a.type !== "transport")
    .map((a) => encodeURIComponent(`${a.location}, ${city}`));
  if (locations.length < 1) return null;
  if (locations.length === 1) return `https://www.google.com/maps/search/?api=1&query=${locations[0]}`;
  return `https://www.google.com/maps/dir/${locations.join("/")}`;
}

interface SharedTrip {
  id: string;
  city: string;
  country: string;
  plan: TripPlan;
  destination: DestinationRecommendation | null;
}

export default function ShareClient() {
  const params = useParams<{ tripId: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notPublic, setNotPublic] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${params.tripId}`)
      .then((r) => {
        if (r.status === 404) { setNotPublic(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setTrip(data);
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [params.tripId, router]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="text-3xl">✈️</motion.div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ładowanie planu…</p>
      </div>
    );
  }

  if (notPublic) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-5 text-center gap-4">
        <span className="text-4xl">🔒</span>
        <h1 className="text-xl font-bold">Plan prywatny</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Właściciel nie udostępnił tego planu publicznie.<br />
          Poproś go o włączenie opcji &ldquo;Udostępnij w galerii&rdquo;.
        </p>
        <Link
          href="/"
          className="btn-primary"
          style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "0.875rem", marginTop: "0.5rem" }}
        >
          Wygeneruj własny plan →
        </Link>
      </div>
    );
  }

  if (!trip) return null;

  const { plan, destination } = trip;

  return (
    <div className="flex flex-col flex-1 pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        {/* Share banner */}
        <div
          className="mb-5 px-4 py-3 rounded-2xl flex items-center justify-between gap-3"
          style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.2)" }}
        >
          <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--accent)" }}>
            Plan wygenerowany przez <strong>Włóczykij</strong> · AI podróże budżetowe
          </p>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{
              background: copied ? "#DCFCE7" : "var(--accent)",
              color: copied ? "#16A34A" : "white",
            }}
          >
            {copied ? "Skopiowano ✓" : "Kopiuj link"}
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{destination?.coverImage ?? "🗺️"}</span>
            <div>
              <h1 className="text-xl font-bold">
                {plan.city} {destination?.countryFlag ?? ""}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                {plan.duration} dni · {plan.country}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: "var(--border)" }}>
            {[
              { label: "Loty", value: plan.budgetBreakdown.flights, emoji: "✈️" },
              { label: "Nocleg", value: plan.budgetBreakdown.accommodation, emoji: "🛏️" },
              { label: "Jedzenie", value: plan.budgetBreakdown.food, emoji: "🍽️" },
              { label: "Atrakcje", value: plan.budgetBreakdown.attractions, emoji: "🎟️" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-base">{item.emoji}</span>
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Szacowany całkowity koszt</span>
            <span className="text-base font-bold" style={{ color: "var(--accent)" }}>{plan.totalBudgetEstimate}</span>
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

      {plan.days[activeDay] && <SharedDayPlanView day={plan.days[activeDay]} city={plan.city} />}

      {/* CTA */}
      <div className="px-5 mt-8">
        <div
          className="p-5 rounded-2xl text-center"
          style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.2)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            Wygeneruj swój plan z AI →
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
            Odpowiedz na 6 pytań — znajdziemy najtańszy lot i ułożymy plan dla Ciebie
          </p>
          <Link
            href="/"
            className="btn-primary"
            style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "0.875rem" }}
          >
            Zacznij za darmo →
          </Link>
        </div>
      </div>
    </div>
  );
}

function SharedDayPlanView({ day, city }: { day: DayPlan; city: string }) {
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
        <div className="absolute left-[22px] top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />
        <div className="flex flex-col gap-3">
          {day.activities.map((activity, i) => (
            <SharedActivityCard key={i} activity={activity} index={i} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function SharedActivityCard({ activity, index }: { activity: DayActivity; index: number }) {
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
        <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>{activity.time}</p>
      </div>

      <div className="flex-1 rounded-2xl px-4 py-3 mb-1" style={{ background: bg, border: `1px solid ${border}` }}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{activity.title}</p>
          <span
            className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              background: activity.cost === "Free" || activity.cost === "Bezpłatnie" ? "rgba(34,197,94,0.12)" : "#F0F0F0",
              color: activity.cost === "Free" || activity.cost === "Bezpłatnie" ? "#16A34A" : "var(--text-muted)",
            }}
          >
            {activity.cost}
          </span>
        </div>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{activity.description}</p>
        {activity.location && (
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>📍 {activity.location}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`}
              target="_blank"
              rel="noopener noreferrer"
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
