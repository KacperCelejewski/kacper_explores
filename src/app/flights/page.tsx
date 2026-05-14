"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { DestinationRecommendation } from "@/types";

interface UserStatus {
  authenticated: boolean;
  can_generate?: boolean;
  credits_remaining?: number;
  is_pro?: boolean;
}

const TAG_LABELS: Record<string, string> = {
  history: "historia",
  food: "jedzenie",
  architecture: "architektura",
  beach: "plaża",
  nightlife: "nocne życie",
  nature: "natura",
};

const SHORT_MONTHS = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
}

export default function FlightsPage() {
  const router = useRouter();
  const { quizAnswers, selectDestination, setCurrentTrip, setIsGeneratingPlan, isGeneratingPlan } =
    useAppStore();

  const [recommendations, setRecommendations] = useState<DestinationRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
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
      setRecommendations(flightsData.recommendations ?? []);
      setUserStatus(profileData);
    }).finally(() => setLoading(false));
  }, [quizAnswers, router]);

  const handleSelect = async (dest: DestinationRecommendation) => {
    if (!userStatus?.authenticated) {
      router.push(`/login?next=/flights`);
      return;
    }
    if (!userStatus?.can_generate) {
      router.push("/pricing");
      return;
    }

    const id = dest.city;
    setSelectedId(id);
    setGenerateError(null);
    selectDestination(dest);
    setIsGeneratingPlan(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: dest, quizAnswers }),
      });
      const data = await res.json();

      if (data.plan) {
        setCurrentTrip({
          id: data.tripId,
          destination: dest,
          quizAnswers,
          plan: data.plan,
          createdAt: new Date().toISOString(),
        });
        router.push(`/plan/${data.tripId}`);
      } else {
        throw new Error(data.error ?? "Nieznany błąd");
      }
    } catch {
      setIsGeneratingPlan(false);
      setSelectedId(null);
      setGenerateError("Nie udało się wygenerować planu. Spróbuj ponownie.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4 px-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-4xl"
        >
          ✈️
        </motion.div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Szukamy najlepszych lotów…
        </p>
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
              onClick={() => router.push("/pricing")}
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
                : `${userStatus.credits_remaining} ${userStatus.credits_remaining === 1 ? "plan" : "plany"}`}
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
        <h1 className="text-2xl font-bold">Twoje rekomendacje</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Wybierz kierunek i wygeneruj plan z AI
        </p>
      </div>

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

      {recommendations.length === 0 && (
        <div className="flex flex-col flex-1 items-center justify-center gap-3 text-center py-12">
          <span className="text-4xl">🔍</span>
          <p className="text-sm font-medium">Brak rekomendacji</p>
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
        {recommendations.map((dest, i) => (
          <DestinationCard
            key={dest.city}
            dest={dest}
            index={i}
            isLoading={isGeneratingPlan && selectedId === dest.city}
            isDisabled={isGeneratingPlan && selectedId !== dest.city}
            onSelect={() => handleSelect(dest)}
          />
        ))}
      </div>

      {isGeneratingPlan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-5 p-4 rounded-2xl text-center"
          style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.2)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            AI generuje Twój plan podróży…
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Może potrwać kilkanaście sekund
          </p>
        </motion.div>
      )}
    </div>
  );
}

function DestinationCard({
  dest, index, isLoading, isDisabled, onSelect,
}: {
  dest: DestinationRecommendation;
  index: number;
  isLoading: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}) {
  const best = dest.bestOffer;
  const hasBerSavings =
    dest.flightBer &&
    dest.flightBer.savingsVsWro !== null &&
    dest.flightBer.savingsVsWro > 150;

  const buyLabel =
    best.airline === "Ryanair" ? "Ryanair ↗"
    : best.airline === "Wizz Air" ? "Wizz Air ↗"
    : best.airline === "easyJet" ? "easyJet ↗"
    : "Skyscanner ↗";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="glass-card overflow-hidden"
      style={{ opacity: isDisabled ? 0.4 : 1, transition: "opacity 0.2s" }}
    >
      {/* Top */}
      <div
        className="px-4 pt-4 pb-3"
        style={{ background: index === 0 ? "var(--accent-light)" : "transparent" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{dest.coverImage}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base leading-tight">{dest.city}</h3>
                <span className="text-sm">{dest.countryFlag}</span>
                {index === 0 && (
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
              {best.realCost} PLN
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>tam i z powrotem</p>
          </div>
        </div>

        {/* Description */}
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

        {/* Tags */}
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
          {hasBerSavings && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
            >
              −{dest.flightBer!.savingsVsWro} PLN z Berlina
            </span>
          )}
        </div>
      </div>

      {/* Flight row */}
      <div
        className="px-4 py-2.5 flex items-center justify-between border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <span>{best.origin.code}</span>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <span>{best.destination.code}</span>
            {best.departureDate && best.returnDate && (
              <span className="text-xs font-normal" style={{ color: "var(--accent)" }}>
                · {formatShortDate(best.departureDate)}–{formatShortDate(best.returnDate)}
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {best.departureTime}–{best.arrivalTime} · {best.airline}
          </p>
        </div>

        {best.affiliateUrl && (
          <a
            href={best.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-70 whitespace-nowrap"
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
