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
    // Fetch flights + user profile in parallel
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
    // Gate: wymaga logowania
    if (!userStatus?.authenticated) {
      router.push(`/login?next=/flights`);
      return;
    }
    // Gate: wymaga kredytów
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
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.push("/quiz")}
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            ← Zmień odpowiedzi
          </button>
          {/* Credits badge */}
          {userStatus?.authenticated ? (
            <button
              onClick={() => router.push("/pricing")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{
                background: userStatus.is_pro
                  ? "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.2))"
                  : userStatus.credits_remaining === 0
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(74,222,128,0.15)",
                color: userStatus.is_pro
                  ? "#f59e0b"
                  : userStatus.credits_remaining === 0
                  ? "#f87171"
                  : "#4ade80",
              }}
            >
              {userStatus.is_pro
                ? "✨ Pro"
                : `${userStatus.credits_remaining} plan${userStatus.credits_remaining === 1 ? "" : "y"}`}
            </button>
          ) : (
            <button
              onClick={() => router.push("/login?next=/flights")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}
            >
              Zaloguj się
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold">Twoje rekomendacje</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Wybierz kierunek — AI wygeneruje kompletny plan
        </p>
      </div>

      {generateError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mt-4 p-4 text-center"
          style={{ border: "1px solid rgba(239,68,68,0.3)" }}
        >
          <p className="text-sm text-red-400">{generateError}</p>
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
            style={{ color: "#f59e0b" }}
          >
            ← Wróć do quizu
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="mt-4 flex flex-col gap-4">
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
          className="glass-card mt-6 p-4 text-center"
        >
          <p className="text-sm font-medium">
            🤖 Gemini generuje Twój plan podróży…
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
  dest,
  index,
  isLoading,
  isDisabled,
  onSelect,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass-card overflow-hidden"
      style={{ opacity: isDisabled ? 0.5 : 1 }}
    >
      {/* Top strip */}
      <div
        className="px-5 py-4"
        style={{
          background:
            index === 0
              ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))"
              : "transparent",
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{dest.coverImage}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">{dest.city}</h3>
                <span>{dest.countryFlag}</span>
                {index === 0 && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
                  >
                    #1
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {dest.country}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold" style={{ color: "#f59e0b" }}>
              {best.realCost} PLN
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              lot w obie strony
            </p>
          </div>
        </div>

        <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {dest.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {dest.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-muted)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Flight info */}
      <div
        className="px-5 py-3 border-t flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
            {best.origin.code} → {best.destination.code}
          </span>
          {"  "}·{"  "}
          {best.departureTime} – {best.arrivalTime}{"  "}·{"  "}
          {best.airline}
        </div>
        {hasBerSavings && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}
          >
            −{dest.flightBer!.savingsVsWro} PLN vs WRO
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-4 pt-3">
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
            <>Wybierz i wygeneruj plan</>
          )}
        </button>
      </div>
    </motion.div>
  );
}
